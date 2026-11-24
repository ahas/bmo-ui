import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// Hovering the words of a notice colours the whole pill (`docs/components.md`, "Messages"): the
// words are the notice's press, so their hover lies over the pill edge to edge and behind its keys,
// and no block of the words' own colour ends against a key. A key keeps its own hover, which colours
// the key alone. Read off what the browser draws, in a notice of one line with its key at the line's
// end and in one that says more with its keys under its words, at a phone's width and a desktop's,
// in both modes. The page is built as the layer's custom elements are, from the components that
// ship, and driven by a real Chromium. Skipped where the browser build is not on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/island-harness.css"><script src="/island-harness.js" defer></script></head><body><div id="page"></div></body></html>`;

const ISLAND = "[role=status]";
const WORDS = "[role=status] button:not([data-slot])";
const FIRST_KEY = "[role=status] button[data-slot=base]";

let out = "";
let script = "";
// The components' own scoped sheets, which the build writes beside the script rather than into it.
let sheet = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-island-"));

  // The test runner names its own environment, which the build would read as a mode of its own; the
  // page is built as a host's script is, for production.
  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/island-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "island-harness.js")).text();
  sheet = await Bun.file(join(out, "bmo-ui.css")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

// The page at one width and mode, holding its notice, once the pill has opened to its full size.
async function island(width: number, layout: "inline" | "stacked", theme: "light" | "dark"): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext({ viewport: { width, height: 720 }, reducedMotion: "reduce" });
  const page = await context.newPage();

  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/island-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/island-harness.css") return route.fulfill({ contentType: "text/css", body: sheet });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/?layout=${layout}&theme=${theme}`);
  await page.waitForSelector(FIRST_KEY);

  return { page, close: () => context.close() };
}

// What a box paints behind what it holds: its colour and any layer laid over it.
async function paint(page: Page, selector: string): Promise<string> {
  return page.$eval(selector, (element) => {
    const style = getComputedStyle(element);

    return `${style.backgroundColor} ${style.backgroundImage}`;
  });
}

describe.skipIf(!ready)("hovering a notice's words colours the whole pill, and a key colours itself alone", () => {
  for (const width of [360, 1280]) {
    for (const layout of ["inline", "stacked"] as const) {
      for (const theme of ["light", "dark"] as const) {
        test(`a ${layout} notice at ${width}px in the ${theme} mode`, async () => {
          const { page, close } = await island(width, layout, theme);
          const resting = { island: await paint(page, ISLAND), words: await paint(page, WORDS), key: await paint(page, FIRST_KEY) };

          // The words hovered: the pill takes the colour, the words paint no block of their own, and
          // the key stands as it was.
          await page.hover(WORDS);
          await page.waitForFunction(([selector, before]) => {
            const style = getComputedStyle(document.querySelector(selector!)!);

            return `${style.backgroundColor} ${style.backgroundImage}` !== before;
          }, [ISLAND, resting.island]);

          expect(await paint(page, WORDS)).toBe(resting.words);
          expect(await paint(page, FIRST_KEY)).toBe(resting.key);

          // A key hovered: the key takes its own colour and the pill goes back to its rest.
          await page.hover(FIRST_KEY);
          await page.waitForFunction(([selector, before]) => {
            const style = getComputedStyle(document.querySelector(selector!)!);

            return `${style.backgroundColor} ${style.backgroundImage}` !== before;
          }, [FIRST_KEY, resting.key]);

          expect(await paint(page, ISLAND)).toBe(resting.island);

          await close();
        });
      }
    }
  }
});
