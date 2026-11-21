import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// A page holding a form asks before the reader leaves it with a change (`docs/components.md`, "Forms"):
// back to another view of the page or to another page keeps the address where it stood while the
// question stands, back on the question puts it away and leaves the form with its change and the
// address as they were, and discard goes where back was going. Untouched, back goes at once. A move of
// the router's own asks the same, its cancel staying and its discard going. Driven by a real Chromium
// at a phone's width and a desktop's. Skipped where the browser build is not on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/leave-guard-harness.js" defer></script></head><body><div id="page"></div></body></html>`;

const OPINION = "[data-opinion]";
const CHANGE = "Busy week";
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

  out = mkdtempSync(join(tmpdir(), "bmo-ui-leave-guard-"));

  // The test runner names its own environment, which the build would read as a mode of its own; the
  // page is built as a host's script is, for production.
  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/leave-guard-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "leave-guard-harness.js")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

// The harness page opened at the address named, then moved by the router to each path after it in
// turn, as the reader's own presses move it.
async function harness(width: number, height: number, address: string, ...visits: string[]): Promise<Page> {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();

  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/leave-guard-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/" || path === "/elsewhere") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}${address}`);

  for (const path of visits) {
    await page.waitForFunction(() => "visit" in window, null, { timeout: 3000 });
    await page.evaluate((to) => (window as unknown as { visit: (path: string) => Promise<unknown> }).visit(to), path);
  }

  await page.waitForSelector(OPINION, { timeout: 3000 });

  return page;
}

// Where the address and the router stand, and how many layers of the back gesture are registered.
async function standing(page: Page): Promise<{ address: string; routed: string; layers: number }> {
  return page.evaluate(() => {
    const own = window as unknown as { routed: () => string; layerCount: () => number };

    return { address: `${location.pathname}${location.search}`, routed: own.routed(), layers: own.layerCount() };
  });
}

// Resolves once the address and the router both stand at the path named, with the layers named registered.
async function settledAt(page: Page, path: string, layers: number): Promise<void> {
  await page.waitForFunction(
    ([at, count]) => {
      const own = window as unknown as { routed: () => string; layerCount: () => number };

      return `${location.pathname}${location.search}` === at && own.routed() === at && own.layerCount() === count;
    },
    [path, layers] as const,
    { timeout: 3000 }
  );
}

function back(page: Page): Promise<void> {
  return page.evaluate(() => history.back());
}

for (const { name, width, height } of WIDTHS) {
  describe.skipIf(!ready)(`a page form's leave guard at ${name}'s width`, () => {
    test("untouched, back goes to the other view at once", async () => {
      const page = await harness(width, height, "/?view=weekly", "/?view=monthly");

      await back(page);
      await settledAt(page, "/?view=weekly", 0);

      expect(await page.locator(QUESTION).count()).toBe(0);
      expect(await page.getAttribute("main", "data-view")).toBe("weekly");
      await page.context().close();
    });

    test("with a change, back asks with the address kept, back on the question keeps the change, and discard goes back", async () => {
      const page = await harness(width, height, "/?view=weekly", "/?view=monthly");

      await page.fill(OPINION, CHANGE);
      await back(page);
      await page.waitForSelector(QUESTION, { timeout: 3000 });
      await settledAt(page, "/?view=monthly", 1);

      // The question stands with the address where the form is, its own entry over it.
      expect(await standing(page)).toEqual({ address: "/?view=monthly", routed: "/?view=monthly", layers: 1 });

      // Back on the question puts it away: the form stands with its change, the address unmoved.
      await back(page);
      await page.waitForSelector(QUESTION, { state: "detached", timeout: 3000 });
      await settledAt(page, "/?view=monthly", 0);

      expect(await page.inputValue(OPINION)).toBe(CHANGE);
      expect(await page.getAttribute("main", "data-view")).toBe("monthly");

      // The next back asks again, and discard goes where it was going.
      await back(page);
      await page.waitForSelector(QUESTION, { timeout: 3000 });
      await settledAt(page, "/?view=monthly", 1);
      await page.getByRole("button", { name: "Discard" }).click();
      await settledAt(page, "/?view=weekly", 0);
      await page.waitForSelector(QUESTION, { state: "detached", timeout: 3000 });

      expect(await page.getAttribute("main", "data-view")).toBe("weekly");

      // Discard went back through the history, so the view left stands ahead of it; the host drops the
      // change as it discards, which the harness does by hand.
      await page.fill(OPINION, "");
      await page.evaluate(() => history.forward());
      await settledAt(page, "/?view=monthly", 0);
      await page.context().close();
    });

    test("with a change, back to another page asks with the address kept, Esc stays, and discard leaves", async () => {
      const page = await harness(width, height, "/elsewhere", "/?view=monthly");

      await page.fill(OPINION, CHANGE);
      await back(page);
      await page.waitForSelector(QUESTION, { timeout: 3000 });
      await settledAt(page, "/?view=monthly", 1);
      await page.keyboard.press("Escape");
      await page.waitForSelector(QUESTION, { state: "detached", timeout: 3000 });
      await settledAt(page, "/?view=monthly", 0);

      expect(await page.inputValue(OPINION)).toBe(CHANGE);

      await back(page);
      await page.waitForSelector(QUESTION, { timeout: 3000 });
      await page.getByRole("button", { name: "Discard" }).click();
      await page.waitForSelector("[data-elsewhere-page]", { timeout: 3000 });
      await settledAt(page, "/elsewhere", 0);
      await page.context().close();
    });

    test("with a change, a move of the router's own asks, cancel stays, and discard goes", async () => {
      const page = await harness(width, height, "/?view=monthly");

      await page.fill(OPINION, CHANGE);
      await page.click("[data-elsewhere]");
      await page.waitForSelector(QUESTION, { timeout: 3000 });

      expect((await standing(page)).address).toBe("/?view=monthly");

      await page.getByRole("button", { name: "Cancel" }).click();
      await page.waitForSelector(QUESTION, { state: "detached", timeout: 3000 });
      await settledAt(page, "/?view=monthly", 0);

      expect(await page.inputValue(OPINION)).toBe(CHANGE);

      await page.click("[data-elsewhere]");
      await page.waitForSelector(QUESTION, { timeout: 3000 });
      await page.getByRole("button", { name: "Discard" }).click();
      await page.waitForSelector("[data-elsewhere-page]", { timeout: 3000 });
      await settledAt(page, "/elsewhere", 0);
      await page.context().close();
    });
  });
}
