import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { HOLD_MS } from "../../app/domain/longpress";
import { BROWSER_HOOK_MS, centreOf, openTouch, touchReady } from "./touch";

import type { TouchSession } from "./touch";

import type { Browser, Page } from "playwright-core";

// The date calendar drawn by a real browser (`docs/components.md`, "Dates"): its paging buttons carry
// the pack's words as the name a screen reader hears and the name the markup button layer shows, a
// resting pointer at a desktop's width brings each name up, the inner two are named by what they page
// in the view shown however the view came to change, and a finger held on one at a phone's width
// names it and pages nothing. How the markup button layer answers a pointer, a focus and a finger is
// its own test's (`tests/browser/toolbar.test.ts`); this one holds the calendar's buttons to it.
// Skipped where the browser build is not on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
// The page's root is an isolated stacking context, as the component library makes a Nuxt app's root.
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/calendar-harness.js" defer></script></head><body><div id="page" style="isolation:isolate"></div></body></html>`;

// The calendar's paging buttons in the order they stand, and its heading's button.
const PAGING = "#calendar [data-slot=header] > button";
const HEADING = "#calendar [data-slot=heading] button";

const AMONG_DAYS = ["Previous year", "Previous month", "Next month", "Next year"];

let out = "";
let script = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-calendar-"));

  // The test runner names its own environment, which the build would read as a mode of its own; the
  // page is built as a host's script is, for production.
  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/calendar-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "calendar-harness.js")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

async function serve(page: Page): Promise<void> {
  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/calendar-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForSelector(PAGING);
}

// Each paging button's name as a screen reader hears it and as the markup button layer reads it.
async function pagingNames(page: Page): Promise<{ heard: string | null; shown: string | null }[]> {
  return await page.$$eval(PAGING, (buttons) => buttons.map((button) => ({ heard: button.getAttribute("aria-label"), shown: button.getAttribute("data-tooltip") })));
}

async function pagingNamed(page: Page, words: string[]): Promise<void> {
  await page.waitForFunction(
    ([selector, wanted]) => JSON.stringify([...document.querySelectorAll(selector)].map((button) => button.getAttribute("data-tooltip"))) === JSON.stringify(wanted),
    [PAGING, words] as const,
    { timeout: 3_000 }
  );
}

async function named(page: Page, words: string, standing: boolean): Promise<void> {
  await page.waitForFunction(
    ([wanted, shown]) => [...document.querySelectorAll("[role=tooltip]")].some((tip) => tip.textContent === wanted) === shown,
    [words, standing] as const,
    { timeout: 3_000 }
  );
}

async function heading(page: Page): Promise<string> {
  return (await page.textContent(HEADING))?.trim() ?? "";
}

describe.skipIf(!ready)("the date calendar at a desktop's width", () => {
  test("names its four paging buttons in the pack's words, heard and shown alike, under a resting pointer", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    try {
      await serve(page);
      expect(await pagingNames(page)).toEqual(AMONG_DAYS.map((words) => ({ heard: words, shown: words })));

      // Each in turn, the pointer going straight from one to the next and across the heading between
      // the inner two, as a reader's pointer travels along the row.
      for (const [index, words] of AMONG_DAYS.entries()) {
        const at = await centreOf(page, `${PAGING} >> nth=${index}`);

        await page.mouse.move(at.x, at.y);
        await named(page, words, true);
      }
    } finally {
      await context.close();
    }
  });

  test("names the inner buttons by what they page in the view shown, however the view changed", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    try {
      await serve(page);

      await page.click(HEADING);
      await pagingNamed(page, ["Previous year", "Next year"]);

      await page.click(HEADING);
      await pagingNamed(page, ["Earlier years", "Later years"]);

      await page.click(HEADING);
      await pagingNamed(page, AMONG_DAYS);

      // A month chosen among the months opens its days, by the calendar's own step rather than the
      // heading's.
      await page.click(HEADING);
      await pagingNamed(page, ["Previous year", "Next year"]);
      await page.click("#calendar [data-slot=cellTrigger] >> nth=0");
      await pagingNamed(page, AMONG_DAYS);
      expect(await pagingNames(page)).toEqual(AMONG_DAYS.map((words) => ({ heard: words, shown: words })));
    } finally {
      await context.close();
    }
  });
});

describe.skipIf(!ready)("the date calendar under a finger at a phone's width", () => {
  let touch: TouchSession;

  beforeAll(async () => {
    touch = await openTouch({ device: "Galaxy S24" });
    await serve(touch.page);
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await touch?.close();
  });

  test("names a paging button under a held finger and pages nothing, and pages on a tap alone", async () => {
    const { page } = touch;

    expect(page.viewportSize()?.width).toBe(360);

    const shown = await heading(page);
    const at = await centreOf(page, `${PAGING} >> nth=2`);

    await touch.press(at, { holdMs: HOLD_MS + 400 });
    await named(page, "Next month", true);
    expect(await heading(page)).toBe(shown);

    await touch.tap({ x: 2, y: page.viewportSize()!.height - 2 });
    await named(page, "Next month", false);

    await touch.tap(at);
    await page.waitForFunction(([selector, before]) => document.querySelector(selector)?.textContent?.trim() !== before, [HEADING, shown] as const, { timeout: 3_000 });
  });
});
