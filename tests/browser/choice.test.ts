import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, centreOf, openTouch, touchReady } from "./touch";

import type { TouchSession } from "./touch";

import type { Browser, Page } from "playwright-core";

// The one select drawn by a real browser (`docs/components.md`, "Choosing a value"): a list of five
// opens with no search, a list of a dozen opens with the search at its top holding the focus, typing
// narrows it to what the choices show with the hits marked and the headings of what stays, an empty
// answer says why, a list found over a road asks it and says when it refused, and a finger opening a
// long list leaves the keyboard down. Which choices the words keep is the choices module's own test
// (`tests/domain/choices.test.ts`). Skipped where the browser build is not on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/choice-harness.js" defer></script></head><body><div id="page" style="isolation:isolate"></div></body></html>`;

const LIST = "[data-slot=content]";
const FIELD = `${LIST} input`;

let out = "";
let script = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-choice-"));

  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/choice-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "choice-harness.js")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

async function serve(page: Page): Promise<void> {
  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/choice-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForSelector("#found");
}

// What the open list shows, top to bottom: each heading as `# words`, each choice by its label.
async function listedAs(page: Page, wanted: string[]): Promise<void> {
  await page.waitForFunction(
    ([selector, words]) =>
      JSON.stringify(
        [...document.querySelectorAll(selector)].map((part) => (part.getAttribute("data-slot") === "label" ? `# ${part.textContent?.trim()}` : (part.textContent?.trim() ?? "")))
      ) === JSON.stringify(words),
    [`${LIST} [data-slot=label], ${LIST} [data-slot=itemLabel]`, wanted] as const,
    { timeout: 3_000 }
  );
}

// The cities' list whole: its two headings and its twelve choices.
async function listedWhole(page: Page): Promise<void> {
  await listedAs(page, ["# North", "Berlin", "Dublin", "Oslo", "Riga", "Tallinn", "Vienna", "# South", "Athens", "Lisbon", "Madrid", "Rome", "Seville", "Valletta"]);
}

async function saysEmpty(page: Page, words: string): Promise<void> {
  await page.waitForFunction(([selector, wanted]) => document.querySelector(selector)?.textContent?.trim() === wanted, [`${LIST} [data-slot=empty]`, words] as const, {
    timeout: 3_000
  });
}

async function close(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await page.waitForSelector(LIST, { state: "detached" });
}

describe.skipIf(!ready)("the one select at a desktop's width", () => {
  let page: Page;

  beforeAll(async () => {
    page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
    await serve(page);
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await page?.context().close();
  });

  test("opens a list of five with no search", async () => {
    await page.click("#short");
    await listedAs(page, ["Tiny", "Small", "Medium", "Large", "Huge"]);
    expect(await page.$(FIELD)).toBeNull();
    await close(page);
  });

  test("opens a list of a dozen with the search at its top, the focus in it and the pack's words in it", async () => {
    await page.click("#long");
    await page.waitForSelector(FIELD);

    const field = await page.$eval(FIELD, (input) => {
      const first = document.querySelector("[data-slot=content] [data-slot=label], [data-slot=content] [data-slot=item]");

      return {
        placeholder: input.getAttribute("placeholder"),
        focused: document.activeElement === input,
        above: first !== null && input.getBoundingClientRect().bottom <= first.getBoundingClientRect().top
      };
    });

    expect(field).toEqual({ placeholder: "Search", focused: true, above: true });
    await listedWhole(page);
    await close(page);
  });

  test("narrows to what the choices show, marks the hits and keeps the headings of what stays", async () => {
    await page.click("#long");
    await page.waitForSelector(FIELD);

    await page.keyboard.type("RI");
    await listedAs(page, ["# North", "Riga", "# South", "Madrid"]);
    expect(await page.$$eval(`${LIST} mark`, (marks) => marks.map((mark) => mark.textContent))).toEqual(["Ri", "ri"]);

    // The line under a choice is searched as its label is.
    await page.fill(FIELD, "warm");
    await listedAs(page, ["# South", "Athens", "Lisbon", "Madrid", "Rome", "Seville", "Valletta"]);

    await page.fill(FIELD, "zzz");
    await listedAs(page, []);
    await saysEmpty(page, "Nothing found");

    // Closing clears the words, so the list opens whole again.
    await close(page);
    await page.click("#long");
    await page.waitForSelector(FIELD);
    expect(await page.inputValue(FIELD)).toBe("");
    await listedWhole(page);
    await close(page);
  });

  test("asks the road for a list found on the server, and says when nothing came back and when it refused", async () => {
    await page.click("#found");
    await page.waitForSelector(FIELD);
    await saysEmpty(page, "No choices");

    await page.keyboard.type("al");
    await listedAs(page, ["Alan Moor"]);

    await page.fill(FIELD, "a");
    await listedAs(page, ["Ada Byron", "Alan Moor", "Grace Hill", "Linus Park"]);

    await page.fill(FIELD, "zzz");
    await saysEmpty(page, "Nothing found");

    await page.fill(FIELD, "fail");
    await saysEmpty(page, "Search failed");

    await page.fill(FIELD, "ada");
    await listedAs(page, ["Ada Byron"]);
    await page.keyboard.press("Enter");
    await page.waitForSelector(LIST, { state: "detached" });
  });
});

describe.skipIf(!ready)("the one select under a finger at a phone's width", () => {
  let touch: TouchSession;

  beforeAll(async () => {
    touch = await openTouch({ device: "Galaxy S24" });
    await serve(touch.page);
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await touch?.close();
  });

  test("opens a long list with its search standing and the keyboard left down", async () => {
    const { page } = touch;

    expect(page.viewportSize()?.width).toBe(360);

    await touch.tap(await centreOf(page, "#long"));
    await page.waitForSelector(FIELD);
    await listedWhole(page);
    expect(await page.$eval(FIELD, (input) => document.activeElement === input)).toBe(false);
  });
});
