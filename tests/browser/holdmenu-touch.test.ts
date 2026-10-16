import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { BROWSER_HOOK_MS, openTouch, touchReady } from "./touch";

// A menu a held finger opens, under a real finger (`docs/components.md`, "A held finger"). A
// finger resting on a row asks for the menu over it, its words selected by a mouse and never by the
// finger; a finger that moves while it is held — a slide past a phone's touch distance, a scroll
// that sets off slowly and stops with the finger still down — asks for nothing; and a menu a hold
// already asked for is not taken back by the drag that follows. None of it can be checked from a
// dispatched event, because what decides it is the browser's own reading of the finger: which
// moves it reports, and when it takes the touch away for a scroll.
//
// Skipped where the browser build is not on the machine, as every touch check is.

const ready = touchReady();

async function bundle(): Promise<string> {
  const built = await Bun.build({
    entrypoints: [new URL("./holdmenu-harness.ts", import.meta.url).pathname],
    target: "browser",
    define: {
      "process.env.NODE_ENV": '"production"',
      __VUE_OPTIONS_API__: "false",
      __VUE_PROD_DEVTOOLS__: "false",
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false"
    }
  });

  return (await built.outputs.find((output) => output.kind === "entry-point")?.text()) ?? "";
}

// Tall rows, so a finger aimed at one lands on it alone, and many more than the box shows, so there
// is always somewhere to scroll to.
const ROW_HEIGHT = 60;
const ROWS = 20;
const BOX_HEIGHT = 420;
// The middle of the second row, where every finger here lands.
const AT = { x: 180, y: ROW_HEIGHT * 1.5 };
// The same row's words, which stand at its start.
const WORDS = { x: 8, y: AT.y };

let script = "";
let touch: Awaited<ReturnType<typeof openTouch>>;

async function mount(): Promise<void> {
  const { page } = touch;

  await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body { margin: 0; font: 16px sans-serif; }</style>
    <div id="box"></div>`);
  await page.addScriptTag({
    type: "module",
    content: `${script}
      window.menu = mountHoldMenu(document.getElementById("box"), { rows: ${ROWS}, rowHeight: ${ROW_HEIGHT}, height: ${BOX_HEIGHT} });`
  });
  await page.waitForFunction(() => "menu" in window);
  await page.waitForSelector("[data-row]");
}

// Whether the second row's words can be selected now. This browser never selects on a held finger
// of its own, as a phone does, so what is read is whether the words would be open to it.
async function selectable(): Promise<boolean> {
  return await touch.page.evaluate(() => getComputedStyle(document.querySelector("[data-row='r2']")!).userSelect !== "none");
}

// The words a press left selected on the page.
async function selected(): Promise<string> {
  return await touch.page.evaluate(() => window.getSelection()?.toString() ?? "");
}

async function seen(): Promise<{ menus: string[]; clicks: string[] }> {
  return (await touch.page.evaluate(() => {
    const menu = (window as unknown as { menu: { menus: () => string[]; clicks: () => string[] } }).menu;

    return { menus: menu.menus(), clicks: menu.clicks() };
  })) as { menus: string[]; clicks: string[] };
}

describe.skipIf(!ready)("a menu a held finger opens", () => {
  beforeAll(async () => {
    script = await bundle();
    touch = await openTouch({ reducedMotion: "reduce" });
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await touch?.close();
  }, BROWSER_HOOK_MS);

  test("opens over the row a still finger rests on, and a tap is still a tap", async () => {
    await mount();

    await touch.press(AT, { holdMs: 800 });
    expect((await seen()).menus).toEqual(["r2"]);

    await mount();
    await touch.tap(AT);
    expect(await seen()).toEqual({ menus: [], clicks: ["r2"] });
  }, 60_000);

  test("selects no words under a finger, and leaves them to a mouse", async () => {
    await mount();
    expect(await selectable()).toBe(true);

    await touch.press(WORDS, { holdMs: 800 });
    expect((await seen()).menus).toEqual(["r2"]);
    expect(await selectable()).toBe(false);

    const { mouse } = touch.page;

    await mouse.move(WORDS.x - 6, WORDS.y);
    await mouse.down();
    await mouse.move(WORDS.x + 40, WORDS.y, { steps: 4 });
    await mouse.up();
    expect(await selected()).toContain("r2");
  }, 60_000);

  test("is not asked for by a finger that moves while it is held", async () => {
    await mount();

    // A slide past a phone's touch distance, then still.
    await touch.swipe(AT, { x: AT.x, y: AT.y - 14 }, { steps: 7, pauseMs: 30, restMs: 800 });
    // A scroll that sets off slowly and stops with the finger still down.
    await touch.swipe({ x: AT.x, y: AT.y + 120 }, { x: AT.x, y: AT.y }, { steps: 12, pauseMs: 50, restMs: 800 });
    expect((await seen()).menus).toEqual([]);
    expect(await touch.page.evaluate(() => document.querySelector("[data-row]")?.parentElement?.scrollTop ?? 0)).toBeGreaterThan(0);
  }, 60_000);

  test("and a menu a hold asked for stays asked for while the finger drags on", async () => {
    await mount();

    await touch.swipe(AT, { x: AT.x, y: AT.y + 180 }, { holdMs: 800, steps: 12, pauseMs: 30 });
    expect((await seen()).menus).toEqual(["r2"]);
  }, 60_000);
});
