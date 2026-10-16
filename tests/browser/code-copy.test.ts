import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright-core";

import { blockText } from "~/domain/code-copy";
import { fencedBlock, fencedRules } from "./fenced-block";
import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// The copy button on a fenced block, pressed in a real browser (`docs/components.md`, "Code and
// files"), with the layer's own rules for the block and its button as the stylesheet ships them, so
// where the button stands is checked against what the layer draws and not against a copy.

const ready = touchReady();
const built = ready ? await Bun.build({ entrypoints: [new URL("../../app/domain/code-copy.ts", import.meta.url).pathname], target: "browser" }) : null;
const script = built === null ? "" : await built.outputs[0]!.text();

// The words the button says, standing in for the host's pack.
const WORDS: Record<string, string> = { "common.action.copy": "Copy", "common.status.copied": "Copied" };

const FIXTURE = `<meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body { margin: 0; font: 16px sans-serif; } ${fencedRules()}</style>
  <div id="text" class="markdown" style="width: 320px; padding: 16px">
    <p>A paragraph before.</p>
    ${fencedBlock("\n  bun install\nbun test\n\n", "sh", WORDS["common.action.copy"]!)}
    <p>Some <code>inline</code> code.</p>
  </div>`;

let browser: Browser;
let page: Page;

async function mount(): Promise<void> {
  await page.setContent(FIXTURE);
  await page.addScriptTag({
    type: "module",
    content: `${script}
      window.copied = [];
      const words = ${JSON.stringify(WORDS)};
      document.getElementById("text").addEventListener("click", (event) =>
        copyFromPress((key) => words[key], event, async (text) => { window.copied.push(text); return true; }, 200));`
  });
  await page.waitForFunction(() => "copied" in window);
}

describe.skipIf(!ready)("the copy button on a fenced block", () => {
  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await browser?.close();
  }, BROWSER_HOOK_MS);

  test("stands inside the block's top right corner", async () => {
    await mount();

    const where = await page.evaluate(() => {
      const block = document.querySelector("pre")!.getBoundingClientRect();
      const button = document.querySelector("button[data-copy]")!.getBoundingClientRect();

      return { top: button.top - block.top, right: block.right - button.right, width: button.width, height: button.height };
    });

    expect(where.top).toBeGreaterThanOrEqual(0);
    expect(where.top).toBeLessThanOrEqual(8);
    expect(where.right).toBeGreaterThanOrEqual(0);
    expect(where.right).toBeLessThanOrEqual(8);
    expect(where.width).toBeGreaterThanOrEqual(32);
    expect(where.height).toBeGreaterThanOrEqual(32);
  });

  test("copies the lines inside the fence, and says so for a moment", async () => {
    await mount();
    await page.locator("button[data-copy]").click();
    await page.waitForFunction(() => (window as unknown as { copied: string[] }).copied.length > 0);

    expect(await page.evaluate(() => (window as unknown as { copied: string[] }).copied)).toEqual(["  bun install\nbun test"]);
    expect(await page.locator("button[data-copy]").getAttribute("aria-label")).toBe(WORDS["common.status.copied"]!);
    expect(await page.locator("button[data-copy]").getAttribute("data-copied")).toBe("");

    await page.waitForFunction((copy) => document.querySelector("button[data-copy]")!.getAttribute("aria-label") === copy, WORDS["common.action.copy"], { timeout: 2000 });

    expect(await page.locator("button[data-copy]").getAttribute("data-copied")).toBeNull();
  });

  test("takes no press elsewhere in the text", async () => {
    await mount();
    await page.locator("pre").click({ position: { x: 4, y: 4 } });
    await page.locator("p").first().click();

    expect(await page.evaluate(() => (window as unknown as { copied: string[] }).copied)).toEqual([]);
  });
});

describe("the text a block is copied as", () => {
  test("drops the blank lines around it and keeps a leading indent", () => {
    expect(blockText("\n\n  a\n b\n\n")).toBe("  a\n b");
    expect(blockText("\ud55c \uc904")).toBe("\ud55c \uc904");
  });
});
