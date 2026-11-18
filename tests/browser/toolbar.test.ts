import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { HOLD_MS } from "../../app/domain/longpress";
import { BROWSER_HOOK_MS, centreOf, openTouch, touchReady } from "./touch";

import type { TouchSession } from "./touch";

import type { Browser, BrowserContext, Page } from "playwright-core";

// The rows a screen lays under the title bar, as a screen builds them, drawn by a real browser at a
// desktop's width and a phone's, in both schemes (`docs/components.md`, "Tab bar and toolbar";
// `docs/console-bundles.md`, "How a bundle mounts"): the way back stands at the toolbar's left end and
// the actions at its right; every button in the toolbar and the tab bar is the library's small one,
// centred in the row with room above and below it, and its hover fills its own rounded shape and
// nothing round it; a cell of buttons the library draws as links or the shared tooltip names keeps no
// room of words; the control that chooses every row is one pressable control whose hover is its own;
// the view switch's choices are small buttons sharing its width, walked by the arrow keys; and the zoom
// buttons beside a diagram and at the picture viewer's foot are small too. The page is built as the layer's custom elements are,
// from the components that ship. Skipped where the browser build is not on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
// The page's root is an isolated stacking context, as the component library makes a Nuxt app's root.
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/toolbar-harness.js" defer></script></head><body><div id="page" style="isolation:isolate"></div></body></html>`;

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

// The floating window the harness draws, named as a screen reader names it.
const WINDOW = "section[aria-label=Window]";

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

async function open(width: (typeof WIDTHS)[number], scheme: (typeof SCHEMES)[number], query = "", on: Browser = browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await on.newContext({ viewport: { width: width.width, height: width.height }, hasTouch: width.touch, isMobile: width.touch, colorScheme: scheme });
  const page = await context.newPage();

  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/toolbar-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/${query}`);
  await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), scheme === "dark");
  await page.waitForSelector(
    query === ""
      ? "[role=toolbar] #actions [data-slot=base]"
      : query.startsWith("?create")
        ? "#create"
        : query === "?window"
          ? WINDOW
          : query === "?icons"
            ? "#menu-opener"
            : "[role=dialog] [data-slot=footer] [data-slot=base]"
  );
  // The page eases into the scheme set as it opens, so nothing is read before its colours have settled;
  // what moves for ever, as a spinner does, is no easing and is not waited on.
  await page.evaluate(() => Promise.all(document.getAnimations().filter((animation) => animation instanceof CSSTransition).map((animation) => animation.finished.catch(() => undefined))));

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

        // The shared tooltip stands on a button through a box of its own; a cell of such named buttons is
        // still a cell of buttons, while named words beside a named button keep the room of words.
        test("keeps no room of words round a cell of buttons the shared tooltip names", async () => {
          const room = async (selector: string) => await page.$eval(selector, (cell) => [getComputedStyle(cell).paddingLeft, getComputedStyle(cell).columnGap]);

          expect(await page.$$eval("#named > *", (found) => found.map((element) => [element.tagName, element.firstElementChild?.tagName]))).toEqual([
            ["SPAN", "BUTTON"],
            ["SPAN", "BUTTON"]
          ]);
          expect(await room("#named")).toEqual(["4px", "4px"]);
          expect(await room("#named-words")).toEqual(["12px", "8px"]);
        });

        test("stands the choose-all control as one small pressable shape whose hover and press are its own", async () => {
          const shape = "#choose [data-slot=root]";

          // A row wider than a phone flows sideways, and the keyboard may have left it scrolled past the
          // control, so the control is brought into view before it is measured.
          await page.$eval(shape, (element) => element.scrollIntoView({ block: "nearest", inline: "nearest" }));

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

// An icon button under a real finger (`docs/components.md`, "Actions and the toolbar" and
// "Tooltips"). A tap presses it; a finger held past the layer's one long press names it in the shared
// tooltip and, lifting, presses nothing; the next touch anywhere puts the name away. Held for as long
// as a reader who waits to see what a control is would hold, as the layer's own icon button, a
// standing action of the group of actions and a view switch's choice showing its icon alone.
describe.skipIf(!ready)("an icon button under a finger", () => {
  // Long enough past the long press that the browser's own reading of the finger cannot fall short.
  const HELD_MS = HOLD_MS + 400;
  let touch: TouchSession;

  beforeAll(async () => {
    touch = await openTouch();
    await touch.page.route(`${ORIGIN}/**`, (route) => {
      const path = new URL(route.request().url()).pathname;

      if (path === "/toolbar-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
      if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

      return route.fulfill({ status: 404, body: "" });
    });
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await touch?.close();
  });

  async function tips(): Promise<string[]> {
    return await touch.page.$$eval("[role=tooltip]", (found) => found.map((tip) => tip.textContent ?? ""));
  }

  async function pressed(): Promise<string[]> {
    return await touch.page.evaluate(() => [...(window as unknown as { pressed: string[] }).pressed]);
  }

  async function view(): Promise<string | null> {
    return await touch.page.$eval("#icons-switch [aria-selected=true]", (element) => element.getAttribute("aria-label"));
  }

  const BUTTONS = [
    { name: "the layer's icon button", selector: "#alone", label: "Refresh" },
    { name: "a standing action of the group", selector: "#standing [aria-label=share]", label: "share" },
    { name: "a view switch's choice shown as its icon", selector: "#icons-switch [aria-label=Source]", label: "Source" }
  ];

  // Each step button stands 2 pixels in from the number box's edge and, laid out apart under a
  // finger, fills the box's whole height less that, through the tooltip's box round it.
  test("stands a number box's step buttons the box's height, inside the tooltip's box round each", async () => {
    const { page } = touch;

    await page.goto(`${ORIGIN}/?icons`);
    await page.waitForSelector("#number [aria-label=Increase]");

    const heights = await page.evaluate(() => {
      const field = document.querySelector("#number input")!.getBoundingClientRect().height;
      const steps = ["Increase", "Decrease"].map((name) => document.querySelector(`#number [aria-label=${name}]`)!.getBoundingClientRect().height);

      return { field, steps };
    });

    expect(heights.steps).toEqual([heights.field - 4, heights.field - 4]);
  });

  for (const button of BUTTONS) {
    test(`names ${button.name} under a held finger and presses it on a tap alone`, async () => {
      const { page } = touch;

      await page.goto(`${ORIGIN}/?icons`);
      await page.waitForSelector(button.selector);

      const at = await centreOf(page, button.selector);
      const before = { pressed: await pressed(), view: await view() };

      await touch.press(at, { holdMs: HELD_MS });
      await page.waitForFunction((label) => [...document.querySelectorAll("[role=tooltip]")].some((tip) => tip.textContent === label), button.label, { timeout: 3_000 });
      expect({ pressed: await pressed(), view: await view() }).toEqual(before);

      await touch.tap({ x: 2, y: page.viewportSize()!.height - 2 });
      await page.waitForFunction((label) => ![...document.querySelectorAll("[role=tooltip]")].some((tip) => tip.textContent === label), button.label, { timeout: 3_000 });

      await touch.tap(at);
      await page.waitForFunction(
        (seen) => JSON.stringify([...(window as unknown as { pressed: string[] }).pressed]) !== seen[0] || document.querySelector("#icons-switch [aria-selected=true]")?.getAttribute("aria-label") !== seen[1],
        [JSON.stringify(before.pressed), before.view],
        { timeout: 3_000 }
      );
      expect(await tips()).not.toContain(button.label);
    });
  }
});

// What an icon button opens, a popover or a menu, opened from the keyboard and closed by Esc, hands the
// focus back to the button, ringed (`docs/components.md`, "Actions and the toolbar"), as one opened from the
// library's own button does, though the library takes the tooltip's box round the button for the
// trigger.
describe.skipIf(!ready)("a popover and a menu opened from an icon button", () => {
  let context: BrowserContext;
  let page: Page;

  beforeAll(async () => {
    ({ context, page } = await open(WIDTHS[0]!, "light", "?icons"));
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await context?.close();
  });

  // The box round the button takes a focus only to pass it on: a pointer's press focuses the button
  // itself, unringed, as it does any button.
  test("leaves a pointer's press on the button the button's focus, unringed", async () => {
    await page.click("#alone");

    expect(await page.evaluate(() => ({ id: document.activeElement?.id, ringed: document.activeElement?.matches(":focus-visible") }))).toEqual({ id: "alone", ringed: false });
  });

  const OPENED = [
    { name: "a popover", opener: "popover-opener", floating: "[role=dialog]" },
    { name: "a menu", opener: "menu-opener", floating: "[role=menu]" }
  ];

  for (const opened of OPENED) {
    test(`gives the focus back to the button as ${opened.name} it opened closes on Esc`, async () => {
      await page.focus(`#${opened.opener}`);
      await page.keyboard.press("Enter");
      await page.waitForSelector(opened.floating);
      await page.waitForFunction((floating) => document.querySelector(floating)?.contains(document.activeElement) ?? false, opened.floating);

      await page.keyboard.press("Escape");
      await page.waitForSelector(opened.floating, { state: "detached" });

      // The key that closed it handed the focus back, so the button draws the keyboard's ring.
      expect(await page.evaluate(() => ({ id: document.activeElement?.id, ringed: document.activeElement?.matches(":focus-visible") }))).toEqual({ id: opened.opener, ringed: true });
    });
  }
});

// A button the host writes as markup, named by the markup button layer (`docs/components.md`,
// "Tooltips"), under a real finger, a pointer and the keyboard: a finger held on it names it in the
// shared tooltip and, lifting, presses nothing; the next touch anywhere puts the name away; a tap
// presses it, and the name the copy button's press changes comes up over it at once. The keyboard's
// focus names it as it lands, and a key's press that changes its name is heard as it changes; a
// resting pointer names it and a click's changed name comes up over it. The stylesheet draws no name
// of its own over it.
describe.skipIf(!ready)("a button written as markup under a finger, a pointer and the keyboard", () => {
  const HELD_MS = HOLD_MS + 400;
  let touch: TouchSession;

  beforeAll(async () => {
    touch = await openTouch();
    await touch.page.route(`${ORIGIN}/**`, (route) => {
      const path = new URL(route.request().url()).pathname;

      if (path === "/toolbar-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
      if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

      return route.fulfill({ status: 404, body: "" });
    });
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await touch?.close();
  });

  async function named(label: string, standing: boolean): Promise<void> {
    await touch.page.waitForFunction(
      ([words, wanted]) => [...document.querySelectorAll("[role=tooltip]")].some((tip) => tip.textContent === words) === wanted,
      [label, standing] as const,
      { timeout: 3_000 }
    );
  }

  async function pressed(): Promise<string[]> {
    return await touch.page.evaluate(() => [...(window as unknown as { pressed: string[] }).pressed]);
  }

  const BUTTONS = [
    { name: "a fenced block's copy button", selector: "button[data-copy]", label: "Copy", press: "copy", answer: "Copied" },
    { name: "a diagram's zoom button", selector: "[data-diagram-zoom=in]", label: "in", press: "in", answer: null }
  ];

  for (const button of BUTTONS) {
    test(`names ${button.name} under a held finger and presses it on a tap alone`, async () => {
      const { page } = touch;

      await page.goto(`${ORIGIN}/?markup`);
      await page.waitForSelector(button.selector);
      expect(await page.$eval(button.selector, (element) => getComputedStyle(element, "::after").content)).toBe("none");

      const at = await centreOf(page, button.selector);

      await touch.press(at, { holdMs: HELD_MS });
      await named(button.label, true);
      expect(await pressed()).toEqual([]);

      await touch.tap({ x: 2, y: page.viewportSize()!.height - 2 });
      await named(button.label, false);

      await touch.tap(at);
      await page.waitForFunction((one) => (window as unknown as { pressed: string[] }).pressed.includes(one), button.press, { timeout: 3_000 });

      if (button.answer !== null) await named(button.answer, true);
      else expect(await page.$$eval("[role=tooltip]", (found) => found.map((tip) => tip.textContent))).not.toContain(button.label);
    });
  }

  test("names a markup button under a resting pointer, puts the name away as it leaves, and brings a click's answer up", async () => {
    const { page } = touch;

    await page.goto(`${ORIGIN}/?markup`);
    await page.waitForSelector("button[data-copy]");

    const at = await centreOf(page, "button[data-copy]");

    await page.mouse.move(at.x, at.y);
    await named("Copy", true);

    await page.mouse.move(2, page.viewportSize()!.height - 2);
    await named("Copy", false);

    await page.mouse.click(at.x, at.y);
    await named("Copied", true);
  });

  // The tooltip put away and brought up again over the next button while its going is still drawn
  // is the one tooltip opening again, not a second one that puts it away as it opens.
  test("names each markup button a pointer moves on to, straight from the one before or back across a gap", async () => {
    const { page } = touch;

    await page.goto(`${ORIGIN}/?markup`);
    await page.waitForSelector("[data-diagram-zoom=out]");

    const out = await centreOf(page, "[data-diagram-zoom=out]");
    const zoomIn = await centreOf(page, "[data-diagram-zoom=in]");

    await page.mouse.move(out.x, out.y);
    await named("out", true);

    await page.mouse.move(zoomIn.x, zoomIn.y);
    await named("in", true);

    await page.mouse.move(2, page.viewportSize()!.height - 2);
    await page.mouse.move(out.x, out.y);
    await named("out", true);
  });

  // The name a screen reader hears is read off the tooltip's own box, so it is the one checked as
  // the words change under a tooltip that stands.
  test("names each markup button the keyboard's focus lands on, and says what a key's press changed it to", async () => {
    const { page } = touch;

    await page.goto(`${ORIGIN}/?markup`);
    await page.waitForSelector("button[data-copy]");

    await page.keyboard.press("Tab");
    await named("Copy", true);

    await page.keyboard.press("Enter");
    await named("Copied", true);

    await page.keyboard.press("Tab");
    await named("out", true);
    expect(await page.$$eval("[role=tooltip]", (found) => found.map((tip) => tip.textContent))).toEqual(["out"]);
  });
});

// The one button a screen creates from, in a toolbar a screen builds (`docs/components.md`,
// "Creating"): at a desktop's width a grey icon standing as the row's last cells' first, its tooltip
// naming what it creates and its key; at a phone's a primary icon floating at the screen's bottom
// right, gone from the row, with the list under it keeping room for it. Its key presses it, and does
// nothing while a field holds the typing or something floats over the screen.
describe.skipIf(!ready)("the create button drawn in a browser", () => {
  const LABEL = "New thing";
  // A browser of its own, started and taken down here, as each finger's session has its own: the one
  // the toolbar's checks share is not left standing for it after those sessions have come and gone.
  let own: Browser;

  beforeAll(async () => {
    own = await chromium.launch();
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await own?.close();
  });
  // The library's largest icon-only button, and its room from the screen's edges.
  const FLOATING_PX = 40;
  const EDGE_PX = 16;

  async function pressed(page: Page): Promise<string[]> {
    return await page.evaluate(() => [...(window as unknown as { pressed: string[] }).pressed]);
  }

  // The colour the accent paints a ground with where the floating button stands, read off the page's
  // own tokens at the step that place takes.
  async function accent(page: Page): Promise<string> {
    return await page.evaluate(() => {
      const probe = document.createElement("div");

      probe.style.background = "var(--ui-primary)";
      document.querySelector("[data-screen-foot]")!.append(probe);

      const colour = getComputedStyle(probe).backgroundColor;

      probe.remove();

      return colour;
    });
  }

  // Read once its colours have settled: the scheme is set as the page opens, and the button eases into it.
  // The contrast of the button's mark on its own fill, each colour resolved by the browser.
  async function markContrast(page: Page): Promise<number> {
    await ground(page);

    return await page.$eval("#create", (element) => {
      const rgb = (colour: string): number[] => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;

        canvas.width = canvas.height = 1;
        context.fillStyle = colour;
        context.fillRect(0, 0, 1, 1);

        return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
      };
      const luminance = (colour: string): number =>
        rgb(colour)
          .map((value) => value / 255)
          .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
          .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
      const [light, dark] = [luminance(getComputedStyle(element.querySelector("[data-slot=leadingIcon]")!).color), luminance(getComputedStyle(element).backgroundColor)].sort((a, b) => b - a);

      return (light! + 0.05) / (dark! + 0.05);
    });
  }

  async function ground(page: Page): Promise<string> {
    return await page.$eval("#create", async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished));

      return getComputedStyle(element).backgroundColor;
    });
  }

  for (const scheme of SCHEMES) {
    describe(`at a desktop's width, ${scheme}`, () => {
      let context: BrowserContext;
      let page: Page;

      beforeAll(async () => {
        ({ context, page } = await open(WIDTHS[0]!, scheme, "?create", own));
      }, BROWSER_HOOK_MS);

      afterAll(async () => {
        await context?.close();
      });

      test("stands in the toolbar as a cell of its own, the library's small square, grey and ghost", async () => {
        expect(await page.$eval("#create", (element) => element.closest("[role=toolbar]") !== null && element.closest("[role=toolbar] > *")?.parentElement?.getAttribute("role") === "toolbar")).toBe(true);
        expect(await page.$eval("#create", (element) => element.closest("[role=toolbar] > *")?.querySelectorAll("[data-slot=base]").length)).toBe(1);

        const button = await box(page, "#create");

        expect(button.width).toBe(SMALL_PX);
        expect(button.height).toBe(SMALL_PX);
        expect(await ground(page)).toBe("rgba(0, 0, 0, 0)");
        expect(await page.$eval("#create", (element) => element.getAttribute("aria-keyshortcuts"))).toBe("n");
      });

      test("names what it creates and the key that presses it in its tooltip", async () => {
        await page.hover("#create");
        await page.waitForSelector("[data-slot=kbds]");

        expect(await page.$eval("[data-slot=content]", (element) => element.textContent)).toContain(LABEL);
        expect((await page.$eval("[data-slot=kbds]", (element) => element.textContent ?? "")).trim().toLowerCase()).toBe("n");

        await page.mouse.move(0, 0);
      });

      test("is pressed by its key, and not while a field holds the typing or something floats over the screen", async () => {
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        await page.keyboard.press("n");
        expect(await pressed(page)).toEqual(["create"]);

        await page.focus("#field");
        await page.keyboard.press("n");
        expect(await page.$eval("#field", (element) => (element as HTMLInputElement).value)).toBe("n");
        expect(await pressed(page)).toEqual(["create"]);

        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        await page.evaluate(() => (window as unknown as { float: () => void }).float());
        await page.keyboard.press("n");
        expect(await pressed(page)).toEqual(["create"]);

        await page.evaluate(() => (window as unknown as { land: () => void }).land());
        await page.keyboard.press("n");
        expect(await pressed(page)).toEqual(["create", "create"]);
      });
    });

    describe(`at a phone's width, ${scheme}`, () => {
      let context: BrowserContext;
      let page: Page;

      beforeAll(async () => {
        ({ context, page } = await open(WIDTHS[1]!, scheme, "?create", own));
      }, BROWSER_HOOK_MS);

      afterAll(async () => {
        await context?.close();
      });

      test("floats at the screen's bottom right as a primary icon, nothing of it left in the row", async () => {
        expect(await page.$$eval("[role=toolbar] [aria-label='New thing']", (found) => found.length)).toBe(0);
        expect(await page.$eval("#create", (element) => element.closest("[data-screen-foot]") !== null && getComputedStyle(element.closest("[data-screen-foot]")!).position === "fixed")).toBe(true);

        const button = await box(page, "#create");
        const viewport = page.viewportSize()!;

        expect(button.width).toBe(FLOATING_PX);
        expect(button.height).toBe(FLOATING_PX);
        expect(button.right).toBe(viewport.width - EDGE_PX);
        expect(button.bottom).toBe(viewport.height - EDGE_PX);
        expect(await ground(page)).toBe(await accent(page));
      });

      test("draws its mark on its fill at 3:1 or better", async () => {
        expect(await markContrast(page)).toBeGreaterThanOrEqual(3);
      });

      test("keeps the last row of the list under it clear of it, scrolled to its end", async () => {
        await page.$eval("#list", (element) => element.scrollTo({ top: element.scrollHeight }));

        const last = await box(page, "#list .row:last-child");
        const button = await box(page, "#create");

        expect(last.bottom).toBeLessThanOrEqual(button.top);
        expect(await page.$eval("#list", (element) => getComputedStyle(element).paddingBottom)).toBe(`${FLOATING_PX + EDGE_PX}px`);
      });

      test("is pressed by a tap", async () => {
        await page.tap("#create");
        expect(await pressed(page)).toEqual(["create"]);
      });

      // The button was drawn as the app was first mounted, the way a screen opened straight from its
      // address is, and the dialog's foot stands where the button floats. A dialog takes presses from
      // the whole page behind it, so what is drawn over the foot is told by its pixels: the place the
      // two share paints the same with the button hidden as with it shown.
      test("stays under a dialog opened over it, the dialog's foot uncovered and pressed by a tap", async () => {
        const already = (await pressed(page)).length;

        await page.evaluate(() => (window as unknown as { openDialog: () => void }).openDialog());
        await page.waitForSelector("[role=dialog] #save");
        await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined))));

        const save = await box(page, "#save");
        const button = await box(page, "#create");
        const shared = { left: Math.max(save.left, button.left), right: Math.min(save.right, button.right), top: Math.max(save.top, button.top), bottom: Math.min(save.bottom, button.bottom) };

        expect(shared.left < shared.right && shared.top < shared.bottom).toBe(true);

        const clip = { x: shared.left, y: shared.top, width: shared.right - shared.left, height: shared.bottom - shared.top };
        const shown = await page.screenshot({ clip });

        await page.$eval("[data-screen-foot]", (element) => ((element as HTMLElement).style.visibility = "hidden"));
        const hidden = await page.screenshot({ clip });

        await page.$eval("[data-screen-foot]", (element) => ((element as HTMLElement).style.visibility = ""));
        expect(shown.equals(hidden)).toBe(true);

        await page.touchscreen.tap(clip.x + clip.width / 2, clip.y + clip.height / 2);
        expect((await pressed(page)).slice(already)).toEqual(["save"]);
      });
    });
  }
});

// A form's dialog, as the layer's settings dialog draws it with a long body and two buttons at its foot
// (`docs/components.md`, "Floating things"): its head, body and foot keep one padding on every side at
// a wide desktop's width and a phone's alike, so the foot's last button stands as far from the dialog's
// right edge as from its bottom, and the body starts on the title's line.
describe.skipIf(!ready)("a dialog drawn in a browser", () => {
  const PADDING_PX = 16;
  const DIALOG_WIDTHS = [{ ...WIDTHS[0]!, name: "a wide desktop's width", width: 1440, height: 900 }, WIDTHS[1]!];
  let own: Browser;

  beforeAll(async () => {
    own = await chromium.launch();
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await own?.close();
  });

  for (const width of DIALOG_WIDTHS) {
    describe(`at ${width.name}`, () => {
      let context: BrowserContext;
      let page: Page;

      beforeAll(async () => {
        ({ context, page } = await open(width, "light", "?create", own));
        await page.evaluate(() => (window as unknown as { openDialog: () => void }).openDialog());
        await page.waitForSelector("[role=dialog] #save");
        await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
      }, BROWSER_HOOK_MS);

      afterAll(async () => {
        await context?.close();
      });

      test("keeps one padding on every side of its head, body and foot", async () => {
        for (const slot of ["header", "body", "footer"]) {
          const padding = await page.$eval(`[role=dialog] [data-slot=${slot}]`, (element) => {
            const style = getComputedStyle(element);

            return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft];
          });

          expect(padding).toEqual(Array(4).fill(`${PADDING_PX}px`));
        }
      });

      test("stands the foot's last button as far from the right edge as from the bottom, and the body on the title's line", async () => {
        const dialog = await box(page, "[role=dialog]");
        const save = await box(page, "[role=dialog] #save");
        const title = await box(page, "[role=dialog] [data-slot=title]");
        const body = await box(page, "[role=dialog] [data-slot=body] > *");

        expect(dialog.right - save.right).toBe(PADDING_PX);
        expect(dialog.bottom - save.bottom).toBe(PADDING_PX);
        expect(title.left - dialog.left).toBe(PADDING_PX);
        expect(body.left).toBe(title.left);
      });
    });
  }
});

// A menu wrapped round the create button, handed the create button module's settings
// (`docs/components.md`, "Creating"): it opens against the button itself, at its end edge and inside
// the screen, at a desktop's width where the button stands in the row and at a phone's where it floats,
// opened by a press of the button and by its key alike, and it hands the focus back to the button as it
// closes. A menu round a create button marked as contained does the same against the row's grey icon
// at both widths, opened by a press alone, since a contained button answers no key.
describe.skipIf(!ready)("a menu wrapped round the create button, drawn in a browser", () => {
  // The room the library's menu keeps from the screen's edges, which may move it in from the button's
  // end edge where the button stands closer to the edge than that.
  const COLLISION_PX = 8;
  let own: Browser;

  beforeAll(async () => {
    own = await chromium.launch();
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await own?.close();
  });

  for (const width of WIDTHS) {
    describe(`at ${width.name}`, () => {
      let context: BrowserContext;
      let page: Page;

      beforeAll(async () => {
        ({ context, page } = await open(width, "light", "?create-menu", own));
      }, BROWSER_HOOK_MS);

      afterAll(async () => {
        await context?.close();
      });

      const press = (selector: string) => () => (width.touch ? page.tap(selector) : page.click(selector));

      // Each opening starts with the focus nowhere, so the focus the menu hands back is the menu's doing.
      // The screen's button floats at a phone's foot, so its menu opens above it there; a button in a row
      // near the screen's top has its menu open below it.
      const OPENINGS = [
        { name: "a press", button: "the screen's button", id: "create", above: width.touch, open: press("#create") },
        { name: "its key", button: "the screen's button", id: "create", above: width.touch, open: () => page.keyboard.press("n") },
        { name: "a press", button: "a contained button", id: "contained-create", above: false, open: press("#contained-create") }
      ];

      for (const opening of OPENINGS) {
        test(`opens on ${opening.name} against ${opening.button} at its end edge, inside the screen, and gives the focus back as it closes`, async () => {
          await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
          await opening.open();
          await page.waitForSelector("[role=menu]");
          await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined))));

          const menu = await box(page, "[role=menu]");
          const button = await box(page, `#${opening.id}`);
          const viewport = page.viewportSize()!;

          expect(menu.right).toBeLessThanOrEqual(button.right + 0.5);
          expect(menu.right).toBeGreaterThanOrEqual(button.right - COLLISION_PX);
          expect(menu.left).toBeGreaterThanOrEqual(0);
          expect(menu.top).toBeGreaterThanOrEqual(0);
          expect(menu.bottom).toBeLessThanOrEqual(viewport.height);

          if (opening.above) {
            expect(menu.bottom).toBeLessThanOrEqual(button.top);
          } else {
            expect(menu.top).toBeGreaterThanOrEqual(button.bottom);
          }

          await page.keyboard.press("Escape");
          await page.waitForSelector("[role=menu]", { state: "detached" });

          expect(await page.evaluate(() => document.activeElement?.id)).toBe(opening.id);
        });
      }
    });
  }
});

// The create button inside containers that are no screen (`docs/components.md`, "Creating"): a
// sidebar's and a drawer's, each marked as contained, stand as their row's grey icon at every width and
// are pressed where they stand, the sidebar's leaving nothing on a phone where the sidebar is hidden,
// and the screen's own button, floating or in its row, is drawn under a dialog's overlay.
describe.skipIf(!ready)("the create button inside a container that is no screen, drawn in a browser", () => {
  let own: Browser;

  beforeAll(async () => {
    own = await chromium.launch();
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await own?.close();
  });

  async function pressed(page: Page): Promise<string[]> {
    return await page.evaluate(() => [...(window as unknown as { pressed: string[] }).pressed]);
  }

  // Whether a contained button stands as its row's grey icon: the layer's icon button as it stands in
  // that row, the one beside it, ghost, floating nowhere and answering no key.
  async function inRow(page: Page, selector: string): Promise<void> {
    const button = await box(page, selector);
    const beside = await box(page, `${selector}-beside`);

    expect(button.width).toBe(beside.width);
    expect(button.height).toBe(beside.height);
    expect(button.top).toBe(beside.top);
    expect(await page.$eval(selector, (element) => element.closest("[data-screen-foot]"))).toBeNull();
    expect(await page.$eval(selector, (element) => getComputedStyle(element).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    expect(await page.$eval(selector, (element) => element.getAttribute("aria-keyshortcuts"))).toBeNull();
  }

  // The element a press at the middle of an element lands on.
  async function landsOn(page: Page, selector: string): Promise<boolean> {
    return await page.$eval(selector, (element) => {
      const rect = element.getBoundingClientRect();

      return element.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
    });
  }

  // What a button paints inside its edge, clear of its rounded corners, where an overlay drawn above
  // it changes every pixel and one drawn under it changes none.
  async function insideOf(page: Page, selector: string): Promise<{ x: number; y: number; width: number; height: number }> {
    const button = await box(page, selector);
    const INSET_PX = 6;

    return { x: button.left + INSET_PX, y: button.top + INSET_PX, width: button.width - 2 * INSET_PX, height: button.height - 2 * INSET_PX };
  }

  async function settled(page: Page): Promise<void> {
    await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
  }

  for (const width of WIDTHS) {
    describe(`at ${width.name}`, () => {
      let context: BrowserContext;
      let page: Page;

      beforeEach(async () => {
        ({ context, page } = await open(width, "light", "?create-contained", own));
      }, BROWSER_HOOK_MS);

      afterEach(async () => {
        await context?.close();
      });

      test(width.touch ? "leaves nothing of the hidden sidebar's button, the screen's alone floating" : "stands the sidebar's button as its row's grey icon, pressed where it stands", async () => {
        expect(await page.$$eval("[data-screen-foot]", (found) => found.length)).toBe(width.touch ? 1 : 0);

        if (width.touch) {
          expect(await page.isVisible("#room-create")).toBe(false);
          expect(await page.$eval("[data-screen-foot]", (element) => element.querySelector("#create") !== null)).toBe(true);
        } else {
          await inRow(page, "#room-create");
          expect(await page.$eval("#room-create", (element) => element.closest("#sidebar") !== null)).toBe(true);
          await page.click("#room-create");
          expect(await pressed(page)).toEqual(["room-create"]);
        }
      });

      test("stands a drawer's button as its row's grey icon, pressed there by a tap or a click", async () => {
        await page.evaluate(() => (window as unknown as { openDrawer: () => void }).openDrawer());
        await page.waitForSelector("[role=dialog] #drawer-create");
        await settled(page);

        await inRow(page, "#drawer-create");
        expect(await page.$$eval("[data-screen-foot]", (found) => found.length)).toBe(width.touch ? 1 : 0);
        expect(await landsOn(page, "#drawer-create")).toBe(true);

        await (width.touch ? page.tap("#drawer-create") : page.click("#drawer-create"));
        expect(await pressed(page)).toEqual(["drawer-create"]);
      });

      test("answers the screen's key with the screen's button alone", async () => {
        await page.keyboard.press("n");
        expect(await pressed(page)).toEqual(["create"]);
      });

      test("draws the screen's button under a dialog's overlay", async () => {
        const inside = await insideOf(page, "#create");
        const before = await page.screenshot({ clip: inside });

        expect(await landsOn(page, "#create")).toBe(true);

        await page.evaluate(() => (window as unknown as { openDialog: () => void }).openDialog());
        await page.waitForSelector("[role=dialog]");
        await settled(page);

        expect((await page.screenshot({ clip: inside })).equals(before)).toBe(false);
        expect(await landsOn(page, "#create")).toBe(false);
      });
    });
  }
});

// A floating window drawn as the app is first mounted, the way a screen opened straight from its
// address draws it (`docs/components.md`, "A window beside the page"): it stands in the app's own
// root, after the screens, so a dialog opened later covers it.
describe.skipIf(!ready)("a floating window drawn as the app is first mounted, in a browser", () => {
  let context: BrowserContext;
  let page: Page;

  beforeAll(async () => {
    ({ context, page } = await open(WIDTHS[0]!, "light", "?window"));
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await context?.close();
  });

  test("stands in the app's root, under a dialog opened over it", async () => {
    await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
    expect(await page.$eval(WINDOW, (element) => element.parentElement?.id)).toBe("page");

    const drawn = await box(page, WINDOW);
    const clip = { x: drawn.left + drawn.width / 4, y: drawn.top + drawn.height / 2, width: drawn.width / 2, height: 8 };
    const before = await page.screenshot({ clip });

    await page.evaluate(() => (globalThis as unknown as { openDialog: () => void }).openDialog());
    await page.waitForSelector("div[role=dialog]");
    await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined))));

    expect((await page.screenshot({ clip })).equals(before)).toBe(false);
  });
});
