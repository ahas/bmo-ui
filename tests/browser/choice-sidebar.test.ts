import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// The side list drawn by a real browser (`docs/components.md`, "Choosing from a side list"). At a desk's
// width the list stands beside the body behind a one-pixel splitter, its head as tall as a tab row; typing
// narrows it to the choices whose label or line holds the words, the hits marked and each heading kept
// while a choice under it stays, a tree's rows standing in by their depth; a row chosen is handed to the
// host and marked current. At a phone's width the body fills the screen and one button carrying the chosen
// label opens the list as a bottom drawer, which closes as a row is chosen. Unread entries stand as a
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

  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/choice-sidebar-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForSelector("#chosen");
  await page.waitForFunction(() => "sidebar" in window);

  return page;
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
});
