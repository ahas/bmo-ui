import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// A dialog's close on its head's centre line (`docs/components.md`, "Floating things"): the close,
// the title's block — a one-line title, a title with its description under it, a title that wraps —
// and the head itself share one centre, and the title's block ends 8 pixels before the close, at a
// desktop's width and at a phone's. The page is built as the layer's custom elements are, from the
// components that ship, and driven by a real Chromium. Skipped where the browser build is not on the
// machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/dialog-head-harness.js" defer></script></head><body><div id="page"></div></body></html>`;

const HEADS = ["title", "described", "long"] as const;
const WIDTHS = [
  { name: "a desktop", width: 1280, height: 720 },
  { name: "a phone", width: 360, height: 780 }
];
// What a box's edge may stand off a whole pixel where the layout lands between two.
const SUBPIXEL = 0.5;
// How far the title's block ends before the close.
const CLEARANCE = 8;

let out = "";
let script = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-dialog-head-"));

  // The test runner names its own environment, which the build would read as a mode of its own; the
  // page is built as a host's script is, for production.
  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/dialog-head-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "dialog-head-harness.js")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

async function pageAt(width: number, height: number): Promise<Page> {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();

  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/dialog-head-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForSelector("[data-open]");

  return page;
}

interface Head {
  // The vertical centre of the head, of the title's block and of the close.
  head: number;
  block: number;
  close: number;
  // Where the title's block ends and the close begins.
  blockEnd: number;
  closeStart: number;
  // How many lines the title takes.
  titleLines: number;
}

// The head of the dialog standing open, measured once it has finished growing in, since a dialog
// still growing out of its control stands scaled.
async function measureHead(page: Page): Promise<Head> {
  await page.waitForFunction(() => {
    const content = document.querySelector("[role=dialog]");

    return content !== null && content.getAnimations().every((animation) => animation.playState === "finished");
  });

  return page.$eval("[role=dialog]", (dialog) => {
    const box = (selector: string): DOMRect | null => dialog.querySelector(selector)?.getBoundingClientRect() ?? null;
    const centre = (rect: { top: number; bottom: number }): number => (rect.top + rect.bottom) / 2;
    const header = dialog.querySelector("[data-slot=header]")!;
    // The head inside the hairline that parts it from the body.
    const headTop = header.getBoundingClientRect().top + header.clientTop;
    const head = { top: headTop, bottom: headTop + header.clientHeight };
    const title = box("[data-slot=title]")!;
    const description = box("[data-slot=description]");
    const close = box("[aria-label=Close]")!;
    const block = { top: title.top, bottom: description?.bottom ?? title.bottom };
    const lineHeight = Number.parseFloat(getComputedStyle(dialog.querySelector("[data-slot=title]")!).lineHeight);

    return {
      head: centre(head),
      block: centre(block),
      close: centre(close),
      blockEnd: Math.max(title.right, description?.right ?? title.right),
      closeStart: close.left,
      titleLines: Math.round(title.height / lineHeight)
    };
  });
}

describe.skipIf(!ready)("a dialog's close on its head's centre line", () => {
  for (const { name, width, height } of WIDTHS) {
    test(`at ${name}'s width, every head's title block and close share the head's centre`, async () => {
      const page = await pageAt(width, height);

      for (const head of HEADS) {
        await page.click(`[data-open=${head}]`);

        const measured = await measureHead(page);

        expect(Math.abs(measured.close - measured.head)).toBeLessThanOrEqual(SUBPIXEL);
        expect(Math.abs(measured.block - measured.head)).toBeLessThanOrEqual(SUBPIXEL);
        expect(Math.abs(measured.closeStart - measured.blockEnd - CLEARANCE)).toBeLessThanOrEqual(SUBPIXEL);
        if (head === "long") expect(measured.titleLines).toBeGreaterThan(1);

        await page.keyboard.press("Escape");
        await page.waitForSelector("[role=dialog]", { state: "detached" });
      }

      await page.context().close();
    });
  }
});
