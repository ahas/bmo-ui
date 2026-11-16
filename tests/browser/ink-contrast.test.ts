import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
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

// A coloured badge's words, and a soft or subtle alert's, read at 4.5:1 in both modes, whatever
// colour and shape it is given and whichever surface it stands on (`docs/design.md`, "Colour"). The
// page is built the way a host's is: the colour tokens as the library's colour plugin states them,
// the shapes as the library's badge and alert paint them, the classes the layer's app configuration
// gives each, their words in the word token the layer's theme reads, and the layer's own rules for
// those classes read out of its stylesheet as it ships. The host states its word tokens at the fill's
// own step, the one at which a word falls shortest, so the layer's rule is what makes them read. The
// browser then draws each one and the measuring module reads what the words ended up as.

// The configuration is written for Nuxt, which supplies the function it is wrapped in; here it is the
// identity. It is named by a variable so the static check does not follow it into Nuxt's globals.
(globalThis as { defineAppConfig?: unknown }).defineAppConfig = (config: unknown) => config;

const appConfig = "../../app/app.config";
const { ui } = (await import(appConfig)).default as {
  ui: {
    colors: Record<string, string>;
    badge: { slots: { base: string } };
    alert: object;
  };
};
const css = await Bun.file(new URL("../../app/assets/css/main.css", import.meta.url)).text();

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

// The layer's rules that darken a colour's words, as they stand in its stylesheet.
const inkRules: string[] = [];
postcss.parse(css).walkRules((rule) => {
  if (rule.selectors.some((selector) => selector.includes(".badge-ink"))) {
    inkRules.push(rule.toString());
  }
});

// The tokens, the way the library's colour plugin writes them, and its surfaces for each mode.
function tokens(): string {
  const scale = Object.entries(colors)
    .flatMap(([key, name]) => shades.map((shade) => `--ui-color-${key}-${shade}: ${(tailwind as unknown as Record<string, Record<number, string>>)[name]![shade]};`))
    .join("\n");
  const pick = (shade: number) =>
    semantic.map((key) => `--ui-${key}: var(--ui-color-${key}-${shade}); --bmo-ink-${key}: var(--ui-color-${key}-${shade});`).join("\n");

  return `:root { ${scale} }
    :root { ${pick(500)} --ui-text-inverted: #fff; --ui-bg: #fff;
      --ui-bg-muted: var(--ui-color-neutral-50); --ui-bg-elevated: var(--ui-color-neutral-100); }
    .dark { ${pick(400)} --ui-text-inverted: var(--ui-color-neutral-900); --ui-bg: var(--ui-color-neutral-900);
      --ui-bg-muted: var(--ui-color-neutral-800); --ui-bg-elevated: var(--ui-color-neutral-800); }`;
}

// A coloured word as the layer's theme draws it: its word token, or the colour where none is stated.
const word = (key: string) => `var(--bmo-ink-${key}, var(--ui-${key}))`;

// The four shapes, painted as the library paints them.
const shapes: Record<string, (key: string) => string> = {
  solid: (key) => `background: var(--ui-${key}); color: var(--ui-text-inverted);`,
  outline: (key) => `color: ${word(key)}; box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--ui-${key}) 50%, transparent);`,
  soft: (key) => `background: color-mix(in oklab, var(--ui-${key}) 10%, transparent); color: ${word(key)};`,
  subtle: (key) =>
    `background: color-mix(in oklab, var(--ui-${key}) 10%, transparent); color: ${word(key)}; box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--ui-${key}) 25%, transparent);`
};
// The shapes of an alert that draw its words in its colour on its own tint, which the library paints
// as it paints a badge of the same shape. A solid or outline alert is no part of this.
const alertShapes = ["soft", "subtle"] as const;
// The lines of words an alert is measured by: its title and its description.
const alertLines = ["title", "description"] as const;

// The classes the library gives an alert's root and description in each of those shapes, with the
// layer's app configuration merged over its theme the way the library merges them. The library's
// themes are generated when the layer is prepared; without them there is nothing to merge.
const themes = new URL("../../.nuxt/ui/", import.meta.url).pathname;
const prepared = existsSync(`${themes}alert.ts`);
type AlertSlots = { root: string; description: string };

async function alertSlots(): Promise<Record<string, AlertSlots>> {
  const here = new URL(".", import.meta.url).pathname;
  const variants = Bun.resolveSync("tailwind-variants", Bun.resolveSync("@nuxt/ui", here));
  const { createTV } = (await import(variants)) as { createTV: (config: object) => (options: object) => (props: object) => Record<string, () => string> };
  const tv = createTV({});
  const theme = ((await import(`${themes}alert.ts`)) as { default: object }).default;
  const alert = tv({ extend: tv(theme), ...ui.alert });

  return Object.fromEntries(
    alertShapes.map((shape) => {
      const slots = alert({ color: "error", variant: shape, title: true });

      return [shape, { root: slots.root!(), description: slots.description!() }];
    })
  );
}

const alert = prepared ? await alertSlots() : {};

// How much of its colour a line of words is drawn at, by the opacity class it carries.
function share(classes: string): number {
  const opacity = classes.split(" ").find((one) => /^opacity-\d+$/.test(one));

  return opacity === undefined ? 100 : Number(opacity.slice("opacity-".length));
}

// The surfaces a badge or an alert is read on: the page, and the muted and elevated ones a card or a
// hovered row lays under it. The accented surface is a press, a flash under a finger, and nothing is
// read on it.
const surfaces = ["bg", "bg-muted", "bg-elevated"];

function fixture(): string {
  const styles = semantic.flatMap((key) => Object.entries(shapes).map(([shape, paint]) => `.${key}-${shape} { ${paint(key)} }`));
  const badges = (surface: string) =>
    semantic.flatMap((key) => Object.keys(shapes).map((shape) => `<span class="${ui.badge.slots.base} ${key}-${shape}" data-ink="badge ${surface} ${key} ${shape}">Badge</span>`));
  // An alert's title in the medium weight and its description in the regular one, each at the share
  // of its colour its opacity class leaves, laid into the colour so the measure reads it.
  const alerts = (surface: string) =>
    semantic.flatMap((key) =>
      alertShapes.map((shape) => {
        const { root, description } = alert[shape]!;
        const lines = { title: "", description: `font-weight: 400; color: color-mix(in srgb, currentColor ${share(description)}%, transparent)` };

        return `<div class="${root} ${key}-${shape} alert">${alertLines
          .map((line) => `<span style="${lines[line]}" data-ink="alert ${line} ${surface} ${key} ${shape}">Words</span>`)
          .join("")}</div>`;
      })
    );
  const page = surfaces.map((surface) => `<div style="background: var(--ui-${surface})">${[...badges(surface), ...alerts(surface)].join("")}</div>`).join("");

  return `<style>${tokens()}\n${styles.join("\n")}\n${inkRules.join("\n")}
    body { margin: 0; font: 500 14px sans-serif; background: var(--ui-bg); }
    span { display: inline-block; padding: 2px 6px; }
    .alert { display: flex; flex-direction: column; padding: 16px; }</style>${page}`;
}

const ready = touchReady();
let browser: Browser | null = null;
let page: Page;

beforeAll(async () => {
  if (!ready || !prepared) {
    return;
  }

  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 800, height: 600 } });

  await page.setContent(fixture());
  await page.addScriptTag({ type: "module", content: `${measureSource()}\ninstall();` });
  await page.waitForFunction(() => "measure" in window);
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();
}, BROWSER_HOOK_MS);

// Every badge's and alert's words on the page with the contrast they ended up with, in the mode and
// the theme asked for: the theme stated on the root over the library's own colours, as a host's page
// states it (`docs/design.md`, "Both on the page").
async function measured(mode: "light" | "dark", look: Theme): Promise<{ words: string; ratio: number }[]> {
  await page.evaluate(
    ([dark, stated]) => {
      document.documentElement.classList.toggle("dark", dark as boolean);
      document.documentElement.style.cssText = stated as string;
    },
    [mode === "dark", themeDeclarations(look)]
  );

  // One line of words to a call, since the module answers for a bounded number of matches at a time.
  return page.evaluate(() =>
    [...document.querySelectorAll("[data-ink]")].map((words) => {
      const name = words.getAttribute("data-ink")!;

      return { words: name, ratio: (window as unknown as Measured).measure.contrast(`[data-ink="${name}"]`)[0]!.ratio };
    })
  );
}

describe("the darker ink's own rule", () => {
  test("every badge carries the class the stylesheet darkens", () => {
    expect(ui.badge.slots.base.split(" ")).toContain("badge-ink");
    expect(inkRules.length).toBeGreaterThan(0);
  });

  test.skipIf(!prepared)("every soft and subtle alert carries it too", () => {
    for (const shape of alertShapes) {
      expect(alert[shape]!.root.split(" ")).toContain("badge-ink");
    }
  });

  test("names every semantic colour the library paints with", () => {
    for (const key of semantic) {
      expect(inkRules.join("\n")).toContain(`--ui-${key}:`);
      expect(inkRules.join("\n")).toContain(`--bmo-ink-${key}:`);
    }
  });
});

describe.skipIf(!ready || !prepared)("a coloured badge's and a soft or subtle alert's words", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`read at 4.5:1 or better in the ${mode} mode, under every theme`, async () => {
      for (const look of THEMES) {
        const rows = await measured(mode, look);

        expect(rows).toHaveLength(surfaces.length * semantic.length * (Object.keys(shapes).length + alertShapes.length * alertLines.length));
        expect([look.id, rows.filter((row) => row.ratio < 4.5)]).toEqual([look.id, []]);
      }
    });
  }
});
