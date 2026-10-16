import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { BROWSER_HOOK_MS, openTouch, touchReady } from "./touch";

// The choosing gesture under a real finger (`docs/components.md`, "A held finger"). A hold, a drag
// over the rows it passes, a lift, a scroll, and a hold again — and the second hold is the one this
// stands for: a selection is built in as many holds as the reader needs, not in the single sweep
// the first one began. None of it can be checked from a dispatched event, because what decides it
// is the browser's own reading of a press: how far a finger may wander and still be resting, and
// when a drag is a scroll it takes the stream away for.
//
// The page is the gesture alone rather than a screen, so nothing a screen does can stand in for the
// mechanism or hide it.
//
// Skipped where the browser build is not on the machine, as every touch check is.

const ready = touchReady();

async function bundle(): Promise<string> {
  const built = await Bun.build({
    entrypoints: [new URL("./dragselect-harness.ts", import.meta.url).pathname],
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

// The rows are tall enough that a finger aimed at one lands on it and nothing else, and the box
// holds seven of them with as many again below, so there is always somewhere left to scroll to.
const ROW_HEIGHT = 60;
const ROWS = 16;
const BOX_HEIGHT = 420;
// How far down the list is put before it is held a second time: six rows, so what was chosen first
// is out of sight.
const SCROLLED_ROWS = 6;
// The rows a finger is aimed at, which are the ones standing clear of the bands the list scrolls
// itself in — a drag that ends inside one goes on choosing while the list carries it along.
const FROM = 1;
const TO = 3;
const BEYOND = 4;

let script = "";
let touch: Awaited<ReturnType<typeof openTouch>>;

interface Row {
  key: string;
  mid: number;
}

async function mount(reserveChosen: boolean): Promise<void> {
  const { page } = touch;

  await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1">
    <style>body { margin: 0; font: 16px sans-serif; }</style>
    <div id="box"></div>`);
  await page.addScriptTag({
    type: "module",
    content: `${script}
      window.list = mountDragList(document.getElementById("box"), { rows: ${ROWS}, rowHeight: ${ROW_HEIGHT}, height: ${BOX_HEIGHT}, reserveChosen: ${reserveChosen} });`
  });
  await page.waitForFunction(() => "list" in window);
  await page.waitForSelector("[data-row]");
}

// The rows standing in the box now, with the height a finger aimed at each would land on.
async function rows(): Promise<Row[]> {
  return (await touch.page.evaluate((height) =>
    [...document.querySelectorAll("[data-row]")]
      .map((row) => {
        const box = row.getBoundingClientRect();

        return { key: row.getAttribute("data-row") ?? "", top: box.top, mid: box.top + box.height / 2, bottom: box.bottom };
      })
      .filter((row) => row.top >= 0 && row.bottom <= height), BOX_HEIGHT
  )) as Row[];
}

async function chosen(): Promise<string[]> {
  return (await touch.page.evaluate(() => (window as unknown as { list: { chosen: () => string[] } }).list.chosen())) as string[];
}

describe.skipIf(!ready)("choosing rows with a held finger", () => {
  beforeAll(async () => {
    script = await bundle();
    touch = await openTouch({ reducedMotion: "reduce" });
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await touch?.close();
  }, BROWSER_HOOK_MS);

  test("a hold chooses the row under the finger, and the drag from it takes every row it passes", async () => {
    await mount(false);

    const standing = await rows();

    await touch.swipe({ x: 180, y: (standing[FROM] as Row).mid }, { x: 180, y: (standing[TO] as Row).mid }, { holdMs: 800, steps: 6, pauseMs: 40 });

    expect((await chosen()).sort()).toEqual(["r2", "r3", "r4"]);
  }, 60_000);

  test("and a list already choosing is held again, with the drag carrying on from there", async () => {
    await mount(false);

    let standing = await rows();

    await touch.swipe({ x: 180, y: (standing[FROM] as Row).mid }, { x: 180, y: (standing[FROM + 1] as Row).mid }, { holdMs: 800, steps: 4, pauseMs: 40 });
    expect((await chosen()).sort()).toEqual(["r2", "r3"]);

    // Scrolled away from what was chosen, and held again down there.
    await touch.page.evaluate((down) => {
      const box = document.querySelector("[data-row]")?.parentElement;

      if (box !== null && box !== undefined) box.scrollTop = down;
    }, SCROLLED_ROWS * ROW_HEIGHT);
    await touch.page.waitForTimeout(200);

    standing = await rows();

    await touch.swipe({ x: 180, y: (standing[FROM] as Row).mid }, { x: 180, y: (standing[TO] as Row).mid }, { holdMs: 800, steps: 6, pauseMs: 40 });

    // What was chosen before stays, and the second hold's own run is chosen beside it.
    expect((await chosen()).sort()).toEqual(["r10", "r2", "r3", "r8", "r9"]);
  }, 60_000);

  test("a fingertip settling as it lands is still holding, and a finger that moves while held is not", async () => {
    await mount(false);

    const standing = await rows();
    const row = standing[FROM] as Row;

    await touch.swipe({ x: 180, y: row.mid }, { x: 180, y: row.mid + 2 }, { holdMs: 800, wobblePx: 6, steps: 2, pauseMs: 40 });
    expect(await chosen()).toEqual(["r2"]);

    // A slide past a phone's touch distance while it waits ends the press.
    await mount(false);
    await touch.swipe({ x: 180, y: row.mid }, { x: 180, y: row.mid + 2 }, { holdMs: 800, wobblePx: 16, steps: 2, pauseMs: 40 });
    expect(await chosen()).toEqual([]);

    // So does a scroll that sets off slowly and stops with the finger still down: the list moved
    // under it, so it is scrolling however still it then stands.
    await touch.swipe({ x: 180, y: row.mid }, { x: 180, y: row.mid - 30 }, { steps: 15, pauseMs: 50, restMs: 800 });
    expect(await chosen()).toEqual([]);
  }, 60_000);

  test("and where the screen keeps the hold on a chosen row for the browser, the list does not take it", async () => {
    await mount(true);

    const standing = await rows();
    const held = standing[FROM] as Row;
    const other = standing[TO] as Row;

    await touch.swipe({ x: 180, y: held.mid }, { x: 180, y: held.mid + 2 }, { holdMs: 800, steps: 2, pauseMs: 40 });
    expect(await chosen()).toEqual(["r2"]);

    // Held again on that same row: its words are the browser's there, so nothing is chosen by the
    // drag that follows.
    await touch.swipe({ x: 180, y: held.mid }, { x: 180, y: other.mid }, { holdMs: 800, steps: 6, pauseMs: 40 });
    expect(await chosen()).toEqual(["r2"]);

    // A row it has not chosen is still the list's, and the drag from it runs.
    await touch.swipe({ x: 180, y: other.mid }, { x: 180, y: (standing[BEYOND] as Row).mid }, { holdMs: 800, steps: 4, pauseMs: 40 });
    expect((await chosen()).sort()).toEqual(["r2", "r4", "r5"]);
  }, 60_000);

  test("a finger that stops a gliding list holds nothing, and pressed again on the list standing it holds", async () => {
    await mount(false);

    // The list set gliding the way a flick leaves it: moving a little every frame on its own until a
    // finger lands, which is what stops it. A real flick is the browser's to carry on or not, so the
    // glide is the page's own and stops exactly where a finger stops one.
    await touch.page.evaluate(() => {
      const box = document.querySelector("[data-row]")?.parentElement;
      let gliding = true;

      window.addEventListener("touchstart", () => (gliding = false), { capture: true, once: true });

      const step = (): void => {
        if (!gliding || box === null || box === undefined) return;
        box.scrollTop += 3;
        requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    });
    await touch.page.waitForTimeout(150);

    const gliding = await rows();

    await touch.press({ x: 180, y: (gliding[FROM] as Row).mid }, { holdMs: 800 });
    expect(await chosen()).toEqual([]);

    const standing = await rows();
    const row = standing[FROM] as Row;

    await touch.press({ x: 180, y: row.mid }, { holdMs: 800 });
    expect(await chosen()).toEqual([row.key]);
  }, 60_000);

  test("a row the drag took and gave back is taken again by one tap, however soon the tap comes", async () => {
    await mount(false);

    const standing = await rows();
    const at = (index: number): { x: number; y: number } => ({ x: 180, y: (standing[index] as Row).mid });

    // Down over three rows and back up over the last, which the drag gives up again.
    await touch.swipe(at(FROM), at(FROM + 1), { holdMs: 800, steps: 4, pauseMs: 40, via: at(TO) });
    expect((await chosen()).sort()).toEqual(["r2", "r3"]);

    // One tap on the row given back takes it, straight after the lift and again after a while.
    await touch.tap(at(TO));
    await touch.page.waitForTimeout(100);
    expect((await chosen()).sort()).toEqual(["r2", "r3", "r4"]);

    await touch.page.waitForTimeout(800);
    await touch.tap(at(TO));
    await touch.page.waitForTimeout(100);
    expect((await chosen()).sort()).toEqual(["r2", "r3"]);

    // A drag that runs off the foot of the list and lifts out there leaves nothing behind either:
    // the first tap on a row after it turns that row over.
    await touch.swipe(at(BEYOND), { x: 180, y: BOX_HEIGHT + 60 }, { holdMs: 800, steps: 4, pauseMs: 40 });

    const after = await rows();
    const tapped = after[FROM] as Row;
    const was = (await chosen()).includes(tapped.key);

    await touch.tap({ x: 180, y: tapped.mid });
    await touch.page.waitForTimeout(100);
    expect((await chosen()).includes(tapped.key)).toBe(!was);
  }, 60_000);
});
