import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// A row's mark in a list that chooses many (`docs/design.md`, "Lists"): the box stands centred in
// the cell the hover and press colours fill, with as much room before it as after it, and on the same
// vertical line as the box of the choose-all control over the list — at a desktop's width with a
// mouse and at a phone's with a finger, in the light and in the dark. Under a finger the cell is at
// least 40 pixels. The page is built as the layer's custom elements are, from the components that
// ship, and driven by a real Chromium. Skipped where the browser build is not on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/choose-cell-harness.js" defer></script></head><body><div id="page"></div></body></html>`;

const WIDTHS = [
  { name: "a desktop", width: 1280, height: 720, finger: false },
  { name: "a phone", width: 360, height: 780, finger: true }
];
const MODES = ["light", "dark"] as const;
// What two measured edges may stand apart where the layout lands between two pixels.
const SUBPIXEL = 1;
// The least a cell a finger aims at may be across.
const FINGER = 40;

let out = "";
let script = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-choose-cell-"));

  // The test runner names its own environment, which the build would read as a mode of its own; the
  // page is built as a host's script is, for production.
  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/choose-cell-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "choose-cell-harness.js")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

async function pageAt(width: number, height: number, finger: boolean): Promise<Page> {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: finger, hasTouch: finger });
  const page = await context.newPage();

  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/choose-cell-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForSelector("[data-cell] [role=checkbox]");

  return page;
}

interface Row {
  // The room the cell keeps before, after, above and below its box.
  before: number;
  after: number;
  above: number;
  below: number;
  // How wide the cell is, and where its box begins.
  width: number;
  box: number;
}

async function measure(page: Page): Promise<{ control: number; rows: Row[]; coarse: boolean }> {
  return page.evaluate(() => {
    const rect = (element: Element): DOMRect => element.getBoundingClientRect();
    const control = rect(document.querySelector("[data-choose-all] [role=checkbox]")!).left;
    const rows = [...document.querySelectorAll("[data-cell]")].map((cell) => {
      const outer = rect(cell);
      const box = rect(cell.querySelector("[role=checkbox]")!);

      return { before: box.left - outer.left, after: outer.right - box.right, above: box.top - outer.top, below: outer.bottom - box.bottom, width: outer.width, box: box.left };
    });

    return { control, rows, coarse: matchMedia("(pointer: coarse)").matches };
  });
}

describe.skipIf(!ready)("a row's mark centred in its cell, on the choose-all control's line", () => {
  for (const { name, width, height, finger } of WIDTHS) {
    for (const mode of MODES) {
      test(`at ${name}'s width in the ${mode}, every row's box has even room in its cell and stands under the control's box`, async () => {
        const page = await pageAt(width, height, finger);

        await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), mode === "dark");

        const { control, rows, coarse } = await measure(page);

        expect(coarse).toBe(finger);
        expect(rows.length).toBeGreaterThan(0);

        for (const row of rows) {
          expect(row.before).toBeGreaterThan(0);
          expect(Math.abs(row.before - row.after)).toBeLessThanOrEqual(SUBPIXEL);
          expect(Math.abs(row.above - row.below)).toBeLessThanOrEqual(SUBPIXEL);
          expect(Math.abs(row.box - control)).toBeLessThanOrEqual(SUBPIXEL);
          if (finger) expect(row.width).toBeGreaterThanOrEqual(FINGER);
        }

        // The colour a pointer lays on the cell is the cell's own and reaches round the box.
        const cell = page.locator("[data-cell]").first();
        const resting = await cell.evaluate((element) => getComputedStyle(element).backgroundColor);

        if (!finger) {
          await cell.hover({ position: { x: 2, y: 2 } });
          await page.waitForFunction((was) => getComputedStyle(document.querySelector("[data-cell]")!).backgroundColor !== was, resting);
        }

        await page.context().close();
      });
    }
  }
});
