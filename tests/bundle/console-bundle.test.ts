import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import vue from "@vitejs/plugin-vue";
import { build } from "vite";

import { consoleBundle } from "../../bundle/console-bundle.js";
import { CONSOLE_SHARED_LIBRARIES, LAYER_VERSION } from "../../shared/console-manifest";

import type { Rollup } from "vite";

// The bundle build (`docs/boundary.md`, "The bundle build"): real builds of a bundle's sources written
// to a scratch folder, one whose screens keep to their words and one whose screens do not.

const NAME = "demo";

const folder = mkdtempSync(join(tmpdir(), "console-bundle-"));

afterAll(() => rmSync(folder, { recursive: true, force: true }));

/** Writes a bundle's sources into a folder of their own and builds them with the plugin. */
async function built(bundle: string, files: Record<string, string>, words: Record<string, Record<string, unknown>>): Promise<Rollup.RollupOutput[]> {
  const root = join(folder, bundle);

  for (const [path, text] of Object.entries(files)) {
    const file = join(root, path);

    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
  }

  return (await build({
    configFile: false,
    root,
    logLevel: "silent",
    plugins: [vue(), consoleBundle({ name: NAME, words })],
    build: { write: false, lib: { entry: join(root, "routes.ts"), formats: ["es"], fileName: () => "bundle.js" }, rollupOptions: { external: ["unrelated"] } }
  })) as Rollup.RollupOutput[];
}

const imported = CONSOLE_SHARED_LIBRARIES.map((name, at) => `import * as library${at} from "${name}/part";`);

const keeping = await built(
  "keeping",
  {
    "routes.ts": `${imported.join("\n")}\nimport Screen from "./Screen.vue";\nexport default [Screen, ${CONSOLE_SHARED_LIBRARIES.map((_, at) => `library${at}`).join(", ")}];\n`,
    "Screen.vue": [
      `<script setup lang="ts">`,
      `import { useI18n } from "vue-i18n";`,
      `import { STATES } from "./states";`,
      `const { t } = useI18n();`,
      `const saved = t(\`demo.status.saved\`);`,
      `</script>`,
      `<template>`,
      `  <h1>{{ $t("demo.title.screen") }}</h1>`,
      `  <button :aria-label="$t('common.action.close')">{{ saved }} {{ STATES.open }}</button>`,
      `  <p title="Not a key. A sentence with dots.">carried</p>`,
      `</template>`
    ].join("\n"),
    "states.ts": `export const STATES = { open: "demo.board.state.open", file: "notes.txt" } as const;\n`
  },
  {
    en: { demo: { title: { screen: "Screen" }, status: { saved: "Saved" }, board: { state: { open: "Open" } } } },
    fr: { demo: { title: { screen: "Ecran" }, status: { saved: "Enregistre" }, board: { state: { open: "Ouvert" } } } }
  }
);

const output = keeping.flatMap((one) => one.output);

describe("a bundle built with the layer's plugin", () => {
  test("leaves every shared library unbundled, by its package's own path, and carries its own modules", () => {
    const module = output.find((one): one is Rollup.OutputChunk => one.type === "chunk" && one.isEntry)!;

    // The component imports the two libraries its compiled code and its script name, as a screen does.
    expect(module.imports.toSorted()).toEqual([...CONSOLE_SHARED_LIBRARIES.map((name) => `${name}/part`), "vue", "vue-i18n"].toSorted());
    expect(module.code).toContain("carried");
  });

  test("writes the layer it was built on beside the module", () => {
    const written = output.find((one): one is Rollup.OutputAsset => one.type === "asset" && one.fileName === "layer.json")!;

    expect(JSON.parse(String(written.source))).toEqual({ layer: LAYER_VERSION });
  });

  test("refuses screens asking for words neither the bundle's words nor the layer answer, and words beside the namespace", async () => {
    const refused = built(
      "breaking",
      {
        "routes.ts": `import Screen from "./Screen.vue";\nexport default [Screen];\n`,
        "Screen.vue": [
          `<script setup lang="ts">`,
          `import { useI18n } from "vue-i18n";`,
          `const { t } = useI18n();`,
          `import { LOST } from "./lost";`,
          `const kept = t("common.label.default");`,
          `</script>`,
          `<template>`,
          `  <h1>{{ $t("demo.title.screen") }} {{ kept }} {{ $t(LOST) }}</h1>`,
          `  <p :title="$t('other.label.thing')">{{ $t("demo.label.missing") }}</p>`,
          `</template>`
        ].join("\n"),
        "lost.ts": `export const LOST = "demo.status.lost";\n`
      },
      { en: { demo: { title: { screen: "Screen" }, label: { missing: "Here" } }, common: {} }, fr: { demo: { title: { screen: "Ecran" } } } }
    );

    const message = await refused.then(
      () => "",
      (error: Error) => error.message
    );

    expect(message).toContain("common.label.default in Screen.vue: not a key the layer reads");
    expect(message).toContain("demo.label.missing in Screen.vue: not answered by the fr words");
    expect(message).toContain("other.label.thing in Screen.vue: a key outside the bundle's namespace and the layer's");
    expect(message).toContain("demo.status.lost in lost.ts: not answered by the en words");
    expect(message).toContain("common: a tree beside the namespace in the en words");
    expect(message).not.toContain("demo.title.screen");
    expect(message).not.toContain("demo.label.missing in Screen.vue: not answered by the en words");
  });
});

describe("the plugin's options", () => {
  test("are refused without a kebab-case name or with words that are not a tree per locale", () => {
    expect(() => consoleBundle({ name: "Not Kebab", words: { en: { demo: {} } } })).toThrow(TypeError);
    expect(() => consoleBundle({ name: NAME, words: { en: [] as unknown as Record<string, unknown> } })).toThrow(TypeError);
  });
});
