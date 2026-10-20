import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { marked } from "marked";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";
import { createChecker } from "vue-component-meta";
import { parse } from "vue/compiler-sfc";

import { DEFAULT_PALETTE, paletteTokens } from "../shared/palettes";
import { DEFAULT_THEME, themeTokens } from "../shared/themes";

import type { Token, Tokens } from "marked";
import type { CatalogueData, CatalogueEntry, CataloguePart, CatalogueProp, CatalogueToken } from "./catalogue";

// The catalogue's data written from the layer's sources (`docs/harness.md`, "The catalogue"): the
// boundary document's tables by a markdown lexer, the components by the Vue language tools' component
// reader, each example by Vue's own SFC parser, and the stylesheets by PostCSS. `bun run catalogue`
// writes the file; a test holds the committed file to what this answers.

const root = new URL("../", import.meta.url);
const path = (relative: string) => fileURLToPath(new URL(relative, root));

export const CATALOGUE_FILE = path("catalogue/catalogue.json");

// An inline run of the lexer as the words it reads as.
function plain(tokens: Token[] | undefined): string {
  return (tokens ?? [])
    .map((one) => ("tokens" in one && one.tokens !== undefined ? plain(one.tokens) : "text" in one ? String(one.text) : ""))
    .join("");
}

// The rows of the table under a heading of the boundary document, each as its cells' words.
function tableRows(title: string): string[][] {
  const tokens = marked.lexer(readFileSync(path("docs/boundary.md"), "utf8"));
  const at = tokens.findIndex((one) => one.type === "heading" && (one as Tokens.Heading).text === title);
  const table = tokens.slice(at + 1).find((one) => one.type === "table" || one.type === "heading");

  if (at < 0 || table?.type !== "table") throw new Error(`The boundary document has no table under ${title}.`);

  return (table as Tokens.Table).rows.map((row) => row.map((cell) => plain(cell.tokens)));
}

// A template's lines with the indent they share taken off.
function dedent(text: string): string {
  const lines = text.replace(/^\n+|\s+$/g, "").split("\n");
  const indent = Math.min(...lines.filter((line) => line.trim() !== "").map((line) => line.length - line.trimStart().length));

  return lines.map((line) => line.slice(indent)).join("\n");
}

// A component's example file is named for it with a suffix, since a component file reaches itself by
// its own name: under the component's bare name, the example's template would use itself.
const EXAMPLE_SUFFIX = "Example.vue";

function example(name: string): string {
  const { descriptor } = parse(readFileSync(path(`catalogue/examples/${name}${EXAMPLE_SUFFIX}`), "utf8"), { filename: `${name}${EXAMPLE_SUFFIX}` });

  if (descriptor.template === null) throw new Error(`The example of ${name} has no template.`);

  return dedent(descriptor.template.content);
}

function componentEntries(): CatalogueEntry[] {
  const checker = createChecker(path(".nuxt/tsconfig.app.json"), { schema: false, forceUseTs: true, printer: { newLine: 1 } });
  const lines = new Map(tableRows("Components").map(([name, line]) => [name!, line!]));

  return [...lines].map(([name, line]) => {
    const meta = checker.getComponentMeta(path(`app/components/${name}.vue`));
    const props: CatalogueProp[] = meta.props
      .filter((one) => !one.global)
      .map((one) => ({
        name: one.name,
        type: one.type,
        required: one.required,
        ...(one.default === undefined ? {} : { default: one.default }),
        ...(one.description === "" ? {} : { description: one.description })
      }));
    const slots: CataloguePart[] = meta.slots.map((one) => ({ name: one.name, type: one.type }));
    const events: CataloguePart[] = meta.events.map((one) => ({ name: one.name, type: one.type }));

    return { name, kind: "component", line, props, slots, events, example: example(name) };
  });
}

function pluginEntries(): CatalogueEntry[] {
  return tableRows("Page plugins").map(([name, line]) => ({ name: name!, kind: "page-plugin", line: line! }));
}

// A token's group: the first word of its name past the namespace it stands in.
function groupOf(name: string): string {
  return name.replace(/^--/, "").replace(/^(ui|bmo)-/, "").split("-")[0]!;
}

// Which modes a rule states its properties for, where it stands on the root or a mode's class alone.
function modesOf(selector: string): ("light" | "dark")[] | null {
  const selectors: string[] = [];

  selectorParser((list) => list.each((one) => void selectors.push(one.toString().trim()))).processSync(selector);

  if (!selectors.every((one) => [":root", ":host", ".light", ".dark"].includes(one))) return null;

  const modes = new Set<"light" | "dark">();

  for (const one of selectors) {
    if (one !== ".dark") modes.add("light");
    if (one !== ".light") modes.add("dark");
  }

  return [...modes];
}

// The custom properties a stylesheet states on the root and on the modes' classes, in its order, each
// over the one it follows; Tailwind's theme block states its own for both modes.
function stated(css: string, source: CatalogueToken["source"], into: Record<string, CatalogueToken>): void {
  const set = (name: string, raw: string, modes: ("light" | "dark")[]) => {
    const value = raw.replace(/\s+/g, " ").trim();
    const was = into[name];
    const token: CatalogueToken = { group: groupOf(name), light: was?.light ?? value, dark: was?.dark ?? value, source };

    for (const mode of modes) token[mode] = value;

    into[name] = token;
  };

  postcss.parse(css).walk((node) => {
    if (node.type !== "decl" || !node.prop.startsWith("--")) return;

    const parent = node.parent;

    if (parent?.type === "atrule" && (parent as postcss.AtRule).name === "theme") set(node.prop, node.value, ["light", "dark"]);

    if (parent?.type !== "rule") return;

    const above = parent.parent;

    if (above?.type === "atrule" && (above as postcss.AtRule).name !== "layer") return;

    const modes = modesOf((parent as postcss.Rule).selector);

    if (modes !== null) set(node.prop, node.value, modes);
  });
}

function tokenEntries(): Record<string, CatalogueToken> {
  const found: Record<string, CatalogueToken> = {};
  const library = dirname(createRequire(path("package.json")).resolve("@nuxt/ui/package.json"));

  stated(readFileSync(join(library, "dist/runtime/index.css"), "utf8"), "library", found);
  stated(readFileSync(path("app/assets/css/main.css"), "utf8"), "layer", found);

  for (const [name, value] of Object.entries({ ...themeTokens(DEFAULT_THEME), ...paletteTokens(DEFAULT_PALETTE) })) {
    found[name] = { group: groupOf(name), light: value, dark: value, source: "layer" };
  }

  return Object.fromEntries(Object.entries(found).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
}

export function catalogueData(): CatalogueData {
  const entries = [...componentEntries(), ...pluginEntries()];

  return { entries, tokens: tokenEntries() };
}

// The data as the file holds it.
export function catalogueText(): string {
  return `${JSON.stringify(catalogueData(), null, 2)}\n`;
}

// Every component's example, by the component's name.
export function exampleNames(): string[] {
  return readdirSync(path("catalogue/examples"))
    .filter((one) => one.endsWith(EXAMPLE_SUFFIX))
    .map((one) => one.slice(0, -EXAMPLE_SUFFIX.length))
    .sort();
}

if (import.meta.main) writeFileSync(CATALOGUE_FILE, catalogueText());
