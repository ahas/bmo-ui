import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, BrowserContext, Page } from "playwright-core";

// The back gesture over a form's dialog that holds a change asks first, as its close and Esc do
// (`docs/components.md`, "Forms"): the question stands over the dialog, discard takes both away and
// leaves the history as it was, and every way out of the question keeps the dialog standing with an
// entry of its own, so the next press of back asks again. The page is built as the layer's custom
// elements are, from the components that ship, and driven by a real Chromium at a phone's width and
// a desktop's. Skipped where the browser build is not on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/close-guard-harness.js" defer></script></head><body><div id="page"></div></body></html>`;

const OPEN = "[data-open]";
const REASON = "[data-reason]";
const FORM = "[role=dialog]:has([data-reason])";
const QUESTION = "[role=dialog]:has-text('Discard unsaved changes?')";

const WIDTHS = [
  { name: "a phone", width: 360, height: 740 },
  { name: "a desktop", width: 1280, height: 720 }
];

let out = "";
let script = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-close-guard-"));

  // The test runner names its own environment, which the build would read as a mode of its own; the
  // page is built as a host's script is, for production.
  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/close-guard-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "close-guard-harness.js")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

// The page with the form's dialog standing open and a change written into it.
async function changed(width: number, height: number): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();

  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/close-guard-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/`);
  await page.click(OPEN);
  await page.fill(REASON, "Family event");
  await settledOn(page, 1);

  return { context, page };
}

// Whether the page stands on an entry pushed for a floating thing, and how many layers are registered.
async function entries(page: Page): Promise<{ layers: number; marked: boolean }> {
  return page.evaluate(() => ({
    layers: (window as unknown as { layerCount: () => number }).layerCount(),
    marked: (history.state as Record<string, unknown> | null)?.bmoLayer !== undefined
  }));
}

// Resolves once as many layers are registered as are named and the page stands on the top one's entry.
async function settledOn(page: Page, layers: number): Promise<void> {
  await page.waitForFunction(
    (count) =>
      (window as unknown as { layerCount: () => number }).layerCount() === count &&
      ((history.state as Record<string, unknown> | null)?.bmoLayer !== undefined) === (count > 0),
    layers,
    { timeout: 3000 }
  );
}

// One press of back, answered by the question standing over the form's dialog: the question first
// raised is the one still standing once its entry has been pushed, not one closed unanswered.
async function backAsks(page: Page): Promise<void> {
  await page.evaluate(() => history.back());

  const question = await page.waitForSelector(QUESTION, { timeout: 3000 });

  await settledOn(page, 1);

  expect(await question.evaluate((element) => element.isConnected && element.getAttribute("data-state"))).toBe("open");
  expect(await page.locator(FORM).count()).toBe(1);
}

for (const { name, width, height } of WIDTHS) {
  describe.skipIf(!ready)(`the back gesture over a form's dialog holding a change, on ${name}`, () => {
    test("asks first, and discard takes the dialog away and leaves the history as it was", async () => {
      const { context, page } = await changed(width, height);

      await backAsks(page);
      await page.getByRole("button", { name: "Discard" }).click();
      await page.waitForSelector("[role=dialog]", { state: "detached", timeout: 3000 });
      await settledOn(page, 0);

      expect(await entries(page)).toEqual({ layers: 0, marked: false });

      await context.close();
    });

    test("is held by back on the question, the dialog keeping its change and an entry of its own", async () => {
      const { context, page } = await changed(width, height);

      await backAsks(page);
      await page.evaluate(() => history.back());
      await page.waitForSelector(QUESTION, { state: "detached", timeout: 3000 });
      await settledOn(page, 1);

      expect(await page.inputValue(REASON)).toBe("Family event");

      // The dialog's own entry stands again, so the next press asks again rather than leaving the page.
      await backAsks(page);
      await page.getByRole("button", { name: "Cancel" }).click();
      await page.waitForSelector(QUESTION, { state: "detached", timeout: 3000 });
      await settledOn(page, 1);

      expect(await page.locator(FORM).count()).toBe(1);

      await context.close();
    });
  });
}
