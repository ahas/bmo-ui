import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// The focus a dialog takes up on its own as it opens (`docs/design.md`, "Focus"): opened from the
// address as the page loads, its close holds the focus the browser counts as the keyboard's and
// draws no ring, and Tab from there rings what it reaches and rings the close again on the way back;
// opened by a key it rings its close, and opened by a press it draws none. The page is built as the
// layer's custom elements are, from the library's own dialog and the overlays module, and driven by
// a real Chromium at a desktop's width and a phone's. Skipped where the browser build is not on the
// machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/opening-focus-harness.js" defer></script></head><body><div id="page"></div></body></html>`;

const WIDTHS = [
  { name: "a desktop", width: 1280, height: 720 },
  { name: "a phone", width: 360, height: 780 }
];

let out = "";
let script = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-opening-focus-"));

  // The test runner names its own environment, which the build would read as a mode of its own; the
  // page is built as a host's script is, for production.
  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/opening-focus-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "opening-focus-harness.js")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

async function pageAt(width: number, height: number, address: string): Promise<Page> {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();

  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/opening-focus-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/${address}`);
  await page.waitForSelector("[data-open]");

  return page;
}

// What holds the focus once the dialog stands with the focus inside it, whether the browser counts
// that focus as the keyboard's, and whether a ring is drawn round it: an outline the stylesheet
// settled on, of any width.
interface Focused {
  name: string;
  visible: boolean;
  ringed: boolean;
}

async function focused(page: Page): Promise<Focused> {
  await page.waitForFunction(() => document.querySelector("[role=dialog]")?.contains(document.activeElement) ?? false);

  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement;
    const style = getComputedStyle(element);

    return {
      name: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "",
      visible: element.matches(":focus-visible"),
      ringed: style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0
    };
  });
}

for (const { name, width, height } of WIDTHS) {
  describe.skipIf(!ready)(`a dialog's first focus at ${name}'s width`, () => {
    test("opened from the address as the page loads draws no ring, and Tab rings what it reaches", async () => {
      const page = await pageAt(width, height, "?open");

      try {
        expect(await focused(page)).toEqual({ name: "Close", visible: true, ringed: false });

        await page.keyboard.press("Tab");
        expect(await focused(page)).toEqual({ name: "Edit", visible: true, ringed: true });

        await page.keyboard.press("Shift+Tab");
        expect(await focused(page)).toEqual({ name: "Close", visible: true, ringed: true });
      } finally {
        await page.context().close();
      }
    });

    test("opened by a key rings its close", async () => {
      const page = await pageAt(width, height, "");

      try {
        await page.keyboard.press("Tab");
        await page.keyboard.press("Enter");
        expect(await focused(page)).toEqual({ name: "Close", visible: true, ringed: true });
      } finally {
        await page.context().close();
      }
    });

    test("opened by a press draws no ring", async () => {
      const page = await pageAt(width, height, "");

      try {
        await page.click("[data-open]");
        expect(await focused(page)).toEqual({ name: "Close", visible: false, ringed: false });
      } finally {
        await page.context().close();
      }
    });
  });
}
