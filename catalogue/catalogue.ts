import { readFileSync } from "node:fs";

import { CONSOLE_MANIFEST_ROUTE, CONSOLE_MANIFEST_SCHEMA } from "../shared/console-manifest";
import { filterRecords } from "../shared/search";

import data from "./catalogue.json";

// The catalogue a harness reads while it builds a screen on the layer (`docs/harness.md`). Each of
// the MCP server's tools is a thin call of one function here, and a host may call them as well.

export type CatalogueKind = "component" | "page-plugin";

export interface CatalogueProp {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description?: string;
}

// A slot or an event: its name, and the type of what it hands on.
export interface CataloguePart {
  name: string;
  type: string;
}

export interface CatalogueEntry {
  name: string;
  kind: CatalogueKind;
  line: string;
  props?: CatalogueProp[];
  slots?: CataloguePart[];
  events?: CataloguePart[];
  example?: string;
}

export interface CatalogueToken {
  group: string;
  light: string;
  dark: string;
  // Who states it: the layer, or the component library under it.
  source: "layer" | "library";
}

export interface CatalogueData {
  entries: CatalogueEntry[];
  tokens: Record<string, CatalogueToken>;
}

export interface ComponentDetail {
  name: string;
  line: string;
  props: CatalogueProp[];
  slots: CataloguePart[];
  events: CataloguePart[];
  example: string;
}

// A refusal in the common wire format's shape: a code and the sentence.
export class CatalogueError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

const CATALOGUE = data as CatalogueData;

// The components and page plugins, each by its one line, narrowed by the words given.
export function components(q?: string | null): { items: Pick<CatalogueEntry, "name" | "kind" | "line">[]; more: boolean } {
  const found = filterRecords(
    CATALOGUE.entries,
    (entry) => [
      { label: "name", text: entry.name, shown: true },
      { label: "line", text: entry.line, shown: true }
    ],
    q
  );

  return { items: found.map(({ name, kind, line }) => ({ name, kind, line })), more: false };
}

// One component: its props, slots, events and an example of its use.
export function component(name: string): ComponentDetail {
  const entry = CATALOGUE.entries.find((one) => one.kind === "component" && one.name === name);

  if (entry === undefined) throw new CatalogueError("not-found", `No component of the layer is named ${name}.`);

  return { name: entry.name, line: entry.line, props: entry.props ?? [], slots: entry.slots ?? [], events: entry.events ?? [], example: entry.example ?? "" };
}

// The design tokens, each in the light mode and the dark, all of them or one group's.
export function tokens(group?: string | null): { tokens: Record<string, CatalogueToken> } {
  const all = Object.entries(CATALOGUE.tokens);

  if (group === undefined || group === null || group === "") return { tokens: Object.fromEntries(all) };

  const chosen = all.filter(([, token]) => token.group === group);

  if (chosen.length === 0) {
    const groups = [...new Set(all.map(([, token]) => token.group))].sort();

    throw new CatalogueError("not-found", `No token is in the group ${group}; the groups are ${groups.join(", ")}.`);
  }

  return { tokens: Object.fromEntries(chosen) };
}

// The console plugin contract: the route a service answers its manifest at, the manifest's JSON
// Schema and the contract's document whole.
export function pluginContract(): { contract: { route: string; manifest: Record<string, unknown>; document: string } } {
  const document = readFileSync(new URL("../docs/console-bundles.md", import.meta.url), "utf8");

  return { contract: { route: CONSOLE_MANIFEST_ROUTE, manifest: CONSOLE_MANIFEST_SCHEMA, document } };
}
