import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright-core";
import postcss from "postcss";
import tailwind from "tailwindcss/colors";

import { THEMES, themeDeclarations } from "#shared/themes";
import { measureSource } from "./measure-source";
import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// What the measuring module calls itself once it is loaded into the page.
type Measured = { measure: typeof import("./measure") };

// The focus ring as the browser draws it (`docs/design.md`, "Focus"). The page is built the way a
// host's is: the colour tokens as the library's colour plugin states them, a control, a field and a
// message bar painted as the library paints them — its thick ring in the control's own colour, a
// neutral one's being the inverted one, in the utilities layer — and the layer's own focus rules read
// out of its stylesheet as it ships. The browser then focuses each by the keyboard and by a press, and
// what it drew is read back.

const css = await Bun.file(new URL("../../app/assets/css/main.css", import.meta.url)).text();

// The stylesheet's focus section: from its heading comment up to the utility that draws the ring
// inside a clipping row.
function focusSection(): string {
  const nodes = postcss.parse(css).nodes;
  const start = nodes.findIndex((node) => node.type === "comment" && node.text.startsWith("Focus ("));
  const end = nodes.findIndex((node, at) => at > start && node.type === "atrule" && node.name === "utility" && node.params === "focus-inset");

  return nodes
    .slice(start, end)
    .map((node) => node.toString())
    .join("\n");
}

const focusRules = focusSection();

const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const palette = { primary: tailwind.teal, neutral: tailwind.zinc };

function tokens(): string {
  const scale = Object.entries(palette)
    .flatMap(([key, colors]) => shades.map((shade) => `--ui-color-${key}-${shade}: ${colors[shade]};`))
    .join("\n");

  return `:root { ${scale} --ui-bg: #fff; --ui-bg-muted: var(--ui-color-neutral-50); --ui-bg-elevated: var(--ui-color-neutral-100);
      --ui-border-accented: var(--ui-color-neutral-300); --ui-border-inverted: var(--ui-color-neutral-900); }
    .dark { --ui-bg: var(--ui-color-neutral-900); --ui-bg-muted: var(--ui-color-neutral-800); --ui-bg-elevated: var(--ui-color-neutral-800);
      --ui-border-accented: var(--ui-color-neutral-700); --ui-border-inverted: #fff; }`;
}

// A neutral control of the library: its edge at rest, its outline resting in a quarter of the inverted
// colour and fading as its colours change, and on focus a three-pixel ring with the edge redrawn in the
// inverted colour itself. The fade is drawn out long here, so a colour read as focus arrives is the one
// it fades from.
const library = `@layer theme, base, components, utilities;
  @layer utilities {
    .edged { --tw-ring-color: var(--ui-border-accented); box-shadow: inset 0 0 0 1px var(--tw-ring-color); }
    .neutral { outline-color: color-mix(in oklab, var(--ui-border-inverted) 25%, transparent); transition: outline-color 60s linear; }
    .neutral:focus-visible { outline-style: solid; outline-width: 3px; --tw-ring-color: var(--ui-border-inverted); }
    .bar { background: color-mix(in oklab, var(--ui-bg-elevated) 50%, transparent); outline-color: color-mix(in oklab, var(--ui-border-inverted) 25%, transparent); }
    .bar:has(textarea:focus-visible) { outline-style: solid; outline-width: 3px; --tw-ring-color: var(--ui-border-inverted); }
    textarea { outline: none; border: 0; background: transparent; }
  }`;

const surfaces = ["bg", "bg-muted", "bg-elevated"];

function fixture(): string {
  const swatches = surfaces.map((surface) => `<p style="background: var(--ui-${surface}); color: var(--bmo-focus)" data-swatch="${surface}">Edge</p>`).join("");

  return `<style>${tokens()}\n${library}\n${focusRules}
    body { margin: 0; padding: 24px; font: 500 14px sans-serif; background: var(--ui-bg); }
    button, input { margin: 8px; padding: 4px 8px; border: 0; border-radius: 6px; background: var(--ui-bg); }
    form { display: block; margin: 8px; padding: 8px; border-radius: 8px; }</style>
    <a href="#" data-start>Start</a>
    <button type="button" class="edged neutral" data-control>Button</button>
    <input class="edged neutral" data-field>
    <form class="edged bar focus-bar" data-bar><textarea></textarea></form>
    ${swatches}`;
}

const ready = touchReady();
let browser: Browser | null = null;
let page: Page;

beforeAll(async () => {
  if (!ready) {
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

type Drawn = { outline: string; width: string; offset: string; color: string; edge: string; background: string; accent: string; accented: string; elevated: string };

// What one element drew once focus came to it, beside the colours it is held to, all as the browser
// resolves them.
async function drawn(selector: string): Promise<Drawn> {
  return page.evaluate((target) => {
    const element = document.querySelector<HTMLElement>(target)!;
    const style = getComputedStyle(element);
    const resolve = (value: string) => {
      const probe = document.createElement("i");
      probe.style.color = value;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };

    return {
      outline: style.outlineStyle,
      width: style.outlineWidth,
      offset: style.outlineOffset,
      color: style.outlineColor,
      edge: resolve(style.getPropertyValue("--tw-ring-color")),
      background: style.backgroundColor,
      accent: resolve("var(--bmo-focus)"),
      accented: resolve("var(--ui-border-accented)"),
      elevated: resolve("var(--ui-bg-elevated)")
    };
  }, selector);
}

async function mode(name: "light" | "dark"): Promise<void> {
  await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), name === "dark");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  // The change of mode is no part of what is read, so whatever it set fading has ended.
  await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
}

describe("the focus section", () => {
  test("is found in the stylesheet, from its heading to the inset utility", () => {
    expect(focusRules).toContain("--bmo-focus:");
    expect(focusRules).toContain(".focus-bar");
    expect(focusRules).not.toContain("focus-inset");
  });
});

describe.skipIf(!ready)("the focus ring", () => {
  for (const name of ["light", "dark"] as const) {
    test(`is the accent from its first frame, thin and outside the control, when the keyboard reaches it in the ${name} mode`, async () => {
      await mode(name);
      await page.focus("[data-start]");
      await page.keyboard.press("Tab");

      const control = await drawn("[data-control]");

      expect(control).toMatchObject({ outline: "solid", width: "2px", offset: "2px", color: control.accent, edge: control.accented });
    });

    test(`is not drawn when a press brings focus in the ${name} mode`, async () => {
      await mode(name);
      await page.click("[data-control]");

      expect((await drawn("[data-control]")).outline).toBe("none");
    });

    test(`is not drawn around a field, whose edge takes the accent instead, in the ${name} mode`, async () => {
      await mode(name);
      await page.click("[data-field]");

      const field = await drawn("[data-field]");

      expect(field.outline).toBe("none");
      expect(field.edge).toBe(field.accent);
    });

    test(`nor around the message bar, whose tone changes for a press, in the ${name} mode`, async () => {
      await mode(name);
      await page.evaluate(() => document.documentElement.setAttribute("data-input", "pointer"));
      await page.click("[data-bar] textarea");

      const bar = await drawn("[data-bar]");

      expect(bar.outline).toBe("none");
      expect(bar.edge).not.toBe(bar.accent);
      expect(bar.background).toBe(bar.elevated);
    });

    test(`and whose edge takes the accent as well where the keyboard brought the focus, in the ${name} mode`, async () => {
      await mode(name);
      await page.evaluate(() => {
        document.documentElement.setAttribute("data-input", "key");
        document.querySelector<HTMLTextAreaElement>("[data-bar] textarea")?.focus();
      });

      const bar = await drawn("[data-bar]");

      expect(bar.outline).toBe("none");
      expect(bar.edge).toBe(bar.accent);
      expect(bar.background).toBe(bar.elevated);
      await page.evaluate(() => document.documentElement.removeAttribute("data-input"));
    });

    // Under every theme, stated on the root over the library's own colours as a host's page states it
    // (`docs/design.md`, "Both on the page").
    test(`reads at 3:1 or better on every surface in the ${name} mode, under every theme`, async () => {
      await mode(name);

      for (const one of THEMES) {
        await page.evaluate((stated) => (document.documentElement.style.cssText = stated), themeDeclarations(one));

        const ratios = await page.evaluate(
          (names) => names.map((surface) => ({ surface, ratio: (window as unknown as Measured).measure.contrast(`[data-swatch="${surface}"]`)[0]!.ratio })),
          surfaces
        );

        expect([one.id, ratios.filter((row) => row.ratio < 3)]).toEqual([one.id, []]);
      }

      await page.evaluate(() => document.documentElement.removeAttribute("style"));
    });
  }
});
