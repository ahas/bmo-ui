import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";
import type { Seen } from "./arrival-harness";

// How a moving list fills and how it stands while the page around it moves (`docs/design.md`, "Motion"): the
// first page read into an empty list, or read afresh in place of everything it held, fades in where it stands, its
// top item first and each next one a step after, moving and unfolding none; and a change that moves the whole list down the page, a head above it growing in the same change,
// slides none of its items, since each stands where it stood within the list. Only the browser's own drawing can
// say it. Lengths are shortened on the page so a run costs a fraction of a second; skipped where the browser build
// is not on the machine.

const ready = touchReady();

async function bundle(): Promise<string> {
  const built = await Bun.build({
    entrypoints: [new URL("./arrival-harness.ts", import.meta.url).pathname],
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
  await page.setContent(`<style>
    body { margin: 0; font: 16px sans-serif; }
    li[data-box] { box-sizing: border-box; padding: 8px; border: 1px solid #888; line-height: 22px; }
  </style><div id="box"></div>`);
  await page.addStyleTag({ content: css });
  await page.addStyleTag({ content: ":root { --bmo-motion-unfold: 160ms; --bmo-motion-stagger: 30ms; }" });
  await page.addScriptTag({ type: "module", content: `${script}\n window.arrival = mountArrival(document.getElementById("box"));` });
  await page.waitForFunction(() => "arrival" in window);
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();
});

async function change(head: number, keys: string[]): Promise<Seen[]> {
  return page.evaluate(
    async ({ head, keys }) => {
      const arrival = (window as unknown as { arrival: import("./arrival-harness").ArrivalPage }).arrival;

      arrival.record();
      await new Promise((done) => requestAnimationFrame(() => done(null)));
      arrival.set(head, keys);

      return arrival.settled();
    },
    { head, keys }
  );
}

describe.skipIf(!ready)("a moving list", () => {
  test("filled from empty fades in from its top item down, each where it stands", async () => {
    const frames = await change(40, ["a", "b", "c", "d"]);
    const drawn = frames.filter((frame) => Object.keys(frame.boxes).length === 4);
    const last = drawn.at(-1)!;
    // The first frame each item was drawn more than half opaque.
    const half = (key: string): number => drawn.findIndex((frame) => frame.boxes[key]!.opacity > 0.5);

    expect(drawn.some((frame) => frame.boxes.d!.opacity < 1)).toBe(true);
    expect(half("a")).toBeLessThanOrEqual(half("b"));
    expect(half("b")).toBeLessThanOrEqual(half("c"));
    expect(half("a")).toBeLessThan(half("d"));

    // No item moves or changes size while it fades.
    for (const key of ["a", "b", "c", "d"]) {
      expect(new Set(drawn.map((frame) => `${frame.boxes[key]!.top}:${frame.boxes[key]!.height}`)).size).toBe(1);
      expect(last.boxes[key]!.opacity).toBe(1);
    }
  });

  test("read afresh in place of everything it held fades its new items in and unfolds none", async () => {
    await change(40, ["a", "b"]);

    const frames = await change(40, ["p", "q", "r"]);
    const half = (key: string): number => frames.findIndex((frame) => (frame.boxes[key]?.opacity ?? 0) > 0.5);
    const settled = frames.at(-1)!;

    for (const key of ["p", "q", "r"]) {
      const drawn = frames.filter((frame) => key in frame.boxes);

      // Each new item is drawn at its full height from its first frame.
      expect(new Set(drawn.map((frame) => frame.boxes[key]!.height))).toEqual(new Set([settled.boxes[key]!.height]));
    }

    expect(half("p")).toBeLessThan(half("r"));
  });

  test("lengthened by a page put at the end of items already standing stands at once, fading and unfolding none", async () => {
    await change(40, ["a", "b"]);
    await page.waitForTimeout(400);

    const frames = await change(40, ["a", "b", "c", "d", "e"]);
    const settled = frames.at(-1)!;

    for (const key of ["c", "d", "e"]) {
      const drawn = frames.filter((frame) => key in frame.boxes);

      expect(new Set(drawn.map((frame) => frame.boxes[key]!.height))).toEqual(new Set([settled.boxes[key]!.height]));
      expect(drawn.every((frame) => frame.boxes[key]!.opacity === 1)).toBe(true);
    }
  });

  test("moved down the page whole by a head growing above it slides none of its items", async () => {
    const before = await change(40, ["a", "b", "c", "d"]);
    const shifted = await change(140, ["a", "b", "c", "d", "e"]);
    const standing = before.at(-1)!;
    const settled = shifted.at(-1)!;

    // Each standing item is drawn at its new place in every frame: one hundred pixels further down, never on its way.
    for (const key of ["a", "b", "c", "d"]) {
      expect(settled.boxes[key]!.top).toBe(standing.boxes[key]!.top + 100);
      expect(new Set(shifted.filter((frame) => "e" in frame.boxes).map((frame) => frame.boxes[key]!.top))).toEqual(new Set([settled.boxes[key]!.top]));
    }
  });

  test("an item put between others still slides the ones after it to their places", async () => {
    await change(40, ["a", "b", "c"]);

    const frames = await change(40, ["a", "x", "b", "c"]);
    const settled = frames.at(-1)!;

    // The items after the one put in move down to make room, through places between where they stood and where
    // they stand.
    expect(frames.some((frame) => frame.boxes.c!.top < settled.boxes.c!.top)).toBe(true);
  });
});
