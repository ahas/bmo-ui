import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { build } from "vite";

import { consoleTheme } from "../../bundle/console-theme.js";

import type { Rollup } from "vite";

// The theme plugin (`docs/boundary.md`, "The bundle build"): a real build of a bundle whose stylesheet
// references the theme, in a scratch folder that reaches the repository's packages, with a generated
// theme of its own in its build folder that imports and names files beside it by relative addresses.

const REPOSITORY = fileURLToPath(new URL("../../", import.meta.url));
const LAYER_CSS = join(REPOSITORY, "app", "assets", "css");
const LIBRARY_RUNTIME = join(REPOSITORY, "node_modules", "@nuxt", "ui", "dist", "runtime");

const root = mkdtempSync(join(tmpdir(), "console-theme-"));
const generated = join(root, ".nuxt");
const copies = join(generated, "console-theme");

afterAll(() => rmSync(root, { recursive: true, force: true }));

function write(path: string, text: string): void {
  const file = join(root, path);

  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

symlinkSync(join(REPOSITORY, "node_modules"), join(root, "node_modules"));
write("package.json", '{ "name": "demo", "private": true }\n');
write(
  ".nuxt/ui.css",
  [
    '@import "./extra.css";',
    '@source "../app";',
    "@theme { --color-probe: #123456; }",
    '@font-face { font-family: Probe; src: url("./probe.woff2") format("woff2"); }',
    ""
  ].join("\n")
);
write(".nuxt/extra.css", "@theme { --color-extra: #654321; }\n");
write("screen.html", '<p class="text-probe bg-extra text-primary">carried</p>\n');
write("style.css", ['@reference "#console-theme";', '@import "tailwindcss/utilities.css" source(none);', '@source "./screen.html";', ""].join("\n"));
write("entry.ts", 'import "./style.css";\nexport default 1;\n');

const output = (await build({
  configFile: false,
  root,
  logLevel: "silent",
  plugins: [consoleTheme(), tailwindcss()],
  build: { write: false, cssCodeSplit: false, lib: { entry: join(root, "entry.ts"), formats: ["es"], fileName: () => "module.js", cssFileName: "style" } }
})) as Rollup.RollupOutput[];

const stylesheet = output
  .flatMap((one) => one.output)
  .filter((one): one is Rollup.OutputAsset => one.type === "asset" && one.fileName.endsWith(".css"))
  .map((one) => String(one.source))
  .join("\n");

function copy(name: string): string {
  return readFileSync(join(copies, name), "utf8");
}

describe("the theme a bundle's stylesheet references", () => {
  test("is the layer's stylesheet and the library's beneath it, scanning no sources", () => {
    for (const name of ["layer.css", "nuxt-ui.css", "ui.css"]) expect(copy(name), name).not.toContain("@source");

    expect(copy("layer.css")).toContain('@import "tailwindcss" source(none);');
    expect(copy("layer.css")).toContain(`@import ${JSON.stringify(join(copies, "nuxt-ui.css"))};`);
    expect(copy("nuxt-ui.css")).toContain(`@import ${JSON.stringify(join(copies, "ui.css"))};`);
  });

  test("names every other relative address by the file beside the stylesheet it was read from", () => {
    expect(copy("ui.css")).toContain(`@import ${JSON.stringify(join(generated, "extra.css"))};`);
    expect(copy("ui.css")).toContain(`url("${join(generated, "probe.woff2")}")`);
    expect(copy("nuxt-ui.css")).toContain(`@import ${JSON.stringify(join(LIBRARY_RUNTIME, "keyframes.css"))};`);
    expect(copy("layer.css")).toContain(`url(${join(LAYER_CSS, "..", "fonts")}`);
    expect(copy("layer.css")).not.toMatch(/url\(["']?\.\.?\//);
  });

  test("carries the utilities of the bundle's own screens alone, on the theme's tokens", () => {
    expect(stylesheet).toMatch(/\.text-probe\{[^}]*--color-probe/);
    expect(stylesheet).toMatch(/\.bg-extra\{[^}]*--color-extra/);
    expect(stylesheet).toMatch(/\.text-primary\{/);
    expect(stylesheet).not.toContain("@font-face");
    expect(stylesheet).not.toContain("url(");
  });
});

test("refuses a build folder that is not a path", () => {
  expect(() => consoleTheme({ buildDir: 1 as unknown as string })).toThrow(TypeError);
});
