import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, BrowserContext, Page } from "playwright-core";
import type { FacesSeen } from "./faces-harness";

// A row of faces and the words after it in one unfolding box, frame by frame under the layer's own
// stylesheet (`docs/design.md`, "Motion"; `docs/components.md`, "Avatar groups" and "A box that
// follows what it holds"). A face that comes unfolds its width where it lands, one that goes folds
// to nothing, faces changing places slide sideways, and none of it fades or moves up or down; the
// box follows the row frame by frame and ends at what it holds. Words replaced at once move the box
// to its new size at the unfold length while the words stand at their final size. A reader who
// asked for less movement sees every change stand at once. The vertical list's own movement is
// `motion.test.ts`'s.
//
// The movements run at a shorter length than the layer's, set on the page, so a run costs a
// fraction of a second and still draws several frames of each. Skipped where the browser build is
// not on the machine, as every browser check is.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const LENGTH = "160ms";
// The length is set after the layer's own sheet, which the script puts at the head's end, so it wins.
const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/faces-harness.css"><script src="/faces-harness.js" defer></script></head>
<body><style>:root { --bmo-motion-unfold: ${LENGTH}; } body { margin: 0; }</style><div id="page"></div></body></html>`;

// A face at the medium size is 32px wide and each after the first overlaps it by 6px, as the
// library's own group draws them.
const STEP = 26;

let out = "";
let script = "";
// The components' own styles, which the build writes beside the script.
let sheet = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-faces-"));

  // The test runner names its own environment, which the build would read as a mode of its own; the
  // page is built as a host's script is, for production.
  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/faces-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "faces-harness.js")).text();
  sheet = (await Promise.all(readdirSync(out).filter((name) => name.endsWith(".css")).map((name) => Bun.file(join(out, name)).text()))).join("\n");
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

async function session(reducedMotion: "reduce" | "no-preference"): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: 400, height: 300 }, reducedMotion });
  const page = await context.newPage();

  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/faces-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/faces-harness.css") return route.fulfill({ contentType: "text/css", body: sheet });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/`);
  // The box is held to its content's size once the page's first frame is laid out.
  await page.waitForFunction(() => document.querySelector<HTMLElement>("[data-box=box]")?.style.width !== "");

  return { context, page };
}

type Change = { faces: string[] } | { words: string };

// Makes one change and hands back every frame drawn from it until nothing moves.
async function frames(page: Page, change: Change): Promise<FacesSeen[]> {
  return await page.evaluate(async (change) => {
    window.faces.record();
    if ("faces" in change) window.faces.setFaces(change.faces);
    else window.faces.setWords(change.words);

    return await window.faces.settled();
  }, change);
}

// One box's course through the frames it stands in.
function course(seen: FacesSeen[], key: string): ({ frame: number } & FacesSeen["boxes"][string])[] {
  return seen.flatMap((one) => (one.boxes[key] === undefined ? [] : [{ frame: one.frame, ...one.boxes[key]! }]));
}

function monotonic(values: number[]): boolean {
  const steps = values.slice(1).map((value, at) => value - values[at]!);

  return steps.every((step) => step >= 0) || steps.every((step) => step <= 0);
}

// Every face and the cap stays on its line and is drawn whole: nothing moves up or down, and
// nothing fades.
function sidewaysAlone(seen: FacesSeen[], keys: string[]): void {
  for (const key of keys) {
    const steps = course(seen, key);

    expect(new Set(steps.map((one) => one.top)).size, key).toBe(1);
    expect(steps.every((one) => one.opacity === 1), key).toBe(true);
  }
}

// The box follows what it holds in every frame, and ends at it.
function follows(seen: FacesSeen[]): void {
  for (const one of seen) {
    expect(Math.abs(one.boxes.box!.width - one.boxes.held!.width), `frame ${one.frame}`).toBeLessThanOrEqual(1);
  }
}

function lefts(seen: FacesSeen[], keys: string[]): number[] {
  const last = seen.at(-1)!.boxes;

  return keys.map((key) => last[key]!.left - last[keys[0]!]!.left);
}

describe.skipIf(!ready)("a row of faces in an unfolding box", () => {
  let context: BrowserContext;
  let page: Page;

  beforeAll(async () => {
    ({ context, page } = await session("no-preference"));
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await context?.close();
  });

  test("a face that comes unfolds its width where it lands, the faces after it and the box moving with it", async () => {
    const seen = await frames(page, { faces: ["a", "x", "b"] });
    const coming = course(seen, "x").map((one) => one.width);
    const b = course(seen, "b").map((one) => one.left);

    sidewaysAlone(seen, ["a", "x", "b"]);
    expect(monotonic(coming)).toBe(true);
    expect(coming[0]).toBeLessThan(36);
    expect(new Set(coming).size).toBeGreaterThan(3);
    expect(coming.at(-1)).toBe(36);
    expect(monotonic(b)).toBe(true);
    expect(new Set(b).size).toBeGreaterThan(3);
    // The face's own picture is never squeezed: it stands at its full height throughout.
    expect(new Set(course(seen, "x").map((one) => one.height)).size).toBe(1);
    follows(seen);
    expect(lefts(seen, ["a", "x", "b"])).toEqual([0, STEP, 2 * STEP]);
  });

  test("faces changing places slide sideways to them, at their own width", async () => {
    const seen = await frames(page, { faces: ["b", "x", "a"] });

    sidewaysAlone(seen, ["a", "x", "b"]);

    for (const key of ["a", "b"]) {
      const steps = course(seen, key);

      expect(monotonic(steps.map((one) => one.left)), key).toBe(true);
      expect(new Set(steps.map((one) => one.left)).size, key).toBeGreaterThan(3);
      expect(new Set(steps.map((one) => one.width)).size, key).toBe(1);
    }

    expect(lefts(seen, ["b", "x", "a"])).toEqual([0, STEP, 2 * STEP]);
  });

  test("the first face past the most brings the cap in, unfolding, and the last one past it takes it away", async () => {
    const coming = await frames(page, { faces: ["b", "x", "a", "c"] });
    const cap = course(coming, "cap").map((one) => one.width);

    sidewaysAlone(coming, ["a", "x", "b", "cap"]);
    expect(course(coming, "c")).toEqual([]);
    expect(monotonic(cap)).toBe(true);
    expect(new Set(cap).size).toBeGreaterThan(3);
    follows(coming);
    expect(lefts(coming, ["b", "x", "a", "cap"])).toEqual([0, STEP, 2 * STEP, 3 * STEP]);
    expect(await page.locator("[data-face-cap]").textContent()).toContain("1 others");

    const going = await frames(page, { faces: ["b", "a"] });
    const folding = course(going, "cap").map((one) => one.width);
    const x = course(going, "x").map((one) => one.width);

    sidewaysAlone(going, ["a", "x", "b", "cap"]);
    expect(monotonic(folding)).toBe(true);
    expect(Math.min(...folding)).toBeLessThan(5);
    expect(monotonic(x)).toBe(true);
    expect(Math.min(...x)).toBeLessThan(5);
    expect(going.at(-1)!.boxes.cap).toBeUndefined();
    expect(going.at(-1)!.boxes.x).toBeUndefined();
    follows(going);
    expect(lefts(going, ["b", "a"])).toEqual([0, STEP]);
  });

  test("words replaced at once move the box to its new size at the unfold length, the words standing at theirs", async () => {
    const seen = await frames(page, { words: "Writing a longer line" });
    const box = course(seen, "box").map((one) => one.width);
    const held = course(seen, "held").map((one) => one.width);

    expect(new Set(held).size).toBe(1);
    expect(new Set(course(seen, "words").map((one) => one.left)).size).toBe(1);
    expect(monotonic(box)).toBe(true);
    expect(new Set(box).size).toBeGreaterThan(3);
    expect(box[0]).toBeLessThan(held[0]!);
    expect(box.at(-1)).toBe(held[0]);
    expect(await page.locator("[data-box=box]").evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0.16s, 0.16s");
  });
});

describe.skipIf(!ready)("a row of faces for a reader who asked for less movement", () => {
  test("stands at every change at once", async () => {
    const { context, page } = await session("reduce");

    try {
      const changes: Change[] = [{ faces: ["a", "x", "b"] }, { faces: ["b", "x", "a", "c"] }, { faces: ["a"] }, { words: "Writing a longer line" }];

      // What is drawn, leaving out an item that stands folded to nothing while its list lets it go.
      const drawn = (one: FacesSeen): string => JSON.stringify(Object.entries(one.boxes).filter(([, box]) => box.width > 0));

      for (const change of changes) {
        const seen = await frames(page, change);
        const last = drawn(seen.at(-1)!);

        expect(seen.every((one) => drawn(one) === last), JSON.stringify(change)).toBe(true);
      }
    } finally {
      await context.close();
    }
  });
});
