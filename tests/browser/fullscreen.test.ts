import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright-core";
import type { Browser, Page } from "playwright-core";
import { BROWSER_HOOK_MS, touchReady } from "./touch";

const ready = touchReady();
const built = ready ? await Bun.build({
  entrypoints: [new URL("../../app/domain/fullscreen.ts", import.meta.url).pathname],
  target: "browser",
}) : null;
const script = built === null ? "" : await built.outputs[0]!.text();

let browser: Browser | null = null;

beforeAll(async () => {
  if (ready) {
    browser = await chromium.launch();
  }
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();
}, BROWSER_HOOK_MS);

// A feed whose video stands near its end, read from just above that end: taking the video out of the
// flow shortens the feed by more than the reader stands above it, so the scroll clamps. The settling
// runs on frames the test hands over itself, so no real second is waited on.
async function mount(): Promise<Page> {
  const page = await browser!.newPage();

  await page.setContent(`
    <div id="viewport" style="height:400px;width:300px;overflow-y:auto">
      <div id="content">
        <div style="height:2000px">older messages</div>
        <video id="video" tabindex="0" style="display:block;height:300px;width:300px;background:#000"></video>
        <div style="height:150px">newer messages</div>
      </div>
    </div>`);
  await page.addScriptTag({ type: "module", content: script + `
    window.queue = [];
    window.clock = 0;
    window.stopHold = holdThroughFullscreen(document, {
      now: () => window.clock,
      next: (step) => window.queue.push(step),
      cancel: () => { window.queue = []; },
    });
    window.keepPlace = keepPlace;
    window.tick = () => {
      window.clock += 100;
      const steps = window.queue;
      window.queue = [];
      steps.forEach((step) => step());
      return steps.length;
    };` });
  await page.waitForFunction(() => "tick" in window);
  await page.locator("#viewport").evaluate((e) => { e.scrollTop = e.scrollHeight - e.clientHeight - 150; });

  return page;
}

const top = (page: Page) => page.locator("#viewport").evaluate((e) => Math.round(e.scrollTop));

// Every frame of the settling, as the window would give them, once letting go has been announced.
async function settle(page: Page): Promise<void> {
  await page.waitForFunction(() => (window as unknown as { queue: unknown[] }).queue.length > 0);
  await page.waitForFunction(() => (window as unknown as { tick(): number }).tick() === 0);
}

// The press that reaches the video is a key on it, which is what asks for full screen.
async function fullscreen(page: Page): Promise<void> {
  await page.evaluate(() => {
    const video = document.getElementById("video") as HTMLVideoElement;
    video.addEventListener("keydown", () => void video.requestFullscreen(), { once: true });
    video.focus();
  });
  await page.keyboard.press("F9");
  await page.waitForFunction(() => document.fullscreenElement !== null);
}

async function letGo(page: Page): Promise<void> {
  await page.evaluate(() => document.exitFullscreen());
  await page.waitForFunction(() => document.fullscreenElement === null);
}

describe.skipIf(!ready)("a feed through a video's full screen in Chromium", () => {
  // The browser puts back a bare clamp itself; what it leaves is a part moved while the video was
  // full screen, as a list following its end does when the clamp reads as the end.
  test("puts back the offset a part was moved from while its video was full screen", async () => {
    const page = await mount();
    const before = await top(page);

    await fullscreen(page);
    expect(await top(page)).toBeLessThan(before);
    await page.locator("#viewport").evaluate((e) => { e.scrollTop = 0; });
    await letGo(page);
    await settle(page);
    expect(await top(page)).toBe(before);
    await page.close();
  }, 20_000);

  test("a part that names its own place is put back by it, not by its offset", async () => {
    const page = await mount();

    await page.evaluate(() => {
      const viewport = document.getElementById("viewport")!;
      const keep = (window as unknown as { keepPlace(part: HTMLElement, take: (part: HTMLElement) => () => void): () => void }).keepPlace;
      keep(viewport, (part) => () => { part.scrollTop = part.scrollHeight; });
    });
    await fullscreen(page);
    await page.locator("#content").evaluate((e) => {
      const row = document.createElement("div");
      row.style.height = "500px";
      e.append(row);
    });
    await letGo(page);
    await settle(page);
    expect(await page.locator("#viewport").evaluate((e) => e.scrollHeight - e.scrollTop - e.clientHeight)).toBeLessThanOrEqual(1);
    await page.close();
  }, 20_000);

  test("an iPhone's own player is caught on the video, and the reader scrolling ends the settling", async () => {
    const page = await mount();
    const before = await top(page);

    await page.locator("#video").click();
    await page.evaluate(() => {
      const video = document.getElementById("video")!;
      video.dispatchEvent(new Event("webkitbeginfullscreen"));
      document.getElementById("viewport")!.scrollTop = 0;
      video.dispatchEvent(new Event("webkitendfullscreen"));
    });
    expect(await top(page)).toBe(before);
    await page.evaluate(() => {
      const viewport = document.getElementById("viewport")!;
      viewport.dispatchEvent(new WheelEvent("wheel", { bubbles: true }));
      viewport.scrollTop = 500;
    });
    expect(await page.evaluate(() => (window as unknown as { tick(): number }).tick())).toBe(0);
    expect(await top(page)).toBe(500);
    await page.close();
  }, 20_000);
});
