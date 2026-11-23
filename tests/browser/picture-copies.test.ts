import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// A picture drawn small is drawn from the copy its host made near that size (`docs/components.md`, "Skeletons and
// loading"). The whole picture and its copies are told apart by colour, the whole one red and every copy blue, so
// what the browser draws says which file it drew: the loading picture handed the copies at a width of 40 on a screen
// of density 1.25 is drawn from the first copy covering 50 pixels, and the one handed only its own file from that
// file. Skipped where the browser build is not on the machine, as every browser check is.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const WIDTH = 40;
const DENSITY = 1.25;
const STEPS = [32, 64, 128];
const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="/picture-copies-harness.css"><script src="/picture-copies-harness.js" defer></script></head>
<body style="margin:0"><div id="page"></div></body></html>`;

let out = "";
let script = "";
let sheet = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-picture-copies-"));

  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/picture-copies-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "picture-copies-harness.js")).text();
  sheet = (await Promise.all(readdirSync(out).filter((name) => name.endsWith(".css")).map((name) => Bun.file(join(out, name)).text()))).join("\n");
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

function square(side: number, colour: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}"><rect width="${side}" height="${side}" fill="${colour}"/></svg>`;
}

// The colour drawn at the middle of a picture.
async function drawnAt(page: Page, which: string): Promise<{ red: number; blue: number }> {
  const shot = await page.locator(`[data-picture=${which}] img:not([data-stand-in])`).screenshot();

  return await page.evaluate(async (data) => {
    const image = new Image();

    image.src = `data:image/png;base64,${data}`;
    await image.decode();

    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext("2d")!;

    context.drawImage(image, 0, 0);

    const [red, , blue] = context.getImageData(Math.floor(image.width / 2), Math.floor(image.height / 2), 1, 1).data;

    return { red: red!, blue: blue! };
  }, shot.toString("base64"));
}

describe.skipIf(!ready)("a loading picture handed copies of itself", () => {
  test("is drawn from the first copy covering its width at the screen's density, and its own file is not", async () => {
    const context = await browser.newContext({ viewport: { width: 400, height: 300 }, deviceScaleFactor: DENSITY });
    const page = await context.newPage();

    try {
      await page.route(`${ORIGIN}/**`, (route) => {
        const url = new URL(route.request().url());

        if (url.pathname === "/picture-copies-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
        if (url.pathname === "/picture-copies-harness.css") return route.fulfill({ contentType: "text/css", body: sheet });
        if (url.pathname === "/whole") return route.fulfill({ contentType: "image/svg+xml", body: square(1024, "#ff0000") });
        if (url.pathname === "/copy") return route.fulfill({ contentType: "image/svg+xml", body: square(Number(url.searchParams.get("w")), "#0000ff") });
        if (url.pathname === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

        return route.fulfill({ status: 404, body: "" });
      });

      const sources = STEPS.map((step) => `${ORIGIN}/copy?w=${step} ${step}w`).join(", ");

      await page.goto(`${ORIGIN}/?${new URLSearchParams({ whole: `${ORIGIN}/whole`, sources, width: String(WIDTH) })}`);
      await page.waitForFunction(() => [...document.querySelectorAll<HTMLImageElement>("[data-picture] img")].length === 2 && [...document.querySelectorAll<HTMLImageElement>("[data-picture] img")].every((image) => image.complete && image.naturalWidth > 0 && getComputedStyle(image).opacity === "1"), undefined, { timeout: 30_000 });

      const chosen = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>("[data-picture]")].map((box) => [box.dataset.picture, [box.querySelector("img")!.currentSrc, box.querySelector("img")!.getAttribute("src")]])));

      // 40 pixels at a density of 1.25 stand on 50, so the 64-pixel copy is the first covering them.
      expect(chosen.copies![0]).toBe(`${ORIGIN}/copy?w=64`);
      // The address it was handed whole stays the picture's own, the one a viewer opens.
      expect(chosen.copies![1]).toBe(`${ORIGIN}/whole`);
      expect(chosen.whole![0]).toBe(`${ORIGIN}/whole`);

      const copies = await drawnAt(page, "copies");
      const whole = await drawnAt(page, "whole");

      expect(copies.blue).toBeGreaterThan(200);
      expect(copies.red).toBeLessThan(50);
      expect(whole.red).toBeGreaterThan(200);
      expect(whole.blue).toBeLessThan(50);
    } finally {
      await context.close();
    }
  });
});
