import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright-core";
import postcss from "postcss";
import tailwind from "tailwindcss/colors";

import { THEMES, themeDeclarations } from "#shared/themes";
import { measureSource } from "./measure-source";
import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Theme } from "#shared/themes";
import type { Browser, Page } from "playwright-core";

// What the measuring module calls itself once it is loaded into the page.
type Measured = { measure: typeof import("./measure") };

// A coloured word and the muted words read at 4.5:1 on every surface they are read on, in both modes and
// under every theme, at a desk's width and a phone's (`docs/design.md`, "Colour"). The page is built the
// way a host's is with no word step of its own: the library's surfaces and words as its stylesheet states
// them, the colour tokens as its colour plugin states them, the layer's own theme rules read out of its
// stylesheet as it ships over them, and each coloured word drawn in the word token the layer's theme reads,
// on each surface bare and under its own colour's tint, the tint a hovered row, a soft control or a badge
// lays under it. The browser then draws each one and the measuring module reads what the words ended up as.

(globalThis as { defineAppConfig?: unknown }).defineAppConfig = (config: unknown) => config;

const appConfig = "../../app/app.config";
const { ui } = (await import(appConfig)).default as { ui: { colors: Record<string, string> } };

// The library's own colour for every token the layer does not name for itself.
const colors: Record<string, string> = {
  secondary: "blue",
  success: "green",
  info: "blue",
  warning: "yellow",
  error: "red",
  ...ui.colors
};
const semantic = Object.keys(colors).filter((key) => key !== "neutral");
const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

// The rules of a stylesheet's theme layer, in the order it states them.
function themeLayer(css: string): string[] {
  const rules: string[] = [];

  postcss.parse(css).walkAtRules("layer", (layer) => {
    if (layer.params === "theme") {
      layer.each((node) => {
        rules.push(node.toString());
      });
    }
  });

  return rules;
}

// The library's surfaces and words, and the layer's own theme rules stated over them.
const here = new URL(".", import.meta.url).pathname;
// The library exports no path to its stylesheet, which stands beside its module.
const library = themeLayer(await Bun.file(new URL("runtime/index.css", Bun.pathToFileURL(Bun.resolveSync("@nuxt/ui", here)))).text());
const layer = themeLayer(await Bun.file(new URL("../../app/assets/css/main.css", import.meta.url)).text());

// The colour tokens the way the library's colour plugin writes them: each colour at its 500 in the light
// mode and its 400 in the dark.
function tokens(): string {
  const scale = Object.entries(colors)
    .flatMap(([key, name]) => shades.map((shade) => `--ui-color-${key}-${shade}: ${(tailwind as unknown as Record<string, Record<number, string>>)[name]![shade]};`))
    .join("\n");
  const pick = (shade: number) => semantic.map((key) => `--ui-${key}: var(--ui-color-${key}-${shade});`).join("\n");

  return `:root { ${scale} }
    :root, .light { ${pick(500)} }
    .dark { ${pick(400)} }`;
}

// A coloured word as the layer's theme draws it: its word token, or the colour where none is stated.
const word = (key: string) => `var(--bmo-ink-${key}, var(--ui-${key}))`;

// The surfaces words are read on: the page, and the muted and elevated ones a card, a pill or a hovered
// row lays under them. The accented surface is a press, a flash under a finger, and nothing is read on it.
const surfaces = ["bg", "bg-muted", "bg-elevated"];
// How much of a coloured word's own colour stands under it: none, and the tints a soft or subtle control,
// a badge and a hovered row lay.
const tints = [0, 5, 10, 15];

function fixture(): string {
  const coloured = (surface: string) =>
    semantic.flatMap((key) =>
      tints.map(
        (tint) =>
          `<span style="background: color-mix(in oklab, var(--ui-${key}) ${tint}%, transparent); color: ${word(key)}" data-word="${surface} ${key} ${tint}">Words</span>`
      )
    );
  const muted = (surface: string) => `<span style="color: var(--ui-text-muted)" data-word="${surface} muted 0">Words</span>`;
  const page = surfaces.map((surface) => `<div style="background: var(--ui-${surface})">${[...coloured(surface), muted(surface)].join("")}</div>`).join("");

  return `<style>@layer theme { ${library.join("\n")}\n${tokens()}\n${layer.join("\n")} }
    body { margin: 0; font: 400 14px sans-serif; background: var(--ui-bg); }
    span { display: inline-block; padding: 2px 6px; }</style>${page}`;
}

const WIDTHS = [
  { name: "a desk", width: 1280, height: 800 },
  { name: "a phone", width: 360, height: 780 }
];

const ready = touchReady();
let browser: Browser | null = null;

beforeAll(async () => {
  if (ready) {
    browser = await chromium.launch();
  }
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();
}, BROWSER_HOOK_MS);

// Every word on the page with the contrast it ended up with, in the mode and the theme asked for: the theme
// stated on the root over the library's own colours, as a host's page states it (`docs/design.md`, "Both on
// the page").
async function measured(page: Page, mode: "light" | "dark", look: Theme): Promise<{ words: string; ratio: number }[]> {
  await page.evaluate(
    ([dark, stated]) => {
      document.documentElement.classList.toggle("dark", dark as boolean);
      document.documentElement.classList.toggle("light", !(dark as boolean));
      document.documentElement.style.cssText = stated as string;
    },
    [mode === "dark", themeDeclarations(look)]
  );

  return page.evaluate(() =>
    [...document.querySelectorAll("[data-word]")].map((words) => {
      const name = words.getAttribute("data-word")!;

      return { words: name, ratio: (window as unknown as Measured).measure.contrast(`[data-word="${name}"]`)[0]!.ratio };
    })
  );
}

for (const size of WIDTHS) {
  describe.skipIf(!ready)(`a coloured word and the muted words at ${size.name}'s width`, () => {
    let page: Page;

    beforeAll(async () => {
      page = await browser!.newPage({ viewport: { width: size.width, height: size.height } });
      await page.setContent(fixture());
      await page.addScriptTag({ type: "module", content: `${measureSource()}\ninstall();` });
      await page.waitForFunction(() => "measure" in window);
    }, BROWSER_HOOK_MS);

    afterAll(async () => {
      await page?.close();
    }, BROWSER_HOOK_MS);

    for (const mode of ["light", "dark"] as const) {
      test(`read at 4.5:1 or better on every surface in the ${mode} mode, under every theme`, async () => {
        for (const look of THEMES) {
          const rows = await measured(page, mode, look);

          expect(rows).toHaveLength(surfaces.length * (semantic.length * tints.length + 1));
          expect([look.id, rows.filter((row) => row.ratio < 4.5)]).toEqual([look.id, []]);
        }
      });
    }
  });
}
