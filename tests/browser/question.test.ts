import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, BrowserContext, Page } from "playwright-core";

// The question asked on a press, answered by the first Esc (`docs/components.md`, "Messages" and
// "Tooltips"): a dialog takes its focus up on its own close as it opens, and where a press opened
// the dialog that arrival is not the keyboard's — the close's name must stay shut, or the first Esc
// goes into the name and the reader must press again to close the question. What the close is named
// by stays the rest: a keyboard Tab reaching it, and a pointer hovering it. The page is built as the
// layer's custom elements are, from the components that ship, and driven by a real Chromium at a
// desktop's width. Skipped where the browser build is not on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/question-harness.js" defer></script></head><body><div id="page"></div></body></html>`;

const ASK = "[data-ask]";
const DIALOG = "[role=dialog]";
const CLOSE = "[role=dialog] [aria-label=Close]";
const TIP = "[role=tooltip]";

let out = "";
let script = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-question-"));

  // The test runner names its own environment, which the build would read as a mode of its own; the
  // page is built as a host's script is, for production.
  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/question-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "question-harness.js")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

async function session(): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/question-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForSelector(ASK);

  return { context, page };
}

// The press that asks, and the moment the standing dialog has taken its focus up on its own close.
async function ask(page: Page): Promise<void> {
  await page.click(ASK);
  await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Close");
}

// How the close names itself: the state its tooltip holds it in.
async function closeState(page: Page): Promise<string | null> {
  return page.$eval(CLOSE, (element) => element.getAttribute("data-state"));
}

describe.skipIf(!ready)("the question opened on a press", () => {
  test("takes its first Esc itself, its close standing unnamed", async () => {
    const { context, page } = await session();

    await ask(page);

    expect(await closeState(page)).toBe("closed");
    expect(await page.locator(TIP).count()).toBe(0);

    await page.keyboard.press("Escape");
    await page.waitForSelector(DIALOG, { state: "detached" });
    await page.waitForFunction(() => document.querySelector("[data-answer]")?.textContent === "no");

    await context.close();
  });

  test("is left standing while its close is hovered, named as ever", async () => {
    const { context, page } = await session();

    await ask(page);

    const at = await page.locator(CLOSE).boundingBox();

    if (at === null) throw new Error("the close is not on the screen");

    await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
    await page.waitForSelector(TIP);

    expect(await page.locator(DIALOG).count()).toBe(1);

    await context.close();
  });

  test("names its close once the keyboard reaches it", async () => {
    const { context, page } = await session();

    await ask(page);

    // The dialog opened under a pointer, so the focus it took up on the close named nothing; a
    // Shift+Tab and a Tab are the keyboard's own way round its controls and back onto the close.
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await page.waitForSelector(TIP);

    expect(await closeState(page)).toBe("instant-open");

    await context.close();
  });
});
