import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, BrowserContext, Page } from "playwright-core";

// The rows a screen lays under the title bar, as a screen builds them, drawn by a real browser at a
// desktop's width and a phone's, in both schemes (`docs/components.md`, "Tab bar and toolbar";
// `docs/console-bundles.md`, "How a bundle mounts"): the way back stands at the toolbar's left end and
// the actions at its right; every button in the toolbar and the tab bar is the library's small one,
// centred in the row with room above and below it, and its hover fills its own rounded shape and
// nothing round it; a cell of buttons the library draws as links keeps no room of words; the control
// that chooses every row is one pressable control whose hover is its own; the view switch's choices are
// small buttons sharing its width, walked by the arrow keys; and the zoom buttons beside a diagram and
// at the picture viewer's foot are small too. The page is built as the layer's custom elements are,
// from the components that ship. Skipped where the browser build is not on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/toolbar-harness.js" defer></script></head><body><div id="page"></div></body></html>`;

// The library's small icon-only button is a 28-pixel square; one carrying a word stands on the
// layer's caption line and is 32 pixels tall.
const SMALL_PX = 28;
const SMALL_WORDED_PX = 32;

interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

// What a pointer on one element paints: its own ground, its cell's and the row's.
interface Painted {
  own: string;
  cell: string;
  row: string;
}

const WIDTHS = [
  { name: "a desktop's width", width: 1280, height: 720, touch: false },
  { name: "a phone's width", width: 360, height: 780, touch: true }
];
const SCHEMES = ["light", "dark"] as const;

let out = "";
let script = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-toolbar-"));

  // The test runner names its own environment, which the build would read as a mode of its own; the
  // page is built as a host's script is, for production.
  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/toolbar-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "toolbar-harness.js")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

async function open(width: (typeof WIDTHS)[number], scheme: (typeof SCHEMES)[number], query = ""): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: width.width, height: width.height }, hasTouch: width.touch, isMobile: width.touch, colorScheme: scheme });
  const page = await context.newPage();

  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/toolbar-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/${query}`);
  await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), scheme === "dark");
  await page.waitForSelector(query === "" ? "[role=toolbar] #actions [data-slot=base]" : "[role=dialog] [data-slot=footer] [data-slot=base]");

  return { context, page };
}

async function box(page: Page, selector: string): Promise<Box> {
  return await page.$eval(selector, (element) => {
    const rect = element.getBoundingClientRect();

    return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
  });
}

// The grounds round an element at rest, under the pointer or pressed: its own, the cell of the row it
// stands in, and the row's. A press is let go away from the element, so it presses nothing.
async function painted(page: Page, selector: string, state: "rest" | "hover" | "press", rowSelector = "[role=toolbar]"): Promise<Painted> {
  // A row wider than a phone flows sideways, so what stands past its edge is brought into view first.
  await page.$eval(selector, (element) => element.scrollIntoView({ block: "nearest", inline: "nearest" }));

  const at = await box(page, selector);

  await page.mouse.move(state === "rest" ? 1 : at.left + at.width / 2, state === "rest" ? 1 : at.top + at.height / 2);

  if (state === "press") await page.mouse.down();

  const grounds = await page.$eval(selector, (element, around) => {
    const row = element.closest(around)!;
    const cell = [...row.children].find((child) => child.contains(element))!;
    const ground = (one: Element) => getComputedStyle(one).backgroundColor;

    return { own: ground(element), cell: ground(cell), row: ground(row) };
  }, rowSelector);

  if (state === "press") {
    await page.mouse.move(1, 1);
    await page.mouse.up();
  }

  return grounds;
}

// Every library button standing inside what a selector finds, by a selector that finds it again.
async function buttons(page: Page, within = "[role=toolbar]"): Promise<string[]> {
  return await page.$$eval(`${within} :is(button,a)[data-slot=base]:not([role=checkbox])`, (found) =>
    found.map((element) => {
      const probe = element.getAttribute("data-probe") ?? String(document.querySelectorAll("[data-probe]").length);

      element.setAttribute("data-probe", probe);

      return `[data-probe="${probe}"]`;
    })
  );
}

// Whether every button inside a row is small, centred in the row with room above and below it, and
// paints only its own rounded shape under the pointer or the finger. A button with nothing to do
// answers neither, so only its size and place are read.
async function smallAndOwnPainting(page: Page, rowSelector: string, within: string, touched: "hover" | "press"): Promise<void> {
  const row = await box(page, rowSelector);
  const found = await buttons(page, within);

  expect(found.length).toBeGreaterThan(0);

  for (const selector of found) {
    const button = await box(page, selector);

    expect([SMALL_PX, SMALL_WORDED_PX]).toContain(button.height);
    expect(Math.abs((button.top + button.bottom) / 2 - (row.top + row.bottom) / 2)).toBeLessThanOrEqual(0.5);
    expect(button.top - row.top).toBeGreaterThanOrEqual(2);

    if (await page.$eval(selector, (element) => (element as HTMLButtonElement).disabled === true)) continue;

    const rest = await painted(page, selector, "rest", rowSelector);
    const lit = await painted(page, selector, touched, rowSelector);

    expect(lit.own).not.toBe(rest.own);
    expect(lit.cell).toBe(rest.cell);
    expect(lit.row).toBe(rest.row);
    expect(Number.parseFloat(await page.$eval(selector, (element) => getComputedStyle(element).borderTopLeftRadius))).toBeGreaterThan(0);
  }
}

describe.skipIf(!ready)("a toolbar drawn in a browser", () => {
  for (const width of WIDTHS) {
    for (const scheme of SCHEMES) {
      describe(`at ${width.name}, ${scheme}`, () => {
        let context: BrowserContext;
        let page: Page;

        beforeAll(async () => {
          ({ context, page } = await open(width, scheme));
        }, BROWSER_HOOK_MS);

        afterAll(async () => {
          await context?.close();
        });

        // A pointer that can hover is answered on hover; a finger, which has none, on the press.
        const touched = width.touch ? "press" : "hover";

        test(`stands every toolbar button small and centred, ${touched === "hover" ? "hovered" : "pressed"} on its own shape alone`, async () => {
          expect((await buttons(page)).length).toBeGreaterThan(3);
          await smallAndOwnPainting(page, "[role=toolbar]", "[role=toolbar]", touched);
        });

        test("stands an icon-only button as the library's small square", async () => {
          for (const selector of ["#back a[data-slot=base]", "#links a[data-slot=base]", "#actions [data-slot=base]"]) {
            const button = await box(page, selector);

            expect(button.width).toBe(SMALL_PX);
          }
        });

        // The way back leads the row and the actions end it, each 4 pixels in from the row's edge.
        test("stands the way back at the row's left end and the actions at its right end", async () => {
          await page.$eval("[role=toolbar]", (bar) => (bar.scrollLeft = 0));

          const row = await box(page, "[role=toolbar]");
          const back = await box(page, "#back a[data-slot=base]");

          expect(back.left - row.left).toBe(4);

          await page.$eval("[role=toolbar]", (bar) => (bar.scrollLeft = bar.scrollWidth));

          const last = await page.$$eval("#actions [data-slot=base]", (found) => found.at(-1)!.getBoundingClientRect().right);

          expect(Math.abs(row.right - last - 4)).toBeLessThanOrEqual(0.5);
          await page.$eval("[role=toolbar]", (bar) => (bar.scrollLeft = 0));
        });

        test(`stands the tab bar's view switch and actions small and centred, ${touched === "hover" ? "hovered" : "pressed"} on their own shapes alone`, async () => {
          await smallAndOwnPainting(page, "#tabs", "#tabs > :not(:first-child)", touched);
        });

        test("draws a diagram's zoom buttons at the small square icon button's size", async () => {
          const found = await page.$$eval(".markdown-diagram-tools > button", (all) =>
            all.map((element) => [element.getBoundingClientRect().width, element.getBoundingClientRect().height, element.querySelector("svg")!.getBoundingClientRect().width])
          );

          expect(found).toEqual([
            [SMALL_PX, SMALL_PX, 16],
            [SMALL_PX, SMALL_PX, 16],
            [SMALL_PX, SMALL_PX, 16]
          ]);

          const rest = await painted(page, ".markdown-diagram-tools > button", "rest", ".markdown-diagram-tools");
          const lit = await painted(page, ".markdown-diagram-tools > button", touched, ".markdown-diagram-tools");

          expect(lit.own).not.toBe(rest.own);
          expect(lit.row).toBe(rest.row);
        });

        test("stands the picture viewer's zoom buttons small at its foot, painting their own shapes alone", async () => {
          const viewer = await open(width, scheme, "?viewer");

          try {
            const footer = "[role=dialog] [data-slot=footer]";

            for (const selector of await buttons(viewer.page, footer)) {
              expect((await box(viewer.page, selector)).width).toBe(SMALL_PX);
            }

            await smallAndOwnPainting(viewer.page, footer, footer, touched);
          } finally {
            await viewer.context.close();
          }
        });

        // The keyboard walks the choices and takes the focus along; short of room, the choice the focus
        // lands on is named over it.
        test("walks the view switch's choices by the arrow keys, ringing each inside its edge and naming it by its tooltip where it shows its icon alone", async () => {
          await page.mouse.click(width.width - 2, width.height - 2);
          await page.waitForFunction(() => ![...document.querySelectorAll("[role=tooltip]")].some((tip) => tip.textContent === "Rendered"), undefined, { timeout: 3_000 });

          for (let step = 0; step < 12; step += 1) {
            await page.keyboard.press("Tab");

            if (await page.evaluate(() => document.activeElement?.closest("#switch") !== null)) break;
          }

          expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe("Rendered");
          // The toolbar clips what stands past its edge, so the ring stands inside the choice's own edge.
          expect(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineOffset)).toBe("-2px");

          if (width.touch) {
            await page.waitForFunction(() => [...document.querySelectorAll("[role=tooltip]")].some((tip) => tip.textContent === "Rendered"), undefined, { timeout: 3_000 });
          }

          await page.keyboard.press("ArrowRight");
          expect(await page.evaluate(() => [document.activeElement?.getAttribute("aria-label"), document.activeElement?.getAttribute("aria-selected")])).toEqual(["Source", "true"]);
          await page.keyboard.press("Home");
          expect(await page.evaluate(() => [document.activeElement?.getAttribute("aria-label"), document.activeElement?.getAttribute("aria-selected")])).toEqual(["Rendered", "true"]);
        });

        // The library rests a neutral button's outline in a quarter of the inverted colour and fades its
        // colours as they change, so the ring is read in the frame the key moves focus there.
        test("rings every button the keyboard reaches in the accent from its first frame, none fading in", async () => {
          await page.mouse.click(width.width - 2, width.height - 2);

          const reached: { label: string | null; color: string; accent: string; fading: boolean }[] = [];

          for (let step = 0; step < 12; step += 1) {
            await page.keyboard.press("Tab");

            const one = await page.evaluate(() => {
              const element = document.activeElement as HTMLElement;

              if (!element.matches(":is(button,a)[data-slot=base]")) return null;

              const probe = document.createElement("i");

              probe.style.color = "var(--bmo-focus)";
              element.append(probe);

              const accent = getComputedStyle(probe).color;

              probe.remove();

              return {
                label: element.getAttribute("aria-label"),
                color: getComputedStyle(element).outlineColor,
                accent,
                fading: element.getAnimations().some((animation) => (animation as CSSTransition).transitionProperty === "outline-color")
              };
            });

            if (one !== null) reached.push(one);
            if (await page.evaluate(() => document.activeElement?.closest("#actions") !== null)) break;
          }

          // The way back and the action group, whose actions fold behind one button at a phone's width.
          expect(reached.map((one) => one.label)).toContain("Back");
          expect(await page.evaluate(() => document.activeElement?.closest("#actions") !== null)).toBe(true);

          for (const one of reached) expect(one).toEqual({ ...one, color: one.accent, fading: false });
        });

        // A button given a route is drawn as a link and is still the library's button: its cell keeps
        // the small room a cell of buttons keeps, never the room of a cell of words.
        test("keeps no room of words round a cell of buttons drawn as links", async () => {
          const links = await page.$eval("#links", (cell) => getComputedStyle(cell).paddingLeft);
          const words = await page.$eval("#words", (cell) => getComputedStyle(cell).paddingLeft);

          expect(await page.$$eval("#links > *", (found) => found.map((element) => element.tagName))).toEqual(["A", "A"]);
          expect(links).toBe("4px");
          expect(words).toBe("12px");
        });

        test("stands the choose-all control as one small pressable shape whose hover and press are its own", async () => {
          const shape = "#choose [data-slot=root]";
          const row = await box(page, "[role=toolbar]");
          const control = await box(page, shape);
          const word = await box(page, "#choose label");
          const rest = await painted(page, shape, "rest");
          const hover = await painted(page, shape, touched);

          expect(control.height).toBe(SMALL_PX);
          expect(Math.abs((control.top + control.bottom) / 2 - (row.top + row.bottom) / 2)).toBeLessThanOrEqual(0.5);
          expect(word.height).toBeLessThanOrEqual(20);
          expect(hover.own).not.toBe(rest.own);
          expect(hover.cell).toBe(rest.cell);
          expect(hover.row).toBe(rest.row);

          // A press on the room round the box is a press of the control.
          await page.mouse.click(control.left + 2, control.top + control.height / 2);
          expect(await page.$eval("#choose [role=checkbox]", (box) => box.getAttribute("aria-checked"))).toBe("true");
          await page.click("#choose label");
          expect(await page.$eval("#choose [role=checkbox]", (box) => box.getAttribute("aria-checked"))).toBe("false");

          // The keyboard's ring goes round the whole shape, inside its edge, and not round the box alone.
          await page.$eval("#choose [role=checkbox]", (box) => (box as HTMLElement).blur());
          await page.mouse.click(width.width - 2, width.height - 2);

          for (let step = 0; step < 12; step += 1) {
            await page.keyboard.press("Tab");

            if (await page.evaluate(() => document.activeElement?.closest("#choose") !== null)) break;
          }

          const rings = await page.evaluate(() => {
            const ring = (element: Element) => [getComputedStyle(element).outlineStyle, getComputedStyle(element).outlineOffset];

            return { shape: ring(document.querySelector("#choose [data-slot=root]")!), box: ring(document.activeElement!)[0] };
          });

          expect(rings).toEqual({ shape: ["solid", "-2px"], box: "none" });
        });

        test("shares the view switch's width evenly between its small choices", async () => {
          const choices = await page.$$eval("#switch [role=tab]", (found) => found.map((element) => element.getBoundingClientRect().width));

          expect(choices).toHaveLength(2);
          expect(Math.abs(choices[0]! - choices[1]!)).toBeLessThanOrEqual(0.5);

          if (width.touch) {
            expect(choices[0]).toBe(SMALL_PX);
          }
        });
      });
    }
  }
});
