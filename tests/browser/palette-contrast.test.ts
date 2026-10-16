import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright-core";
import tailwind from "tailwindcss/colors";

import { PALETTES, paletteDeclarations } from "#shared/palettes";
import { THEMES, themeDeclarations } from "#shared/themes";
import { measureSource } from "./measure-source";
import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Palette } from "#shared/palettes";
import type { Scheme, Theme } from "#shared/themes";
import type { Browser, Page } from "playwright-core";

// What the measuring module calls itself once it is loaded into the page.
type Measured = { measure: typeof import("./measure") };

// The palette's grounds as the browser paints them (`docs/design.md`, "Palettes", "Both on the
// page"). The library's words read at 4.5:1 or better on the reader's own ground and on everyone
// else's, in both modes, in every palette under every theme; and the mode's pair is the mode's own
// grounds on the root, on `.light` and on `.dark`, a box of either mode in a page of the other
// included. The page carries the library's colour and text tokens and the layer's stylesheet whole as
// it ships, which the browser reads as it reads any stylesheet, passing over the build's own imports
// and at-rules it has no use for.

(globalThis as { defineAppConfig?: unknown }).defineAppConfig = (config: unknown) => config;

const appConfig = "../../app/app.config";
const { ui } = (await import(appConfig)).default as { ui: { colors: Record<string, string> } };
const css = await Bun.file(new URL("../../app/assets/css/main.css", import.meta.url)).text();

const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

// The library's neutral scale and its words on it, in each mode.
function tokens(): string {
  const scale = shades
    .map((shade) => `--ui-color-neutral-${shade}: ${(tailwind as unknown as Record<string, Record<number, string>>)[ui.colors.neutral!]![shade]};`)
    .join("\n");

  return `:root { ${scale} }
    :root { --ui-text: var(--ui-color-neutral-700); --ui-bg: #fff; }
    .dark { --ui-text: var(--ui-color-neutral-200); --ui-bg: var(--ui-color-neutral-900); }`;
}

// Both grounds, each with the library's words on it, in a box of the page's own mode or of a mode it
// names for itself.
function grounds(where: string, mode = ""): string {
  const ground = (side: string, token: string) =>
    `<div data-ground="${where} ${side}" style="background: var(${token})"><span data-read="${where} ${side}" style="color: var(--ui-text)">Words 16:56</span></div>`;

  return `<div class="${mode}">${ground("own", "--bmo-palette-own")}${ground("other", "--bmo-palette-other")}</div>`;
}

function fixture(): string {
  return `<style>${tokens()}</style><style>${css}</style><style>
    body { margin: 0; font: 400 14px sans-serif; background: var(--ui-bg); }
    [data-ground] { padding: 8px 12px; }
    span { display: inline-block; padding: 2px; }</style>
    ${grounds("page")}${grounds("light box", "light")}${grounds("dark box", "dark")}`;
}

const ready = touchReady();
let browser: Browser | null = null;
let page: Page;

beforeAll(async () => {
  if (!ready) {
    return;
  }

  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 1280, height: 400 } });

  await page.setContent(fixture());
  await page.addScriptTag({ type: "module", content: `${measureSource()}\ninstall();` });
  await page.waitForFunction(() => "measure" in window);
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();
}, BROWSER_HOOK_MS);

// A theme and a palette together, as a page reads in both, and every pair of the two lists.
interface Look {
  id: string;
  theme: Theme;
  palette: Palette;
}

const LOOKS: Look[] = THEMES.flatMap((theme) => PALETTES.map((palette) => ({ id: `${theme.id}/${palette.id}`, theme, palette })));

// The page in a mode and a look, stated on the root over the library's own colours as a host's page
// states it.
async function stand(mode: Scheme, look: Look): Promise<void> {
  await page.evaluate(
    ([dark, stated]) => {
      document.documentElement.classList.toggle("dark", dark as boolean);
      document.documentElement.style.cssText = stated as string;
    },
    [mode === "dark", `${themeDeclarations(look.theme)} ${paletteDeclarations(look.palette)}`]
  );
}

// Every ratio the page's own grounds give the words on them.
function ratios(): Promise<Record<string, number>> {
  return page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('[data-read^="page "]')].map((element) => {
        const name = element.getAttribute("data-read")!;

        return [name, (window as unknown as Measured).measure.contrast(`[data-read="${name}"]`)[0]!.ratio];
      })
    )
  );
}

// Each ground as the browser painted it, beside the colour it was meant to be, both resolved by the
// browser.
function painted(expected: Record<string, string>): Promise<Record<string, [string, string]>> {
  return page.evaluate(
    (expected) =>
      Object.fromEntries(
        Object.entries(expected).map(([name, colour]) => {
          const probe = document.body.appendChild(Object.assign(document.createElement("i"), { style: `background: ${colour}` }));
          const meant = getComputedStyle(probe).backgroundColor;

          probe.remove();

          return [name, [getComputedStyle(document.querySelector(`[data-ground="${name}"]`)!).backgroundColor, meant]];
        })
      ),
    expected
  );
}

describe.skipIf(!ready)("the palette's grounds", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`carry the library's words at 4.5:1 or better in the ${mode} mode, in every palette under every theme`, async () => {
      for (const look of LOOKS) {
        await stand(mode, look);
        const read = await ratios();

        expect(Object.keys(read)).toHaveLength(2);
        expect([look.id, Object.entries(read).filter(([, ratio]) => ratio < 4.5)]).toEqual([look.id, []]);
      }
    });

    test(`are the mode's own on the page and the other mode's in a box of it, in the ${mode} mode, in every palette`, async () => {
      const other: Scheme = mode === "light" ? "dark" : "light";
      const look = (palette: Palette): Look => ({ id: palette.id, theme: THEMES[0]!, palette });

      for (const palette of PALETTES) {
        await stand(mode, look(palette));
        const colours = await painted({
          "page own": palette.mine[mode],
          "page other": palette.theirs[mode],
          [`${other} box own`]: palette.mine[other],
          [`${other} box other`]: palette.theirs[other],
          [`${mode} box own`]: palette.mine[mode],
          [`${mode} box other`]: palette.theirs[mode]
        });
        const wrong = Object.entries(colours).filter(([, [drawn, meant]]) => drawn !== meant || drawn === "rgba(0, 0, 0, 0)");

        expect([palette.id, wrong]).toEqual([palette.id, []]);
      }
    });
  }
});
