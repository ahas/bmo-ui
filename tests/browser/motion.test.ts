import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";
import type { Seen } from "./motion-harness";

// How a moving list and a tab's panel move, frame by frame, under the layer's own stylesheet
// (`docs/design.md`, "Motion"). A list narrowed, added to or reordered moves its items up and down
// and nothing else: no item fades, none moves sideways, every one starts in the same frame and ends
// where the list lays it out. A tab's panels slide sideways together, in the tab order's direction,
// with nothing between them and nothing fading; a panel replaced with the tab standing where it was
// stands at once. Only the browser's own drawing can say any of it.
//
// The movements run at a shorter length than the layer's, set on the page, so a run costs a
// fraction of a second and still draws several frames of each. Skipped where the browser build is
// not on the machine, as every browser check is.

const ready = touchReady();
const LENGTH = "160ms";

async function bundle(): Promise<string> {
  const built = await Bun.build({
    entrypoints: [new URL("./motion-harness.ts", import.meta.url).pathname],
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

let browser: Browser;
let page: Page;

beforeAll(async () => {
  if (!ready) return;

  const [script, css] = await Promise.all([bundle(), Bun.file(new URL("../../app/assets/css/main.css", import.meta.url)).text()]);

  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 400, height: 600 } });
  // An item takes its size from the stylesheet and stands at its own height, as a host's do:
  // its box is the hooks' to set while it comes and goes.
  await page.setContent(`<style>
    body { margin: 0; font: 16px sans-serif; }
    li[data-box] { box-sizing: border-box; padding: 8px; border: 1px solid #888; line-height: 22px; }
  </style><div id="box"></div>`);
  // The stylesheet as the layer ships it; what the browser cannot read of it (the framework's own
  // imports and at-rules) is dropped, and the rules this reads are plain CSS.
  await page.addStyleTag({ content: css });
  await page.addStyleTag({ content: `:root { --bmo-motion-unfold: ${LENGTH}; }` });
  await page.addScriptTag({
    type: "module",
    content: `${script}
      window.motion = mountMotion(document.getElementById("box"), { items: ["a", "b", "c", "d", "e"], tab: { at: 0, key: "t0" } });`
  });
  await page.waitForFunction(() => "motion" in window);
  await page.waitForSelector("[data-box]");
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();
});

type Change = { items: string[] } | { tab: { at: number; key: string } };

// Makes one change and hands back every frame drawn from it until nothing moves.
async function frames(change: Change): Promise<Seen[]> {
  return (await page.evaluate(async (change) => {
    const motion = (window as unknown as { motion: import("./motion-harness").MotionPage }).motion;

    motion.record();
    if ("items" in change) motion.setItems(change.items);
    else motion.setTab(change.tab.at, change.tab.key);

    return await motion.settled();
  }, change)) as Seen[];
}

// One box's course through the frames it stands in.
function course(seen: Seen[], key: string): { frame: number; left: number; top: number; height: number; opacity: number }[] {
  return seen.flatMap((one) => (one.boxes[key] === undefined ? [] : [{ frame: one.frame, ...one.boxes[key]! }]));
}

function monotonic(values: number[]): boolean {
  const steps = values.slice(1).map((value, at) => value - values[at]!);

  return steps.every((step) => step >= 0) || steps.every((step) => step <= 0);
}

// The frame a value first leaves where it stood in the first frame.
function startOf(values: number[]): number {
  return values.findIndex((value) => value !== values[0]);
}

function nothingFades(seen: Seen[]): void {
  for (const one of seen) {
    for (const [key, box] of Object.entries(one.boxes)) {
      expect(box.opacity, `${key} in frame ${one.frame}`).toBe(1);
    }
  }
}

describe.skipIf(!ready)("a moving list", () => {
  test("narrowed and added to, folds and unfolds its items in place, all at once, with no fade", async () => {
    const seen = await frames({ items: ["a", "c", "x", "e"] });
    const last = seen.at(-1)!.boxes;
    const top = last.a!.top;

    nothingFades(seen);

    // Up and down alone.
    for (const key of ["a", "b", "c", "d", "e", "x"]) {
      expect(new Set(course(seen, key).map((one) => one.left)).size, key).toBe(1);
    }

    // The two going fold to nothing and are gone; the one coming unfolds from nothing.
    for (const key of ["b", "d"]) {
      const heights = course(seen, key).map((one) => one.height);

      expect(monotonic(heights), key).toBe(true);
      expect(Math.min(...heights), key).toBeLessThan(5);
      expect(last[key], key).toBeUndefined();
    }

    const coming = course(seen, "x").map((one) => one.height);

    // The first frame is drawn some way into the movement, so it is short of the full height rather
    // than at nothing, and the frames after it pass through several heights on the way.
    expect(monotonic(coming)).toBe(true);
    expect(coming[0]).toBeLessThan(40);
    expect(new Set(coming).size).toBeGreaterThan(3);
    expect(coming.at(-1)).toBe(40);

    // The one moving up passes through the frames between rather than jumping, and nothing waits
    // for anything else to begin.
    const e = course(seen, "e").map((one) => one.top);

    expect(monotonic(e)).toBe(true);
    expect(new Set(e).size).toBeGreaterThan(3);

    const starts = [
      startOf(course(seen, "b").map((one) => one.height)),
      startOf(course(seen, "d").map((one) => one.height)),
      startOf(coming),
      startOf(e)
    ];

    expect(Math.max(...starts) - Math.min(...starts)).toBeLessThanOrEqual(1);

    // Where it ends is where the list lays it out, its gap included: nothing jumps at the end.
    expect(["a", "c", "x", "e"].map((key) => last[key]!.top - top)).toEqual([0, 44, 88, 132]);
  });

  test("reordered, slides its items to their new places up and down alone, with no fade", async () => {
    const seen = await frames({ items: ["e", "a", "c", "x"] });
    const last = seen.at(-1)!.boxes;
    const top = last.e!.top;

    nothingFades(seen);

    for (const key of ["e", "a", "c"]) {
      const steps = course(seen, key);

      expect(new Set(steps.map((one) => one.left)).size, key).toBe(1);
      expect(monotonic(steps.map((one) => one.top)), key).toBe(true);
      expect(new Set(steps.map((one) => one.top)).size, key).toBeGreaterThan(3);
    }

    expect(["e", "a", "c", "x"].map((key) => last[key]!.top - top)).toEqual([0, 44, 88, 132]);
  });
});

describe.skipIf(!ready)("a tab's panel", () => {
  // Both panels sideways alone, in one direction, side by side with nothing between and nothing over.
  function slides(seen: Seen[], from: string, to: string, way: 1 | -1): void {
    const leaving = course(seen, from);
    const coming = course(seen, to);

    nothingFades(seen);
    // The new panel ends exactly where the old one stood.
    expect(coming.at(-1)!.left).toBe(leaving[0]!.left);
    expect(new Set([...leaving, ...coming].map((one) => one.top)).size).toBe(1);
    expect(monotonic(leaving.map((one) => one.left))).toBe(true);
    expect(monotonic(coming.map((one) => one.left))).toBe(true);
    expect(new Set(coming.map((one) => one.left)).size).toBeGreaterThan(3);
    // Forward, the new panel comes in from the right and the old leaves to the left; back, the reverse.
    expect(Math.sign(coming[0]!.left - coming.at(-1)!.left)).toBe(way);

    for (const one of seen) {
      const old = one.boxes[from];
      const now = one.boxes[to];

      if (old !== undefined && now !== undefined) {
        expect(Math.abs(Math.abs(now.left - old.left) - 300), `frame ${one.frame}`).toBeLessThanOrEqual(1);
      }
    }
  }

  test("slides in from the side its tab stands on, the old one leaving to the other, together", async () => {
    slides(await frames({ tab: { at: 1, key: "t1" } }), "t0", "t1", 1);
    slides(await frames({ tab: { at: 0, key: "t0" } }), "t1", "t0", -1);
  });

  test("replaced with its tab standing where it was, stands at once", async () => {
    const seen = await frames({ tab: { at: 0, key: "t0-elsewhere" } });

    expect(seen[0]!.boxes.t0).toBeUndefined();
    expect(new Set(course(seen, "t0-elsewhere").map((one) => one.left)).size).toBe(1);
  });
});
