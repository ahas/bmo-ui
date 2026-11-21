import { describe, expect, test } from "bun:test";
import { babelParse, parse } from "vue/compiler-sfc";

import { ATTRIBUTE, DIRECTIVE, ELEMENT, sources, stylesheet } from "./sources";

import type { AtRule, Declaration, Rule } from "postcss";

// The work-in-progress mark turns only where the screen drawing it spins it (`docs/design.md`,
// "Motion"; `docs/boundary.md`, "Classes and keyframes"). The stylesheet turns none of its own accord,
// so a mark the code names without its spin stands still while its work runs.

const MARK = "progress-activity";
const SPIN = "animate-spin";
// A look that hands the mark out with a flag saying it turns, for the component drawing it to spin.
const SPIN_FLAGS = new Set(["spin", "spins"]);
// The library's own loading icon, named by the app configuration, which the library spins itself
// wherever it draws it.
const LIBRARY_SPUN = "loading";

interface TemplateProp {
  type: number;
  name: string;
  arg?: { content?: string };
  loc: { source: string; start: { line: number } };
}

interface TemplateNode {
  type: number;
  props?: TemplateProp[];
  children?: TemplateNode[];
  loc: { start: { line: number } };
}

interface ScriptNode {
  type: string;
  loc?: { start: { line: number } } | null;
  [key: string]: unknown;
}

function propNamed(prop: TemplateProp, name: string): boolean {
  return (prop.type === ATTRIBUTE && prop.name === name) || (prop.type === DIRECTIVE && prop.name === "bind" && prop.arg?.content === name);
}

// Every element of a template, each with the props written on it.
function elements(node: TemplateNode): TemplateNode[] {
  const own = node.type === ELEMENT ? [node] : [];

  return [...own, ...(node.children ?? []).flatMap(elements)];
}

// An element naming the mark carries its spin, or the library's loading state that spins it.
function stillInTemplate(root: TemplateNode, line: number): number[] {
  return elements(root)
    .filter((element) => (element.props ?? []).some((prop) => prop.loc.source.includes(MARK)))
    .filter((element) => !(element.props ?? []).some((prop) => prop.loc.source.includes(SPIN) || propNamed(prop, LIBRARY_SPUN)))
    .map((element) => element.loc.start.line + line - 1);
}

function isNode(value: unknown): value is ScriptNode {
  return value !== null && typeof value === "object" && typeof (value as { type?: unknown }).type === "string";
}

function childrenOf(node: ScriptNode): ScriptNode[] {
  return Object.entries(node)
    .filter(([key]) => !key.endsWith("Comments"))
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
    .filter(isNode);
}

function textOf(node: ScriptNode): string | null {
  if (node.type === "StringLiteral") return node.value as string;
  if (node.type === "TemplateElement") return (node.value as { cooked: string | null }).cooked;

  return null;
}

function keyName(property: ScriptNode): string | null {
  const key = property.key as ScriptNode | undefined;

  if (key?.type === "Identifier") return key.name as string;
  if (key?.type === "StringLiteral") return key.value as string;

  return null;
}

function holdsSpin(node: ScriptNode): boolean {
  return textOf(node)?.includes(SPIN) === true || childrenOf(node).some(holdsSpin);
}

// The object a mark stands in says it turns: by a spin flag set true, or by a spin class among its
// values.
function objectSpins(object: ScriptNode): boolean {
  return (object.properties as ScriptNode[]).some((property) => {
    const value = property.value as ScriptNode | undefined;
    const flagged = SPIN_FLAGS.has(keyName(property) ?? "") && value?.type === "BooleanLiteral" && value.value === true;

    return flagged || (value !== undefined && holdsSpin(value));
  });
}

// A mark a script names is handed out as the library's loading icon, or stands in an object that says
// it turns; a component whose own template spins it may name it bare. Each mark found otherwise is
// answered by its line.
function stillInScript(code: string, line: number, templateSpins: boolean): number[] {
  const still: number[] = [];

  function walk(node: ScriptNode, ancestors: ScriptNode[]): void {
    if (textOf(node)?.includes(MARK) === true) {
      const parent = ancestors.at(-1);
      const object = ancestors.findLast((one) => one.type === "ObjectExpression");
      const spun = (parent?.type === "ObjectProperty" && keyName(parent) === LIBRARY_SPUN) || (object !== undefined && objectSpins(object)) || templateSpins;

      if (!spun) still.push((node.loc?.start.line ?? 1) + line - 1);
    }

    for (const child of childrenOf(node)) walk(child, [...ancestors, node]);
  }

  walk(babelParse(code, { sourceType: "module", plugins: ["typescript"] }).program as unknown as ScriptNode, []);

  return still;
}

function stillMarks(path: string, text: string): string[] {
  if (!path.endsWith(".vue")) return stillInScript(text, 1, false).map((line) => `${path}:${line}`);

  const { descriptor } = parse(text, { filename: path });
  const template = descriptor.template?.ast as TemplateNode | undefined;
  const templateSpins = template !== undefined && elements(template).some((element) => (element.props ?? []).some((prop) => prop.loc.source.includes(SPIN)));
  const lines = template === undefined ? [] : stillInTemplate(template, 1);

  for (const script of [descriptor.script, descriptor.scriptSetup]) {
    if (script !== null) lines.push(...stillInScript(script.content, script.loc.start.line, templateSpins));
  }

  return lines.map((line) => `${path}:${line}`);
}

function turning(rule: Rule): boolean {
  return (rule.nodes ?? []).some((node) => node.type === "decl" && (node as Declaration).prop.startsWith("animation") && (node as Declaration).value !== "none");
}

function insideReducedMotion(rule: Rule): boolean {
  const parent = rule.parent as AtRule | undefined;

  return parent?.type === "atrule" && parent.name === "media" && parent.params.includes("prefers-reduced-motion: reduce");
}

describe("the work-in-progress mark", () => {
  test("is turned by no rule of the stylesheet", () => {
    const turners: string[] = [];

    stylesheet.walkRules((rule) => {
      if (rule.selector.includes(MARK) && turning(rule)) turners.push(rule.selector);
    });

    expect(turners).toEqual([]);
  });

  test("stands still where less movement was asked for", () => {
    const stops: string[] = [];

    stylesheet.walkRules((rule) => {
      if (rule.selector.includes(MARK) && insideReducedMotion(rule) && !turning(rule)) stops.push(rule.selector);
    });

    expect(stops).not.toEqual([]);
  });

  test("is spun wherever the layer's code names it", async () => {
    const files = await sources("**/*.vue", "**/*.ts");
    const named = files.filter((file) => file.text.includes(MARK));
    const still = named.flatMap((file) => stillMarks(file.path, file.text));

    expect(named.length).toBeGreaterThan(0);
    expect(still).toEqual([]);
  });

  test("is answered as still where the code names it with no spin", () => {
    const still = [
      ...stillMarks("Still.vue", `<template>\n  <UIcon name="i-material-symbols-${MARK}" class="size-4" />\n</template>\n`),
      ...stillMarks("looks.ts", `export const LOOK = { icon: "i-material-symbols-${MARK}", tone: "text-primary" };\n`)
    ];
    const spun = [
      ...stillMarks("Spun.vue", `<template>\n  <UIcon name="i-material-symbols-${MARK}" class="size-4 ${SPIN}" />\n  <UButton icon="i-material-symbols-${MARK}" loading />\n</template>\n`),
      ...stillMarks("flagged.ts", `export const LOOK = { icon: "i-material-symbols-${MARK}", spins: true };\nexport default { icons: { loading: "i-material-symbols-${MARK}" } };\n`)
    ];

    expect(still).toEqual(["Still.vue:2", "looks.ts:1"]);
    expect(spun).toEqual([]);
  });
});
