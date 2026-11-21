import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright-core";

import { touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// Finding a cut line by what its box does, laid out by a real browser (`docs/components.md`,
// "Tooltips"). Whether words run past their box is the browser's own layout, so it is read here
// rather than off numbers made up for it.

const ready = touchReady();
const built = ready
  ? await Bun.build({
      entrypoints: [new URL("../../app/domain/cut-lines.ts", import.meta.url).pathname],
      target: "browser"
    })
  : null;
const script = built === null ? "" : await built.outputs[0]!.text();

const LONG = "A line of words far longer than the narrow box it is given to stand in";
const CUT = "overflow:hidden;white-space:nowrap;text-overflow:ellipsis";

const FIXTURE = `<meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body { margin: 0; font: 16px sans-serif; } div > * { width: 160px; }</style>
  <div>
    <p id="fits" style="${CUT}">short</p>
    <p id="cut" style="${CUT}"><span id="cut-word">${LONG}</span></p>
    <p id="clipped" style="overflow:hidden;white-space:nowrap">${LONG}</p>
    <p id="clamped" style="display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden">${LONG} ${LONG}</p>
    <span id="own-tip" data-grace-area-trigger style="display:block"><p id="inside-tip" style="${CUT}">${LONG}</p></span>
    <button id="row" type="button"><b>Label</b><p id="row-line" style="${CUT};margin:0">${LONG}</p></button>
    <button id="plain" type="button">short</button>
    <div id="card" style="position:relative"><a id="card-link" href="#card"><span id="card-face" style="position:absolute;inset:0"></span></a><b>Mark</b><p id="card-line" style="${CUT};margin:0">${LONG}</p></div>
    <div id="whole-card" style="position:relative"><a id="whole-link" href="#whole-card"><span id="whole-face" style="position:absolute;inset:0"></span></a><p style="${CUT};margin:0">short</p></div>
  </div>`;

let browser: Browser;
let page: Page;

async function at(id: string): Promise<string | null> {
  return await page.evaluate((one) => (window as unknown as { cutLineAt: (target: Element) => HTMLElement | null }).cutLineAt(document.getElementById(one)!)?.id ?? null, id);
}

async function within(id: string): Promise<string | null> {
  return await page.evaluate((one) => (window as unknown as { cutLineIn: (target: Element) => HTMLElement | null }).cutLineIn(document.getElementById(one)!)?.id ?? null, id);
}

describe.skipIf(!ready)("finding a line cut to fit its box", () => {
  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    await page.setContent(FIXTURE);
    await page.addScriptTag({ type: "module", content: `${script}\nwindow.cutLineAt = cutLineAt; window.cutLineIn = cutLineIn; window.lineWords = lineWords;` });
    await page.waitForFunction(() => "cutLineIn" in window);
  });

  afterAll(async () => {
    await browser?.close();
  });

  test("a line ending in an ellipsis is found only where its words run past the box", async () => {
    expect(await at("fits")).toBeNull();
    expect(await at("cut")).toBe("cut");
  });

  test("the pointer on a word inside the line finds the line holding it", async () => {
    expect(await at("cut-word")).toBe("cut");
  });

  test("words clipped with no ellipsis are not a cut line, and clamped lines are", async () => {
    expect(await at("clipped")).toBeNull();
    expect(await at("clamped")).toBe("clamped");
  });

  test("a line inside a tooltip of its own is left to that tooltip", async () => {
    expect(await at("inside-tip")).toBeNull();
    expect(await within("own-tip")).toBeNull();
  });

  test("a focus finds the cut line inside what took it, and nothing where none is cut", async () => {
    expect(await within("row")).toBe("row-line");
    expect(await within("plain")).toBeNull();
  });

  test("a link's face laid over a card reads the card's cut line, by the pointer and by the focus", async () => {
    expect([await at("card-face"), await within("card-link")]).toEqual(["card-line", "card-line"]);
    expect([await at("whole-face"), await within("whole-link")]).toEqual([null, null]);
  });

  test("its words are the line's own, read as one line", async () => {
    const words = await page.evaluate(() => (window as unknown as { lineWords: (line: HTMLElement) => string }).lineWords(document.getElementById("clamped")!));

    expect(words).toBe(`${LONG} ${LONG}`);
  });
});
