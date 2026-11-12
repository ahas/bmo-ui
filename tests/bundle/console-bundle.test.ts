import { describe, expect, test } from "bun:test";
import { build } from "vite";

import { consoleBundle } from "../../bundle/console-bundle.js";
import { CONSOLE_SHARED_LIBRARIES, LAYER_VERSION } from "../../shared/console-manifest";

import type { Rollup } from "vite";

// The bundle build (`docs/boundary.md`, "The bundle build"): one real build of a module that imports
// each shared library by its package's own path, and one module of its own beside them.

// The build makes the entry it is named a path under its root, so the entry is found by its last
// segment; both modules then stand under ids no file has.
const ENTRY = "virtual-entry";
const OWN = "virtual-own";
const ids: Record<string, string> = { [ENTRY]: "\0entry", [OWN]: "\0own" };

const imported = CONSOLE_SHARED_LIBRARIES.map((name, at) => `import * as library${at} from "${name}/part";`);

const entry = {
  name: "entry",
  resolveId: (source: string) => ids[source.slice(source.lastIndexOf("/") + 1)] ?? null,
  load: (id: string) =>
    id === ids[ENTRY]
      ? `${imported.join("\n")}\nimport own from "${OWN}";\nexport default [own, ${CONSOLE_SHARED_LIBRARIES.map((_, at) => `library${at}`).join(", ")}];`
      : id === ids[OWN]
        ? "export default 'carried';"
        : null
};

const built = (await build({
  configFile: false,
  logLevel: "silent",
  plugins: [consoleBundle(), entry],
  build: { write: false, lib: { entry: ENTRY, formats: ["es"], fileName: () => "bundle.js" }, rollupOptions: { external: ["unrelated"] } }
})) as Rollup.RollupOutput[];

const output = built.flatMap((one) => one.output);

describe("a bundle built with the layer's plugin", () => {
  test("leaves every shared library unbundled, by its package's own path, and carries its own modules", () => {
    const module = output.find((one): one is Rollup.OutputChunk => one.type === "chunk" && one.isEntry)!;

    expect(module.imports.toSorted()).toEqual(CONSOLE_SHARED_LIBRARIES.map((name) => `${name}/part`).toSorted());
    expect(module.code).toContain("carried");
  });

  test("writes the layer it was built on beside the module", () => {
    const written = output.find((one): one is Rollup.OutputAsset => one.type === "asset" && one.fileName === "layer.json")!;

    expect(JSON.parse(String(written.source))).toEqual({ layer: LAYER_VERSION });
  });
});
