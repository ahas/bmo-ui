import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium, devices } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, BrowserContext, CDPSession, Page } from "playwright-core";
import type { VideoCall } from "./video-harness";

// The video player (`docs/components.md`, "The video player") driven by a real Chromium at a desktop's width
// and a phone's, in the light and the dark mode. As a still it stands in a message bubble: cut by the bubble's
// corners with none of its own, at its video's shape under the twenty rem cap, its first frame under a play mark
// and its length, a file that refuses saying so, and a press opens the full player large, playing and taking the
// sound from what played before. Full, its controls come and go, its bar gathers what a narrow player has no room
// for, its keys and a finger's gestures move the video, and a layer over it holds them off. The page's media
// elements keep their own clock, so nothing is fetched or played; the timers the player waits on run on the
// browser's installed clock. Skipped where the browser build is not on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/video-harness.css"><script src="/video-harness.js" defer></script></head><body><div id="page"></div></body></html>`;

// What the harness's media elements say of themselves.
const LENGTH_SECONDS = 100;

const STILL = "[data-video-still]";
const PLAYER = "[data-video-player]";
const CONTROLS = "[data-video-controls]";

type Width = "desktop" | "mobile";
type Scheme = "light" | "dark";

const WIDTHS: Width[] = ["desktop", "mobile"];
const SCHEMES: Scheme[] = ["light", "dark"];

let out = "";
let script = "";
// The components' own scoped sheets, which the build writes beside the script.
let sheet = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-video-"));

  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/video-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "video-harness.js")).text();
  sheet = (await Promise.all(readdirSync(out).filter((name) => name.endsWith(".css")).map((name) => Bun.file(join(out, name)).text()))).join("\n");
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

interface Session {
  context: BrowserContext;
  page: Page;
  cdp: CDPSession;
}

// The page in one size of the player, at one width and in one mode. A page whose timers the test moves installs
// the browser's clock before anything runs.
async function session(size: "still" | "full", width: Width, scheme: Scheme, options: { clock?: boolean } = {}): Promise<Session> {
  const context = await browser.newContext(width === "desktop" ? { viewport: { width: 1280, height: 800 } } : { ...devices["Galaxy S24"] });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/video-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/video-harness.css") return route.fulfill({ contentType: "text/css", body: sheet });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });

  if (options.clock) await page.clock.install();

  await page.goto(`${ORIGIN}/?size=${size}`);
  await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), scheme === "dark");
  await page.locator(size === "still" ? STILL : PLAYER).first().waitFor();

  return { context, page, cdp };
}

interface Point {
  x: number;
  y: number;
}

async function touch(cdp: CDPSession, type: "touchStart" | "touchMove" | "touchEnd", at?: Point): Promise<void> {
  await cdp.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: at === undefined ? [] : [{ x: Math.round(at.x), y: Math.round(at.y), radiusX: 6, radiusY: 6, force: 1, id: 1 }]
  });
}

async function tap(cdp: CDPSession, at: Point): Promise<void> {
  await touch(cdp, "touchStart", at);
  await touch(cdp, "touchEnd");
}

async function drag(cdp: CDPSession, from: Point, to: Point): Promise<void> {
  await touch(cdp, "touchStart", from);

  for (let step = 1; step <= 8; step += 1) await touch(cdp, "touchMove", { x: from.x + ((to.x - from.x) * step) / 8, y: from.y + ((to.y - from.y) * step) / 8 });

  await touch(cdp, "touchEnd");
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function box(page: Page, selector: string): Promise<Box> {
  const found = await page.locator(selector).first().boundingBox();

  if (found === null) throw new Error(`${selector} is not on the screen`);

  return found;
}

// A point on the picture, as shares of its width and height.
async function on(page: Page, selector: string, across: number, down: number): Promise<Point> {
  const at = await box(page, selector);

  return { x: at.x + at.width * across, y: at.y + at.height * down };
}

interface Clip {
  time: number;
  paused: boolean;
  rate: number;
}

async function clip(page: Page, selector: string): Promise<Clip> {
  return page.$eval(selector, (element) => {
    const media = element as HTMLMediaElement;

    return { time: media.currentTime, paused: media.paused, rate: media.playbackRate };
  });
}

async function controlsShown(page: Page, within = PLAYER): Promise<boolean> {
  return (await page.$eval(`${within} ${CONTROLS}`, (element) => element.getAttribute("aria-hidden"))) === null;
}

async function said(page: Page, within = PLAYER): Promise<string> {
  return (await page.textContent(`${within} [data-video-said]`)) ?? "";
}

async function calls(page: Page): Promise<VideoCall[]> {
  return page.evaluate(() => window.videoCalls);
}

// A black ground's opacity, as the browser writes a colour: rgb, rgba or oklab, its alpha after a comma or a slash.
function blackAlpha(colour: string): number {
  const parts = /^(?:rgba?|oklab)\(([^)]*)\)$/.exec(colour)?.[1]?.split(/[\s,/]+/).filter(Boolean).map(Number) ?? [];

  if (parts.length < 3 || parts.slice(0, 3).some((part) => part !== 0)) return Number.NaN;

  return parts[3] ?? 1;
}

// How light words read on a dark translucent ground at its worst, laid over a white picture.
function worstContrast(ground: string): number {
  const alpha = blackAlpha(ground);
  const channel = (1 - alpha) * 255;
  const linear = (value: number): number => (value / 255 <= 0.04045 ? value / 255 / 12.92 : ((value / 255 + 0.055) / 1.055) ** 2.4);
  const lightness = linear(channel);

  return 1.05 / (lightness + 0.05);
}

describe.skipIf(!ready)("the still in a message bubble", () => {
  for (const width of WIDTHS) {
    for (const scheme of SCHEMES) {
      test(`runs to its bubble's edges with no corner or edge of its own, at ${width} width in ${scheme}`, async () => {
        const { context, page } = await session("still", width, scheme);

        for (const name of ["wide", "tall", "unknown"]) {
          const bubble = await box(page, `[data-bubble='${name}']`);
          const still = await box(page, `[data-bubble='${name}'] ${STILL}`);
          const look = await page.$eval(`[data-bubble='${name}'] ${STILL}`, (element) => {
            const style = getComputedStyle(element);
            const holder = getComputedStyle(element.parentElement!);

            return { radius: style.borderTopLeftRadius, edge: style.borderTopWidth, outline: style.outlineStyle, cut: holder.overflow, holderRadius: holder.borderTopLeftRadius };
          });

          expect([still.x, still.y, still.width]).toEqual([bubble.x, bubble.y, bubble.width]);
          expect(look).toEqual({ radius: "0px", edge: "0px", outline: "none", cut: "hidden", holderRadius: look.holderRadius });
          expect(Number.parseFloat(look.holderRadius)).toBeGreaterThan(0);
        }

        // The caption stands under it in the bubble's inner room.
        const caption = await box(page, "[data-bubble='wide'] [data-caption]");
        const wide = await box(page, `[data-bubble='wide'] ${STILL}`);

        expect(caption.y).toBe(wide.y + wide.height);
        await context.close();
      });

      test(`stands at its video's shape under the twenty rem cap, known or read from the file, at ${width} width in ${scheme}`, async () => {
        const { context, page } = await session("still", width, scheme);
        const wide = await box(page, `[data-bubble='wide'] [data-video-frame]`);
        const tall = await box(page, `[data-bubble='tall'] [data-video-frame]`);

        await page.locator(`[data-bubble='unknown'] [data-video-length]`).waitFor();

        const unknown = await box(page, `[data-bubble='unknown'] [data-video-frame]`);
        const tallBubble = await box(page, "[data-bubble='tall']");

        // The bubble is at most 320px wide: the wide video fills it, the tall one stops at the cap.
        expect(wide.width).toBe(320);
        expect(wide.height).toBeCloseTo(180, 0);
        expect(tall.height).toBe(320);
        expect(tall.width).toBeCloseTo(180, 0);
        expect([unknown.width, Math.round(unknown.height)]).toEqual([320, 180]);
        // A bubble fitted to what it holds takes the picture's width, so the picture runs to its edges.
        expect(tallBubble.width).toBeCloseTo(tall.width, 0);
        await context.close();
      });

      test(`shows its first frame under a play mark and its length, legible on any frame, at ${width} width in ${scheme}`, async () => {
        const { context, page } = await session("still", width, scheme);
        const scope = `[data-bubble='wide']`;

        await page.locator(`${scope} [data-video-length]`).waitFor();

        const still = await box(page, `${scope} ${STILL}`);
        const mark = await box(page, `${scope} [data-video-play]`);
        const markRadius = await page.$eval(`${scope} [data-video-play]`, (element) => getComputedStyle(element).borderTopLeftRadius);
        const length = await box(page, `${scope} [data-video-length]`);
        const look = await page.$eval(`${scope} [data-video-length]`, (element) => {
          const style = getComputedStyle(element);

          return { text: element.textContent, colour: style.color, ground: style.backgroundColor, size: style.fontSize, figures: style.fontVariantNumeric, radius: style.borderTopLeftRadius };
        });
        const frame = await page.$eval(`${scope} ${STILL} video`, (element) => (element as HTMLVideoElement).getAttribute("src"));

        expect(frame).toBe("/videos/wide.mp4#t=0.1");
        expect(mark.x + mark.width / 2).toBeCloseTo(still.x + still.width / 2, 0);
        expect(mark.y + mark.height / 2).toBeCloseTo(still.y + still.height / 2, 0);
        expect([length.x - still.x, length.y - still.y]).toEqual([4, 4]);
        expect(look).toMatchObject({ text: "01:40", colour: "rgb(255, 255, 255)", size: "14px", figures: "tabular-nums", radius: "4px" });
        expect(worstContrast(look.ground)).toBeGreaterThanOrEqual(4.5);
        expect(markRadius).toBe("6px");
        expect(await page.getAttribute(`${scope} ${STILL}`, "aria-label")).toBe("Play wide.mp4");
        expect(await page.getAttribute(`${scope} ${STILL}`, "aria-busy")).toBe("false");
        expect(await page.locator(`${scope} [data-video-skeleton]`).count()).toBe(0);
        await context.close();
      });

      test(`opens the full player large on a press, playing and taking the sound from what played, at ${width} width in ${scheme}`, async () => {
        const { context, page } = await session("still", width, scheme);

        await page.$eval("[data-sound]", (element) => void (element as HTMLMediaElement).play());

        if (width === "desktop") await page.click(`[data-bubble='wide'] ${STILL}`);
        else await page.tap(`[data-bubble='wide'] ${STILL}`);

        const dialog = page.getByRole("dialog", { name: "wide.mp4" });

        await dialog.getByRole("region", { name: "wide.mp4 player" }).waitFor();

        const large = await box(page, `[role=dialog] ${PLAYER}`);
        const viewport = page.viewportSize()!;

        expect((await clip(page, `[role=dialog] ${PLAYER} video`)).paused).toBe(false);
        expect((await clip(page, "[data-sound]")).paused).toBe(true);
        expect(large.width).toBe(viewport.width);
        expect(large.height).toBeGreaterThan(viewport.height / 2);
        await context.close();
      });

      test(`closes its large view on Escape and on the back gesture, telling where it stood, at ${width} width in ${scheme}`, async () => {
        const { context, page } = await session("still", width, scheme);
        const still = `[data-bubble='tall'] ${STILL}`;

        await page.click(still);
        await page.locator(`[role=dialog] ${PLAYER}`).waitFor();
        await page.keyboard.press("Escape");
        await page.locator("[role=dialog]").waitFor({ state: "detached" });

        expect((await calls(page)).at(-1)).toEqual({ name: "position", args: [0, 0] });

        await page.click(still);
        await page.locator(`[role=dialog] ${PLAYER}`).waitFor();
        await page.evaluate(() => history.back());
        await page.locator("[role=dialog]").waitFor({ state: "detached" });
        await context.close();
      });
    }
  }

  for (const scheme of SCHEMES) {
    test(`changes its play mark on hover and on press, in ${scheme}`, async () => {
      const { context, page } = await session("still", "desktop", scheme);
      const mark = `[data-bubble='wide'] [data-video-play]`;
      const ground = (): Promise<string> => page.$eval(mark, (element) => getComputedStyle(element).backgroundColor);
      const rest = await ground();

      await page.hover(`[data-bubble='wide'] ${STILL}`);
      await page.waitForFunction(([selector, resting]) => getComputedStyle(document.querySelector(selector!)!).backgroundColor !== resting, [mark, rest]);

      const hovered = await ground();

      await page.mouse.down();

      const pressed = await ground();

      await page.mouse.up();

      expect(blackAlpha(rest)).toBe(0.6);
      expect(hovered).not.toBe(rest);
      expect(pressed).not.toBe(rest);
      await context.close();
    });
  }

  test("says why in place of its play mark where its file refuses", async () => {
    const { context, page } = await session("still", "mobile", "dark");
    const scope = "[data-bubble='broken']";

    await page.locator(`${scope} [data-video-failed]`).waitFor();

    expect(await page.textContent(`${scope} [data-video-failed]`)).toBe("The video could not be played");
    expect(await page.locator(`${scope} [data-video-play], ${scope} [data-video-skeleton]`).count()).toBe(0);
    await context.close();
  });

  test("answers its keys while it stands large in its dialog", async () => {
    const { context, page } = await session("still", "desktop", "light");
    const video = `[role=dialog] ${PLAYER} video`;

    await page.click(`[data-bubble='wide'] ${STILL}`);
    await page.locator(video).waitFor();
    await page.locator(`[role=dialog] ${PLAYER} [data-video-toggle]`).waitFor();
    await page.keyboard.press("ArrowRight");

    expect((await clip(page, video)).time).toBe(5);

    await page.keyboard.press("k");

    expect((await clip(page, video)).paused).toBe(true);
    await context.close();
  });

  test("answers a finger's double tap while it stands large in its dialog", async () => {
    const { context, page, cdp } = await session("still", "mobile", "dark");
    const video = `[role=dialog] ${PLAYER} video`;

    await page.tap(`[data-bubble='wide'] ${STILL}`);
    await page.locator(`[role=dialog] ${PLAYER} [data-video-toggle]`).waitFor();

    const right = await on(page, video, 0.75, 0.3);

    await tap(cdp, right);
    await tap(cdp, right);

    expect((await clip(page, video)).time).toBe(10);
    expect(await said(page, `[role=dialog] ${PLAYER}`)).toBe("Forward 10 seconds");
    await context.close();
  });
});

describe.skipIf(!ready)("the full player", () => {
  for (const width of WIDTHS) {
    for (const scheme of SCHEMES) {
      test(`stands on its own black ground in light words, at ${width} width in ${scheme}`, async () => {
        const { context, page } = await session("full", width, scheme);
        const look = await page.$eval(PLAYER, (element) => {
          const controls = element.querySelector("[data-video-controls]")!;

          return {
            ground: getComputedStyle(element).backgroundColor,
            bar: getComputedStyle(controls).backgroundColor,
            clock: getComputedStyle(element.querySelector("[data-video-clock]")!).color
          };
        });

        expect([blackAlpha(look.ground), blackAlpha(look.bar), look.clock]).toEqual([1, 0.75, "rgb(255, 255, 255)"]);
        expect(await page.getAttribute(PLAYER, "aria-label")).toBe("walk.mp4 player");
        await context.close();
      });

      test(`lets its controls go while it plays and tells where it stands, at ${width} width in ${scheme}`, async () => {
        const { context, page } = await session("full", width, scheme, { clock: true });

        await page.click("[data-video-start]");

        expect((await clip(page, `${PLAYER} video`)).paused).toBe(false);
        expect(await controlsShown(page)).toBe(true);

        await page.clock.runFor(5_100);

        expect(await controlsShown(page)).toBe(false);
        expect((await calls(page)).filter((call) => call.name === "position")).toEqual([{ name: "position", args: [7, 0] }]);
        await context.close();
      });
    }
  }

  test("plays and pauses on a mouse press, and its keys skip by j and l, nudge by the arrows, step the volume and turn on subtitles", async () => {
    const { context, page } = await session("full", "desktop", "dark");
    const video = `${PLAYER} video`;

    const picture = await on(page, video, 0.2, 0.3);

    await page.mouse.click(picture.x, picture.y);
    expect((await clip(page, video)).paused).toBe(false);

    await page.keyboard.press("l");
    await page.keyboard.press("l");
    await page.keyboard.press("j");
    expect((await clip(page, video)).time).toBe(10);
    expect(await said(page)).toBe("Back 10 seconds");

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowLeft");
    expect((await clip(page, video)).time).toBe(15);
    expect(await said(page)).toBe("Back 5 seconds");

    await page.keyboard.press("ArrowDown");
    expect(await said(page)).toMatch(/^Volume \d+%$/);

    await page.keyboard.press("c");
    expect(await said(page)).toBe("Subtitles English");

    await page.keyboard.press(" ");
    expect((await clip(page, video)).paused).toBe(true);
    await context.close();
  });

  test("brings its controls back as the pointer moves", async () => {
    const { context, page } = await session("full", "desktop", "light", { clock: true });

    await page.click("[data-video-start]");
    await page.mouse.move(10, 10);
    await page.clock.runFor(2_600);
    expect(await controlsShown(page)).toBe(false);

    const middle = await on(page, PLAYER, 0.5, 0.4);

    await page.mouse.move(middle.x, middle.y);
    expect(await controlsShown(page)).toBe(true);
    await context.close();
  });

  for (const width of WIDTHS) {
    test(`stands every control inside its own width, gathering what does not fit, at ${width} width`, async () => {
      const { context, page } = await session("full", width, "light");
      const player = await box(page, PLAYER);
      const buttons = await page.$$eval(`${PLAYER} ${CONTROLS} button`, (found) => found.map((one) => one.getBoundingClientRect().right));

      expect(Math.max(...buttons)).toBeLessThanOrEqual(player.x + player.width);

      if (width === "mobile") {
        await page.getByRole("button", { name: "More" }).click();

        const items = await page.getByRole("menuitem").allTextContents();

        expect(items.map((item) => item.trim())).toEqual(["Subtitles", "Playback speed 1×", "Turn the picture"]);
      } else {
        expect(await page.locator("[data-video-more]").count()).toBe(0);
        expect(await page.getByRole("slider", { name: "Volume" }).count()).toBe(1);
      }

      await context.close();
    });
  }

  test("answers no key while a menu stands open over it", async () => {
    const { context, page } = await session("full", "desktop", "light");
    const video = `${PLAYER} video`;

    await page.getByRole("button", { name: "Playback speed 1×" }).click();
    await page.getByRole("menu").waitFor();
    await page.keyboard.press("ArrowRight");

    expect((await clip(page, video)).time).toBe(0);
    await context.close();
  });

  test("takes itself to the browser's full screen, its tooltips drawn inside it", async () => {
    const { context, page } = await session("full", "desktop", "light");

    await page.click("[data-video-fullscreen]");
    await page.waitForFunction(() => document.fullscreenElement?.matches("[data-video-player]") === true);
    await page.hover(`${PLAYER} [data-video-toggle]`);
    await page.locator(`${PLAYER} [role=tooltip]`).first().waitFor();

    expect(await page.getAttribute("[data-video-fullscreen]", "aria-label")).toBe("Exit full screen");
    await context.close();
  });

  test("keeps the controls a finger's tap brought, and hides them on the next tap", async () => {
    const { context, page, cdp } = await session("full", "mobile", "light", { clock: true });
    const middle = await on(page, `${PLAYER} video`, 0.5, 0.3);

    await page.tap("[data-video-start]");
    await page.clock.runFor(2_600);
    expect(await controlsShown(page)).toBe(false);

    await tap(cdp, middle);
    await page.clock.runFor(350);
    expect(await controlsShown(page)).toBe(true);
    await page.clock.runFor(1_000);
    expect(await controlsShown(page)).toBe(true);

    await tap(cdp, middle);
    await page.clock.runFor(350);
    expect(await controlsShown(page)).toBe(false);
    await context.close();
  });

  test("skips ten seconds on a double tap of either half", async () => {
    const { context, page, cdp } = await session("full", "mobile", "dark", { clock: true });
    const video = `${PLAYER} video`;

    await page.$eval(video, (element) => void ((element as HTMLMediaElement).currentTime = 50));

    const left = await on(page, video, 0.25, 0.3);
    const right = await on(page, video, 0.75, 0.3);

    await tap(cdp, left);
    await tap(cdp, left);
    expect((await clip(page, video)).time).toBe(40);
    expect(await page.textContent("[data-video-cue]")).toBe("Back 10 seconds");

    await page.clock.runFor(1_000);
    await tap(cdp, right);
    await tap(cdp, right);
    expect((await clip(page, video)).time).toBe(50);
    await context.close();
  });

  test("plays faster under a held finger and gives the speed back as it lifts", async () => {
    const { context, page, cdp } = await session("full", "mobile", "light", { clock: true });
    const video = `${PLAYER} video`;

    await page.tap("[data-video-start]");

    const middle = await on(page, video, 0.5, 0.3);

    await touch(cdp, "touchStart", middle);
    await page.clock.runFor(600);
    expect((await clip(page, video)).rate).toBe(2);
    expect(await page.textContent("[data-video-cue]")).toBe("Speed 2×");

    await touch(cdp, "touchEnd");
    expect((await clip(page, video)).rate).toBe(1);
    await context.close();
  });

  test("moves the position on a sideways drag and the volume on a drag down its right half", async () => {
    const { context, page, cdp } = await session("full", "mobile", "dark");
    const video = `${PLAYER} video`;

    await drag(cdp, await on(page, video, 0.2, 0.3), await on(page, video, 0.7, 0.3));
    expect((await clip(page, video)).time).toBeCloseTo(LENGTH_SECONDS / 2, 0);

    await drag(cdp, await on(page, video, 0.8, 0.1), await on(page, video, 0.8, 0.5));
    expect(await said(page)).toMatch(/^Volume \d+%$/);
    expect((await clip(page, video)).time).toBeCloseTo(LENGTH_SECONDS / 2, 0);
    await context.close();
  });
});
