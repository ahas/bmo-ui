import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright-core";

import { touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

const ready = touchReady();
const built = ready ? await Bun.build({
  entrypoints: [new URL("../../app/domain/scroll-within.ts", import.meta.url).pathname],
  target: "browser",
}) : null;
const script = built === null ? "" : await built.outputs[0]!.text();

// A frame that fills the window, as a long document stands in it: a fixed frame that clips, a bar
// across its top, and under the bar the body's own scroller with a heading near the end of the
// text. The heading cannot reach the top of the scroller, which is what makes the browser's own
// scrollIntoView push the rest of the way by scrolling the clipped frame. The frame holds more
// than it shows — a part laid out past its lower edge — so it has room to be pushed.
const FIXTURE = `<meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body { margin: 0; }</style>
  <div id="frame" style="position:fixed;inset:0;display:flex;flex-direction:column;overflow:hidden">
    <div id="bar" style="height:48px;flex:none">bar</div>
    <div id="scroller" style="flex:1;min-height:0;overflow-y:auto">
      <div style="height:1600px">text</div>
      <h2 id="heading" style="height:24px;margin:0">last section</h2>
      <div style="height:100px">its end</div>
    </div>
    <div style="position:absolute;left:0;top:100%;height:106px;width:10px"></div>
  </div>`;

let browser: Browser;
let page: Page;

async function mount(): Promise<void> {
  await page.setContent(FIXTURE);
  await page.addScriptTag({ type: "module", content: script + "\nwindow.scrollWithin = scrollWithin;" });
  await page.waitForFunction(() => "scrollWithin" in window);
}

async function where() {
  return page.evaluate(() => ({
    frame: document.getElementById("frame")!.scrollTop,
    scroller: document.getElementById("scroller")!.scrollTop,
    bar: document.getElementById("bar")!.getBoundingClientRect().top,
    heading: document.getElementById("heading")!.getBoundingClientRect().top - document.getElementById("scroller")!.getBoundingClientRect().top
  }));
}

describe.skipIf(!ready)("scrolling a heading into view inside its own scroller", () => {
  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  });

  afterAll(async () => {
    await browser?.close();
  });

  test("the browser's own scrollIntoView pushes the clipped frame up", async () => {
    await mount();
    await page.evaluate(() => document.getElementById("heading")!.scrollIntoView({ block: "start" }));

    const after = await where();

    expect(after.frame).toBeGreaterThan(0);
    expect(after.bar).toBeLessThan(0);
  });

  test("scrollWithin moves the scroller alone and leaves the frame where it stood", async () => {
    await mount();
    await page.evaluate(() => (window as unknown as { scrollWithin: (element: Element, block: string) => void }).scrollWithin(document.getElementById("heading")!, "start"));

    const after = await where();

    expect(after.frame).toBe(0);
    expect(after.bar).toBe(0);
    expect(after.scroller).toBeGreaterThan(1000);
  });

  test("a heading the scroller can reach stands at its top, less the margin it was given", async () => {
    await mount();
    await page.evaluate(() => {
      document.getElementById("heading")!.style.scrollMarginTop = "16px";
      document.querySelector<HTMLElement>("#scroller > div:last-child")!.style.height = "2000px";
      (window as unknown as { scrollWithin: (element: Element, block: string) => void }).scrollWithin(document.getElementById("heading")!, "start");
    });

    const after = await where();

    expect(after.frame).toBe(0);
    expect(Math.round(after.heading)).toBe(16);
  });

  test("centre puts the element in the middle of the scroller", async () => {
    await mount();
    await page.evaluate(() => {
      document.querySelector<HTMLElement>("#scroller > div:last-child")!.style.height = "2000px";
      (window as unknown as { scrollWithin: (element: Element, block: string) => void }).scrollWithin(document.getElementById("heading")!, "center");
    });

    const after = await where();
    const height = await page.evaluate(() => document.getElementById("scroller")!.clientHeight);

    expect(after.frame).toBe(0);
    expect(Math.abs(after.heading + 12 - height / 2)).toBeLessThan(2);
  });
});
