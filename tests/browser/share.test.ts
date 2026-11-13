import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, BrowserContext, Page } from "playwright-core";
import type { ShareCall } from "./share-harness";

// The one share dialog driven over a stand-in host's roads (`docs/components.md`, "Sharing"): the
// member part found, picked, listed, changed and taken off through the member road alone, a host
// offering no member road given the link part alone, and the link made, shown and ended as ever.
// What the dialog asks of the roads is read from the calls the stand-in writes down, and what it
// tells the screen behind from the two lines the page shows. The page is built as the layer's
// custom elements are, from the components that ship, and driven by a real Chromium at a desktop's
// width. Skipped where the browser build is not on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/share-harness.js" defer></script></head><body><div id="page"></div></body></html>`;

const MEMBERS = "[data-share-members]";
const SEARCH = "[role=dialog] input[placeholder='Search members']";
const MENU = "[role=listbox]";

let out = "";
let script = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-share-"));

  // The test runner names its own environment, which the build would read as a mode of its own; the
  // page is built as a host's script is, for production.
  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/share-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "share-harness.js")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

// The page opened with its dialog standing, read through once: the host offers the member road
// unless the address says it does not.
async function session(query = ""): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/share-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/${query}`);
  await page.click("[data-open]");
  await page.waitForSelector("[role=dialog]");
  await page.waitForFunction(() => window.shareCalls.some((call) => call.name === "link.read"));

  return { context, page };
}

async function calls(page: Page): Promise<ShareCall[]> {
  return page.evaluate(() => window.shareCalls);
}

async function lastCall(page: Page, name: string): Promise<ShareCall | undefined> {
  return (await calls(page)).findLast((call) => call.name === name);
}

// The members listed, each as its account key and the permission its row shows.
async function rows(page: Page): Promise<string[]> {
  return page.$$eval("[data-member]", (found) => found.map((row) => `${row.getAttribute("data-member")} ${row.querySelector("[role=combobox]")?.textContent?.trim()}`));
}

// Words typed into the search, and the person it offers picked off the menu.
async function pick(page: Page, words: string, name: string): Promise<void> {
  await page.fill(SEARCH, words);
  await page.getByRole("option", { name: new RegExp(name) }).click();
}

describe.skipIf(!ready)("the member part", () => {
  test("lists who it is shared with, read through the road, and tells the screen how many", async () => {
    const { context, page } = await session();

    await page.waitForSelector("[data-member='2']");

    expect(await rows(page)).toEqual(["2 Edit"]);
    expect(await lastCall(page, "members.read")).toEqual({ name: "members.read", args: [] });
    expect(await page.textContent("[data-count]")).toBe("1");
    await context.close();
  });

  test("its rows stand as a skeleton of the row's own height while they are read", async () => {
    const { context, page } = await session("?hold=1");

    await page.waitForSelector("[data-member-skeleton]");

    const placeholder = await page.$eval("[data-member-skeleton]", (row) => row.getBoundingClientRect().height);

    await page.evaluate(() => window.releaseMembers());
    await page.waitForSelector("[data-member='2']");

    const real = await page.$eval("[data-member='2']", (row) => row.getBoundingClientRect().height);

    expect(placeholder).toBe(real);
    await context.close();
  });

  test("searches through the road, offering nobody it is already shared with, the words marked", async () => {
    const { context, page } = await session();

    await page.waitForSelector("[data-member='2']");
    await page.fill(SEARCH, "er");
    await page.getByRole("option", { name: /tester/ }).waitFor();

    expect(await lastCall(page, "members.search")).toEqual({ name: "members.search", args: ["er"] });
    expect(await page.$$eval(`${MENU} [role=option]`, (options) => options.length)).toBe(1);
    expect(await page.$$eval(`${MENU} mark`, (marks) => marks.map((mark) => mark.textContent))).toEqual(["er", "er"]);
    await context.close();
  });

  test("shares with everyone picked at once, at read, lists them and empties the search", async () => {
    const { context, page } = await session();

    await page.waitForSelector("[data-member='2']");
    await pick(page, "er", "tester");
    await pick(page, "qa", "qa-admin");
    await page.click("[data-member-share]");
    await page.waitForSelector("[data-member='3']");

    expect(await lastCall(page, "members.share")).toEqual({ name: "members.share", args: [["1", "3"], "read"] });
    expect(await rows(page)).toEqual(["2 Edit", "1 Read", "3 Read"]);
    expect(await page.textContent("[data-count]")).toBe("3");
    expect(await page.inputValue(SEARCH)).toBe("");
    await page.waitForSelector(MENU, { state: "detached" });
    await context.close();
  });

  test("a permission chosen on a member's row goes through the road", async () => {
    const { context, page } = await session();

    await page.click("[data-member='2'] [role=combobox]");
    await page.getByRole("option", { name: "Read" }).click();
    await page.waitForFunction(() => document.querySelector("[data-member='2'] [role=combobox]")?.textContent?.includes("Read"));

    expect(await lastCall(page, "members.change")).toEqual({ name: "members.change", args: ["2", "read"] });
    expect(await rows(page)).toEqual(["2 Read"]);
    await context.close();
  });

  test("a member is taken off by the row's icon button, the others left, and the screen told", async () => {
    const { context, page } = await session();

    await page.waitForSelector("[data-member='2']");
    await pick(page, "er", "tester");
    await page.click("[data-member-share]");
    await page.waitForSelector("[data-member='1']");
    await page.click("[data-member='2'] button[aria-label='Unshare']");
    await page.waitForSelector("[data-member='2']", { state: "detached" });

    expect(await lastCall(page, "members.remove")).toEqual({ name: "members.remove", args: ["2"] });
    expect(await rows(page)).toEqual(["1 Read"]);
    expect(await page.textContent("[data-count]")).toBe("1");

    await page.click("[data-member='1'] button[aria-label='Unshare']");
    await page.waitForSelector("[data-no-members]");

    expect(await page.textContent("[data-no-members]")).toBe("Shared with nobody");
    expect(await page.textContent("[data-count]")).toBe("0");
    await context.close();
  });
});

describe.skipIf(!ready)("a host that offers no member road", () => {
  test("gets the link part alone, and nothing is asked of members", async () => {
    const { context, page } = await session("?members=0");

    await page.waitForSelector("[role=dialog] button:has-text('Create link')");

    expect(await page.$(MEMBERS)).toBeNull();
    expect((await calls(page)).filter((call) => call.name.startsWith("members."))).toEqual([]);
    expect(await page.textContent("[data-count]")).toBe("none");
    await context.close();
  });
});

describe.skipIf(!ready)("the link part, beside the members", () => {
  test("makes a link for the span offered first, shows its address and end, and ends it", async () => {
    const { context, page } = await session();

    await page.click("[role=dialog] button:has-text('Create link')");
    await page.waitForSelector("[role=dialog] input[aria-label='Share address']");

    expect(await lastCall(page, "link.make")).toEqual({ name: "link.make", args: ["7"] });
    expect(await page.inputValue("[role=dialog] input[aria-label='Share address']")).toBe(`${ORIGIN}/shared/a1b2c3`);
    expect(await page.textContent("[role=dialog] .tabular-nums")).toStartWith("Until ");
    expect(await page.textContent("[data-mark]")).toBe("link with an end");

    await page.click("[role=dialog] button:has-text('Unshare'):not([aria-label])");
    await page.waitForSelector("[role=dialog] button:has-text('Create link')");

    expect(await lastCall(page, "link.remove")).toEqual({ name: "link.remove", args: ["a1b2c3"] });
    expect(await page.textContent("[data-mark]")).toBe("no link");
    await context.close();
  });
});
