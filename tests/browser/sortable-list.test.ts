import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, centreOf, openTouch, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// The sortable list drawn by a real browser (`docs/components.md`, "Sortable lists"), worked as a hand works it.
// A mouse carrying an item by its handle lifts a floating copy that follows the pointer while its own place stays
// an empty gap, and the items it passes slide by the item's height to make room; let go over the list, the move is
// answered and the order changes, while Escape or a drop outside the list leaves it as it was. A press that never
// travels moves nothing. The keyboard picks up, moves a place at a time and sets down. At a phone's width a
// finger's long press on the handle carries the item, and a finger swiping over the list without holding scrolls
// it and moves nothing. Skipped where the browser build is not on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/sortable-list-harness.js" defer></script></head><body><div id="page" style="isolation:isolate"></div></body></html>`;

const HANDLE = "[data-sortable-handle]";
const ITEM = "[data-sortable-item]";
const FLOATING = "[data-sortable-floating]";
const DESK = { width: 1280, height: 800 };

let out = "";
let script = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-sortable-list-"));

  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/sortable-list-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "sortable-list-harness.js")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

async function served(page: Page): Promise<void> {
  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/sortable-list-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForSelector(HANDLE);
  await page.waitForFunction(() => "sortable" in window);
}

async function opened(): Promise<Page> {
  const page = await (await browser.newContext({ viewport: DESK })).newPage();

  await served(page);

  return page;
}

// The order the page holds, as it writes it under the box.
async function order(page: Page): Promise<string[]> {
  return ((await page.textContent("#order")) ?? "").split(" ");
}

// The centre of the handle of the item at `index`, and the height of one item.
async function handleAt(page: Page, index: number): Promise<{ x: number; y: number; height: number }> {
  return await page.$$eval(
    HANDLE,
    (handles, at) => {
      const box = handles[at as number]!.getBoundingClientRect();
      const item = handles[at as number]!.closest("[data-sortable-item]")!.getBoundingClientRect();

      return { x: box.left + box.width / 2, y: box.top + box.height / 2, height: item.height };
    },
    index
  );
}

// The vertical shift the item at `index` stands at now.
async function shiftOf(page: Page, index: number): Promise<number> {
  return await page.$$eval(
    ITEM,
    (items, at) => {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(items[at as number]!).transform);

      return Math.round(matrix.m42);
    },
    index
  );
}

describe("the sortable list, worked by hand", () => {
  test.skipIf(!ready)("a mouse lifts the item, the others slide to make room, and the drop answers the move", async () => {
    const page = await opened();
    const start = await handleAt(page, 0);

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    // Past two items' middles, in steps, the way a hand drags.
    await page.mouse.move(start.x, start.y + start.height * 2.2, { steps: 12 });
    await page.waitForTimeout(250);

    expect(await page.locator(FLOATING).count()).toBe(1);
    // The floating copy follows the pointer, and its own place stays an empty gap.
    const floatTop = await page.$eval(FLOATING, (box) => box.getBoundingClientRect().top);

    expect(Math.abs(floatTop - (start.y + start.height * 2.2 - start.height / 2))).toBeLessThan(start.height / 2);
    expect(await page.$eval(ITEM, (item) => getComputedStyle(item).opacity)).toBe("0");
    // The two items passed slid up by the lifted item's height; the one after them stands where it was.
    expect(await shiftOf(page, 1)).toBe(-Math.round(start.height));
    expect(await shiftOf(page, 2)).toBe(-Math.round(start.height));
    expect(await shiftOf(page, 3)).toBe(0);

    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector("[data-sortable-floating]") === null);

    expect((await order(page)).slice(0, 4)).toEqual(["Birch", "Cedar", "Alder", "Dogwood"]);
    expect(await page.evaluate(() => (window as unknown as { sortable: { moves: { value: unknown } } }).sortable.moves.value)).toEqual([[0, 2]]);
    await page.context().close();
  });

  test.skipIf(!ready)("Escape and a drop outside the list put the item back and change nothing", async () => {
    const page = await opened();
    const start = await handleAt(page, 1);
    const before = await order(page);

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x, start.y + start.height * 2, { steps: 10 });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector("[data-sortable-floating]") === null);
    expect(await order(page)).toEqual(before);

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 900, start.y + 40, { steps: 10 });
    await page.mouse.up();
    await page.waitForFunction(() => document.querySelector("[data-sortable-floating]") === null);
    expect(await order(page)).toEqual(before);

    // A press let go where it went down carries nothing.
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.up();
    expect(await page.locator(FLOATING).count()).toBe(0);
    expect(await order(page)).toEqual(before);
    await page.context().close();
  });

  test.skipIf(!ready)("carried to the box's bottom edge, the list scrolls along", async () => {
    const page = await opened();
    const start = await handleAt(page, 0);
    const bottom = await page.$eval("[data-scroller]", (box) => box.getBoundingClientRect().bottom);

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x, bottom - 8, { steps: 12 });
    await page.waitForTimeout(600);

    expect(await page.$eval("[data-scroller]", (box) => box.scrollTop)).toBeGreaterThan(0);
    await page.mouse.up();
    await page.context().close();
  });

  test.skipIf(!ready)("the keyboard picks an item up, moves it a place at a time and sets it down", async () => {
    const page = await opened();

    await page.focus(HANDLE);
    await page.keyboard.press("Space");
    expect(await page.getAttribute(HANDLE, "aria-pressed")).toBe("true");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    expect(await page.textContent("[role=status]")).toContain("Alder, place 3 of 12");
    await page.keyboard.press("Space");
    expect((await order(page)).slice(0, 3)).toEqual(["Birch", "Cedar", "Alder"]);

    // Escape puts a carried item back.
    await page.focus(HANDLE);
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Escape");
    expect((await order(page)).slice(0, 3)).toEqual(["Birch", "Cedar", "Alder"]);
    await page.context().close();
  });

  test.skipIf(!ready)("at a phone's width a finger's long press carries the item, and a plain swipe only scrolls", async () => {
    const session = await openTouch();

    try {
      await served(session.page);

      const at = await centreOf(session.page, HANDLE);
      const height = (await handleAt(session.page, 0)).height;

      await session.swipe(at, { x: at.x, y: at.y + height * 2.2 }, { holdMs: 450, steps: 14, restMs: 250 });
      await session.page.waitForFunction(() => document.querySelector("[data-sortable-floating]") === null);
      expect((await order(session.page)).slice(0, 3)).toEqual(["Birch", "Cedar", "Alder"]);

      // A swipe that sets off at once is the finger scrolling, and moves nothing.
      const before = await order(session.page);

      await session.swipe(at, { x: at.x, y: at.y + height * 2.2 }, { steps: 14 });
      await session.page.waitForTimeout(300);
      expect(await order(session.page)).toEqual(before);
    } finally {
      await session.close();
    }
  });
});
