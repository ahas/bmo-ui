import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// The active line of a row of the library's tabs under the chosen tab wherever the tabs around it
// change (`docs/components.md`, "Tab bar and toolbar"): in a dialog opened with its tabs standing, then
// with a tab put in front of the chosen one, then with that tab's name made longer, at a desktop's
// width and at a phone's. The chosen tab moves each time and keeps its size, so nothing but the change
// of the tabs around it can move the line. And a screen's row of the same tabs, drawn as the layer draws
// such a row, scrolls not at all vertically, its line at the row's bottom edge, both once the library's
// sliding line stands and before, as a page drawn on the server stands until it hydrates. The page is built as the layer's custom elements are, from
// the components that ship with the layer's patches applied, and driven by a real Chromium. Skipped
// where the browser build is not on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/tabs-indicator-harness.js" defer></script></head><body><div id="page"></div></body></html>`;

const WIDTHS = [
  { name: "a desktop", width: 1280, height: 720 },
  { name: "a phone", width: 360, height: 780 }
];
// What a box's edge may stand off a whole pixel where the layout lands between two.
const SUBPIXEL = 0.5;

let out = "";
let script = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-tabs-indicator-"));

  // The test runner names its own environment, which the build would read as a mode of its own; the
  // page is built as a host's script is, for production.
  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/tabs-indicator-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "tabs-indicator-harness.js")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

async function pageAt(width: number, height: number, address = "/"): Promise<Page> {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();

  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/tabs-indicator-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}${address}`);
  await page.waitForSelector(address === "/" ? "[data-open]" : "[data-row]");

  return page;
}

interface Span {
  left: number;
  width: number;
}

interface Line {
  chosen: Span;
  line: Span;
}

// The chosen tab and the line drawn under it, measured once everything in the dialog has settled: the
// dialog's growing in and the line's own slide to where it was last sent.
async function measureLine(page: Page): Promise<Line> {
  await page.evaluate(() => new Promise((settled) => requestAnimationFrame(() => requestAnimationFrame(settled))));
  await page.waitForFunction(() => {
    const dialog = document.querySelector("[role=dialog]");

    return dialog !== null && dialog.getAnimations({ subtree: true }).every((animation) => animation.playState === "finished");
  });

  return page.$eval("[role=dialog]", (dialog) => {
    const span = (selector: string): Span => {
      const box = dialog.querySelector(selector)!.getBoundingClientRect();

      return { left: box.left, width: box.width };
    };

    return { chosen: span("[role=tab][data-state=active]"), line: span("[data-slot=indicator]") };
  });
}

function expectUnderChosen({ chosen, line }: Line): void {
  expect(Math.abs(line.left - chosen.left)).toBeLessThanOrEqual(SUBPIXEL);
  expect(Math.abs(line.width - chosen.width)).toBeLessThanOrEqual(SUBPIXEL);
}

describe.skipIf(!ready)("the active line of a row of tabs whose tabs change", () => {
  for (const { name, width, height } of WIDTHS) {
    test(`at ${name}'s width, the line follows the chosen tab as a tab comes in front of it and grows`, async () => {
      const page = await pageAt(width, height);

      await page.click("[data-open]");

      const opened = await measureLine(page);

      expectUnderChosen(opened);

      await page.evaluate(() => (window as unknown as { putInFront: (label: string) => Promise<void> }).putInFront("Review"));

      const putInFront = await measureLine(page);

      expect(putInFront.chosen.left).toBeGreaterThan(opened.chosen.left);
      expectUnderChosen(putInFront);

      await page.evaluate(() => (window as unknown as { renameFront: (label: string) => Promise<void> }).renameFront("Review, sent back twice"));

      const renamed = await measureLine(page);

      expect(renamed.chosen.left).toBeGreaterThan(putInFront.chosen.left);
      expectUnderChosen(renamed);

      await page.context().close();
    });
  }
});

interface RowDrawn {
  scrollHeight: number;
  clientHeight: number;
  rowBottom: number;
  lineBottom: number | null;
}

// The row of tabs as it is drawn: how far it scrolls vertically, and where the chosen tab's line stands
// against the row's bottom edge, the sliding line where it stands and the chosen tab's own otherwise.
async function rowDrawn(page: Page): Promise<RowDrawn> {
  await page.evaluate(() => new Promise((drawn) => requestAnimationFrame(() => requestAnimationFrame(drawn))));

  return page.$eval("[data-row]", (row) => {
    const list = row.querySelector<HTMLElement>("[data-slot=list]")!;
    const indicator = list.querySelector("[data-slot=indicator]");
    const chosen = list.querySelector("[role=tab][data-state=active]")!;
    const own = getComputedStyle(chosen, "::after");
    const ownBottom = own.content === "none" ? null : chosen.getBoundingClientRect().bottom - Number.parseFloat(own.bottom);

    return {
      scrollHeight: list.scrollHeight,
      clientHeight: list.clientHeight,
      rowBottom: row.getBoundingClientRect().bottom,
      lineBottom: indicator === null ? ownBottom : indicator.getBoundingClientRect().bottom
    };
  });
}

describe.skipIf(!ready)("a screen's row of tabs before its sliding line stands and after", () => {
  for (const { name, width, height } of WIDTHS) {
    test(`at ${name}'s width, the row never scrolls vertically and its line stands at the row's bottom edge`, async () => {
      const page = await pageAt(width, height, "/?row");

      await page.waitForSelector("[data-row] [data-slot=indicator]");

      const settled = await rowDrawn(page);

      expect(settled.scrollHeight).toBeLessThanOrEqual(settled.clientHeight);
      expect(Math.abs(settled.lineBottom! - settled.rowBottom)).toBeLessThanOrEqual(SUBPIXEL);

      // The row as a page drawn on the server shows it until it hydrates: no sliding line yet, the chosen tab
      // drawing its own.
      await page.$eval("[data-row] [data-slot=indicator]", (indicator) => indicator.remove());

      const unhydrated = await rowDrawn(page);

      expect(unhydrated.lineBottom, "the chosen tab draws its own line").not.toBeNull();
      expect(unhydrated.scrollHeight, "the row scrolls vertically").toBeLessThanOrEqual(unhydrated.clientHeight);
      expect(Math.abs(unhydrated.lineBottom! - unhydrated.rowBottom)).toBeLessThanOrEqual(SUBPIXEL);

      await page.context().close();
    });
  }
});
