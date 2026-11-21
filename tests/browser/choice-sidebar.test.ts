import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, centreOf, openTouch, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// The side list drawn by a real browser (`docs/components.md`, "Choosing from a side list"). At a desk's
// width the list stands beside the body behind a one-pixel splitter, its head as tall as a tab row; typing
// narrows it to the choices whose label or line holds the words, the hits marked and each heading kept
// while a choice under it stays, a tree's rows standing in by their depth; a row chosen is handed to the
// host and marked current, and the line under the column names of a table heading the body runs on from
// the line under the list's head. At a phone's width the body fills the screen and one button carrying the chosen
// label opens the list as a bottom drawer, which closes as a row is chosen; the button stands in a row of
// its own unless the body places it in its own toolbar row, and draws nothing there at a desk's width. Unread entries stand as a
// skeleton, a failed read says why with a refresh handed to the host, and a list laid aside leaves the body
// alone, the same body standing as the list goes and comes back. Which entries the words keep is the
// side-parts module's own test (`tests/domain/side-parts.test.ts`). Skipped where the browser build is not on
// the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/choice-sidebar-harness.js" defer></script></head><body><div id="page" style="isolation:isolate"></div></body></html>`;

const LIST = "[data-choice-sidebar-list]";
const ROW = "[data-choice-sidebar-row]";
const DESK = { width: 1280, height: 800 };
const PHONE = { width: 360, height: 780 };

let out = "";
let script = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-choice-sidebar-"));

  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/choice-sidebar-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "choice-sidebar-harness.js")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

async function opened(viewport: { width: number; height: number }): Promise<Page> {
  const page = await (await browser.newContext({ viewport, reducedMotion: "reduce" })).newPage();

  await served(page);

  return page;
}

// The harness page served on a page of the caller's.
async function served(page: Page): Promise<void> {
  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/choice-sidebar-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForSelector("#chosen");
  await page.waitForFunction(() => "sidebar" in window);
}

// The list as it stands, top to bottom: each heading as `# words`, each row by its label.
async function listed(page: Page, scope = LIST): Promise<string[]> {
  return await page.$$eval(`${scope} [data-choice-sidebar-heading], ${scope} ${ROW}`, (parts) =>
    parts.map((part) => (part.hasAttribute("data-choice-sidebar-heading") ? `# ${part.textContent?.trim()}` : (part.querySelector("span > span")?.textContent?.trim() ?? "")))
  );
}

async function setState(page: Page, change: Record<string, unknown>): Promise<void> {
  await page.evaluate((next) => Object.assign((window as unknown as { sidebar: Record<string, unknown> }).sidebar, next), change);
}

describe.skipIf(!ready)("the side list at a desk's width", () => {
  test("stands beside the body behind a one-pixel splitter, its head as tall as a tab row", async () => {
    const page = await opened(DESK);
    const sizes = await page.evaluate(() => {
      const list = document.querySelector("[data-choice-sidebar-list]")!.getBoundingClientRect();
      const body = document.querySelector("[data-choice-sidebar-body]")!.getBoundingClientRect();
      const head = document.querySelector("[data-choice-sidebar-list]")!.firstElementChild!.getBoundingClientRect();
      const handle = document.querySelector("[data-choice-sidebar] [data-orientation=horizontal][role=separator], [data-choice-sidebar] [role=separator]")!.getBoundingClientRect();

      return { listLeft: list.left, listRight: list.right, bodyLeft: body.left, bodyRight: body.right, head: head.height, handle: handle.width };
    });

    expect(sizes.listLeft).toBe(0);
    expect(sizes.handle).toBe(1);
    expect(sizes.bodyLeft).toBe(sizes.listRight + 1);
    expect(sizes.bodyRight).toBe(DESK.width);
    expect(sizes.listRight / DESK.width).toBeGreaterThan(0.18);
    expect(sizes.listRight / DESK.width).toBeLessThan(0.4);
    expect(sizes.head).toBe(48);
    expect(await page.locator("[data-choice-sidebar-open]").count()).toBe(0);
    expect(await page.getByLabel("Search Organisations").count()).toBe(1);

    // The search box and the rows' words start on one line, and the rows scroll on the list's own edge.
    const edges = await page.evaluate(() => {
      const list = document.querySelector("[data-choice-sidebar-list]")!;
      const search = document.querySelector("[data-choice-sidebar-search]")!.parentElement!.getBoundingClientRect();
      const words = document.querySelector('[data-choice-sidebar-row="1"] span')!.getBoundingClientRect();
      const scroller = list.lastElementChild!.getBoundingClientRect();
      const box = list.getBoundingClientRect();

      return { search: search.left, words: words.left, scrollerLeft: scroller.left, scrollerRight: scroller.right, listLeft: box.left, listRight: box.right };
    });

    expect(edges.words).toBe(edges.search);
    expect([edges.scrollerLeft, edges.scrollerRight]).toEqual([edges.listLeft, edges.listRight]);
    await page.close();
  });

  test("narrows to what the words find, marks the hits, keeps a heading over what stays and hands the choice over", async () => {
    const page = await opened(DESK);

    expect(await listed(page)).toEqual(["# Northwind", "Northwind", "Sales", "Field team", "# Others", "Atlas", "Beacon", "Cobalt", "Delta", "Ember", "Falcon", "Garnet", "Harbor", "Indigo"]);

    const indents = await page.$$eval(ROW, (rows) => rows.slice(0, 3).map((row) => Number.parseFloat(getComputedStyle(row).paddingInlineStart)));

    expect(indents[1]! - indents[0]!).toBe(16);
    expect(indents[2]! - indents[1]!).toBe(16);

    await page.fill("[data-choice-sidebar-search]", "sales");
    await page.waitForFunction(() => document.querySelectorAll("[data-choice-sidebar-row]").length === 2);
    expect(await listed(page)).toEqual(["# Northwind", "Sales", "Field team"]);
    expect(await page.$$eval(`${LIST} mark`, (marks) => marks.map((mark) => mark.textContent))).toEqual(["Sales", "Sales"]);

    await page.fill("[data-choice-sidebar-search]", "nobody");
    await page.waitForSelector("[data-choice-sidebar-empty]");
    expect(await page.textContent("[data-choice-sidebar-empty]")).toBe("Nothing found");

    await page.fill("[data-choice-sidebar-search]", "");
    await page.click(`${ROW}[data-choice-sidebar-row="12"]`);
    await page.waitForFunction(() => document.querySelector("#chosen")?.textContent === "12");
    expect(await page.getAttribute(`${ROW}[data-choice-sidebar-row="12"]`, "aria-current")).toBe("page");
    expect(await page.getAttribute(`${ROW}[data-choice-sidebar-row="1"]`, "aria-current")).toBeNull();
    await page.close();
  });

  test("stands a skeleton while unread, says why a read failed with a refresh for the host, and leaves the body alone when laid aside", async () => {
    const page = await opened(DESK);

    await setState(page, { entries: null });
    await page.waitForSelector(`${LIST} [aria-busy=true]`);

    await setState(page, { failure: "The list could not be read" });
    await page.waitForSelector("[data-choice-sidebar-failure]");
    expect(await page.textContent("[data-choice-sidebar-failure]")).toContain("The list could not be read");
    await page.click("[data-choice-sidebar-failure] button");
    expect(await page.evaluate(() => (window as unknown as { sidebar: { retries: number } }).sidebar.retries)).toBe(1);

    // The body drawn before the list is laid aside is the one standing after it, and after it comes back.
    await page.evaluate(() => ((document.querySelector("#chosen") as HTMLElement & { kept?: boolean }).kept = true));
    await setState(page, { listed: false });
    await page.waitForFunction(() => document.querySelector("[data-choice-sidebar-list]") === null);
    expect(await page.locator("#chosen").isVisible()).toBe(true);
    expect(await page.locator("[data-choice-sidebar] [role=separator]").count()).toBe(0);
    expect(await page.$eval("[data-choice-sidebar-body]", (body) => body.getBoundingClientRect().width)).toBe(DESK.width);
    await setState(page, { listed: true });
    await page.waitForSelector("[data-choice-sidebar-list]");
    expect(await page.$eval("#chosen", (body) => (body as HTMLElement & { kept?: boolean }).kept === true)).toBe(true);
    await page.close();
  });
});

// Where the line under the list's head and the line under the column names heading the body each
// stand, as the top and the bottom of the pixel row each takes: the head's line is drawn over the
// head's last pixel, and the names' line is the separator row under them. Null for a line not standing.
async function headLines(page: Page): Promise<{ list: number[] | null; names: number[] | null; namesHeight: number }> {
  return await page.evaluate(() => {
    const head = document.querySelector("[data-choice-sidebar-list]")?.firstElementChild?.getBoundingClientRect();
    const thead = document.querySelector("[data-choice-sidebar-body] thead")!;
    const line = thead.lastElementChild!.getBoundingClientRect();

    return { list: head ? [head.bottom - 1, head.bottom] : null, names: line.height === 1 ? [line.top, line.bottom] : null, namesHeight: thead.firstElementChild!.getBoundingClientRect().height };
  });
}

describe.skipIf(!ready)("the side list beside a table heading its body", () => {
  test("meets the line under the column names in one line, the placeholder's as the table's, and with no list beside it the names keep their own height", async () => {
    const page = await opened(DESK);

    for (const body of ["table", "skeleton"]) {
      await setState(page, { body });
      await page.waitForSelector(`[data-choice-sidebar-body] ${body === "table" ? "[data-slot=separator]" : "[aria-busy=true] thead"}`);

      const lines = await headLines(page);

      expect(lines.names).toEqual(lines.list);
    }

    await setState(page, { body: "table", listed: false });
    await page.waitForFunction(() => document.querySelector("[data-choice-sidebar-list]") === null);
    expect((await headLines(page)).namesHeight).toBe(36);
    await page.close();
  });

  test("leaves the column names their own height on a phone, where no list stands beside the body", async () => {
    const page = await opened(PHONE);

    await setState(page, { body: "table" });
    await page.waitForSelector("[data-choice-sidebar-body] [data-slot=separator]");
    expect((await headLines(page)).namesHeight).toBe(36);
    await page.close();
  });
});

describe.skipIf(!ready)("the side list at a phone's width", () => {
  test("leaves the body the screen and opens the list from one button carrying the chosen label, closing as a row is chosen", async () => {
    const page = await opened(PHONE);

    await page.waitForSelector("[data-choice-sidebar-open]");
    expect(await page.locator(LIST).count()).toBe(0);
    expect(await page.textContent("[data-choice-sidebar-open]")).toBe("Northwind");

    const body = await page.$eval("[data-choice-sidebar-body]", (element) => element.getBoundingClientRect().width);

    expect(body).toBe(PHONE.width);

    await page.click("[data-choice-sidebar-open]");
    await page.waitForSelector(`[role=dialog] ${LIST}`);
    expect(await listed(page, `[role=dialog] ${LIST}`)).toContain("Indigo");

    await page.fill("[role=dialog] [data-choice-sidebar-search]", "garn");
    await page.waitForFunction(() => document.querySelectorAll("[role=dialog] [data-choice-sidebar-row]").length === 1);
    await page.click(`[role=dialog] ${ROW}[data-choice-sidebar-row="16"]`);
    await page.waitForFunction(() => document.querySelector("[role=dialog]") === null);
    expect(await page.textContent("#chosen")).toBe("16");
    expect(await page.textContent("[data-choice-sidebar-open]")).toBe("Garnet");
    await page.close();
  });

  test("closes its drawer on Back and on Esc alone, the page and the choice standing as they were", async () => {
    const page = await opened(PHONE);
    const address = page.url();

    await page.waitForSelector("[data-choice-sidebar-open]");

    for (const close of [() => page.goBack(), () => page.keyboard.press("Escape")]) {
      await page.click("[data-choice-sidebar-open]");
      await page.waitForSelector(`[role=dialog] ${LIST}`);
      await close();
      await page.waitForFunction(() => document.querySelector("[role=dialog]") === null);
      expect(page.url()).toBe(address);
      expect(await page.textContent("#chosen")).toBe("1");
      expect(await page.textContent("[data-choice-sidebar-open]")).toBe("Northwind");
    }

    await page.close();
  });

  test("stands its button in a row of its own by default, and in the body's toolbar row where the body places it, with no row of its own", async () => {
    const page = await opened(PHONE);
    // The body's rows top to bottom, each by its height and whether it holds the button, then where the
    // words under them start.
    const rowsOfBody = (): Promise<{ rows: { height: number; opener: boolean; toolbar: boolean }[]; words: number }> =>
      page.$eval("[data-choice-sidebar-body]", (body) => {
        const top = body.getBoundingClientRect().top;
        const rows = Array.from(body.children)
          .filter((child) => child.id !== "chosen")
          .map((child) => ({ height: child.getBoundingClientRect().height, opener: child.querySelector("[data-choice-sidebar-open]") !== null, toolbar: child.hasAttribute("data-toolbar") }));

        return { rows, words: body.querySelector("#chosen")!.getBoundingClientRect().top - top };
      });

    await page.waitForSelector("[data-choice-sidebar-open]");
    expect(await rowsOfBody()).toEqual({ rows: [{ height: 48, opener: true, toolbar: false }], words: 48 });

    await setState(page, { openerInBody: true });
    await page.waitForSelector("[data-toolbar] [data-choice-sidebar-open]");
    expect(await rowsOfBody()).toEqual({ rows: [{ height: 48, opener: true, toolbar: true }], words: 48 });
    expect(await page.locator("[data-choice-sidebar-open]").count()).toBe(1);

    await page.click("[data-choice-sidebar-open]");
    await page.waitForSelector(`[role=dialog] ${LIST}`);
    await page.click(`[role=dialog] ${ROW}[data-choice-sidebar-row="16"]`);
    await page.waitForFunction(() => document.querySelector("[role=dialog]") === null);
    expect(await page.textContent("[data-toolbar] [data-choice-sidebar-open]")).toBe("Garnet");

    // Beside the list at a desk's width the placed button draws nothing, and the toolbar stands on.
    await page.setViewportSize(DESK);
    await page.waitForSelector(LIST);
    expect(await page.locator("[data-choice-sidebar-open]").count()).toBe(0);
    expect(await page.locator("[data-toolbar] [data-filter]").count()).toBe(1);
    await page.close();
  });
});

describe.skipIf(!ready)("the side list under a finger", () => {
  test("opens its drawer from a tap on the button and closes it on a tap on a row, the row chosen", async () => {
    const touch = await openTouch({ device: "Galaxy S24", reducedMotion: "reduce" });

    try {
      await served(touch.page);
      await touch.page.waitForSelector("[data-choice-sidebar-open]");
      await touch.tap(await centreOf(touch.page, "[data-choice-sidebar-open]"));
      await touch.page.waitForSelector(`[role=dialog] ${ROW}[data-choice-sidebar-row="13"]`);
      // The drawer is tapped once it has risen and stands still, as a finger meets it.
      await touch.page.waitForFunction(() => document.getAnimations().every((motion) => motion.playState !== "running"));
      await touch.tap(await centreOf(touch.page, `[role=dialog] ${ROW}[data-choice-sidebar-row="13"]`));
      await touch.page.waitForFunction(() => document.querySelector("[role=dialog]") === null);
      expect(await touch.page.textContent("#chosen")).toBe("13");
      expect(await touch.page.textContent("[data-choice-sidebar-open]")).toBe("Delta");
    } finally {
      await touch.close();
    }
  }, BROWSER_HOOK_MS);
});
