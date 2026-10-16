import { Glob } from "bun";
import postcss from "postcss";
import { babelParse, parse } from "vue/compiler-sfc";

// The layer's own files as they ship, read for the rules that hold across all of them. Each kind is
// read by what already reads it: the stylesheet by postcss, a component's template by Vue's own
// compiler, an expression bound in one by the parser that compiler uses, and the two configuration
// files as the objects they evaluate to.

const app = new URL("../../app/", import.meta.url);

export interface Source {
  path: string;
  text: string;
}

// Every file under the layer's app folder matching one of the patterns, by its path inside it.
export async function sources(...patterns: string[]): Promise<Source[]> {
  const found: Source[] = [];

  for (const pattern of patterns) {
    for await (const path of new Glob(pattern).scan({ cwd: app.pathname })) {
      found.push({ path, text: await Bun.file(new URL(path, app)).text() });
    }
  }

  return found.sort((one, two) => one.path.localeCompare(two.path));
}

export async function source(path: string): Promise<string> {
  return Bun.file(new URL(path, app)).text();
}

export const stylesheet = postcss.parse(await source("assets/css/main.css"));

// The two configuration files are evaluated as Nuxt evaluates them, with the function each is
// wrapped in handing its object straight back. They are named through a URL built at run time, so
// the typecheck does not take them in as modules of the tests.
type Configured = (value: unknown) => unknown;

async function evaluated(path: string, wrapper: string): Promise<unknown> {
  (globalThis as unknown as Record<string, Configured>)[wrapper] = (value) => value;

  return ((await import(new URL(path, import.meta.url).href)) as { default: unknown }).default;
}

export type ConfigEntry = Record<string, unknown>;

export const appConfig = (await evaluated("../../app/app.config.ts", "defineAppConfig")) as { ui: Record<string, ConfigEntry> };

export const nuxtConfig = (await evaluated("../../nuxt.config.ts", "defineNuxtConfig")) as {
  app: { head: { meta: { name?: string; content?: string }[] } };
};

// Every class the layer gives one slot of one library component, wherever in that component's entry
// it is said: on the slot itself, on a variant or on a compound one.
export function slotClasses(component: string, slot: string): string[] {
  const found: string[] = [];

  function walk(value: unknown, key: string | null): void {
    if (typeof value === "string") {
      if (key === slot) found.push(...value.split(/\s+/).filter(Boolean));
    } else if (Array.isArray(value)) {
      for (const one of value) walk(one, key);
    } else if (value !== null && typeof value === "object") {
      for (const [name, one] of Object.entries(value)) walk(one, name);
    }
  }

  walk(appConfig.ui[component], null);

  return found;
}

// The node kinds of Vue's template tree that are read here, by the numbers its compiler gives them.
export const ELEMENT = 1;
export const INTERPOLATION = 5;
export const ATTRIBUTE = 6;
export const DIRECTIVE = 7;
const TEMPLATE_TAG = 3;

export interface TemplateNode {
  type: number;
  tag?: string;
  tagType?: number;
  props?: TemplateProp[];
  children?: TemplateNode[];
  content?: { content?: string } | string;
}

export interface TemplateProp {
  type: number;
  name: string;
  value?: { content: string };
  arg?: { content?: string };
  exp?: { content?: string };
}

// A component's template as its compiler reads it; a fragment is read by writing it into one.
export function template(component: string): TemplateNode[] {
  const ast = parse(component).descriptor.template?.ast as TemplateNode | undefined;

  return ast?.children ?? [];
}

// Every node of a template with the elements standing around it, innermost last. Vue's own
// `<template>` is no element and carries nothing onto the page, so it is stepped over.
export function* walkTemplate(nodes: TemplateNode[], around: TemplateNode[] = []): Generator<{ node: TemplateNode; around: TemplateNode[] }> {
  for (const node of nodes) {
    yield { node, around };

    if (node.children !== undefined) {
      const element = node.type === ELEMENT && node.tagType !== TEMPLATE_TAG;

      yield* walkTemplate(node.children, element ? [...around, node] : around);
    }
  }
}

export function elements(nodes: TemplateNode[]): TemplateNode[] {
  return [...walkTemplate(nodes)].map(({ node }) => node).filter((node) => node.type === ELEMENT);
}

// The classes an element writes plainly, with no condition on them.
export function staticClasses(node: TemplateNode): string[] {
  const written = node.props?.find((prop) => prop.type === ATTRIBUTE && prop.name === "class");

  return written?.value?.content.split(/\s+/).filter(Boolean) ?? [];
}

export function attribute(node: TemplateNode, name: string): TemplateProp | undefined {
  return node.props?.find((prop) => (prop.type === ATTRIBUTE ? prop.name === name : prop.name === "bind" && prop.arg?.content === name));
}

// An expression bound in a template, as the parser Vue's compiler uses reads it.
export function expression(text: string): unknown {
  return babelParse(`(${text})`, { plugins: ["typescript"] }).program.body[0];
}

// Every node of an expression's tree, found by walking it.
export function* expressionNodes(tree: unknown): Generator<Record<string, unknown>> {
  if (Array.isArray(tree)) {
    for (const one of tree) yield* expressionNodes(one);
  } else if (tree !== null && typeof tree === "object" && "type" in tree) {
    yield tree as Record<string, unknown>;

    for (const [key, one] of Object.entries(tree)) {
      if (key !== "loc" && key !== "start" && key !== "end") yield* expressionNodes(one);
    }
  }
}
