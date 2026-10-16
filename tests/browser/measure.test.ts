import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright-core";

import { measureSource } from "./measure-source";
import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

declare global {
  // What the module calls itself once it is loaded into a page.
  const measure: typeof import("./measure");
}

const ready = touchReady();

// A page laid out with the shapes a check keeps asking about: a column with one gap between its
// rows, a strip whose ends line up, a line too long for its box, something in the markup that is
// not on the screen, and text on a surface it does not paint itself.
const FIXTURE = `<meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { margin: 0; background: rgb(0, 0, 0); font-family: sans-serif; }
    #rows > div { height: 40px; margin-bottom: 12px; width: 200px; font-size: 14px; }
    #strip { display: flex; gap: 8px; align-items: center; }
    #strip > span { display: inline-block; height: 20px; width: 30px; }
    #cut { width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #gone { display: none; }
    #text { color: rgb(255, 255, 255); }
    #card { background: rgb(255, 255, 255); }
    #modern { color: oklch(0.37 0.013 285.805); }
    #veil { background: rgba(255, 255, 255, 0.5); }
    #ticking { display: flex; gap: 8px; color: rgb(255, 255, 255); }
    #slide { width: 20px; height: 4px; transform: translateX(0); }
  </style>
  <div id="rows"><div>one</div><div>two</div><div>three</div></div>
  <div id="strip"><span>a</span><span>b</span><span>c</span></div>
  <div id="cut">a line far longer than the hundred pixels it was given to stand in</div>
  <div id="gone">hidden</div>
  <div id="text">on the page's own surface</div>
  <div id="card"><span id="modern">a colour the stylesheet states in oklch</span></div>
  <div id="veil"><span id="veiled">on a surface that only half covers the page</span></div>
  <img id="drawn" width="40" height="30" src="data:image/gif;base64,R0lGODlhBAADAIAAAP///wAAACH5BAEAAAAALAAAAAAEAAMAAAIDhI9WADs=">
  <button id="twice">named once</button><span id="twice">and again</span>
  <div id="ticking"><span id="figure">9%</span><span id="beside">beside</span><div id="slide"></div></div>
  <img id="broken" width="40" height="30" src="data:image/gif;base64,bm90IGEgcGljdHVyZQ==">`;

let browser: Browser | null = null;
let page: Page;

beforeAll(async () => {
  if (!ready) {
    return;
  }

  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 800, height: 600 } });

  await page.setContent(FIXTURE);
  await page.addScriptTag({ type: "module", content: `${measureSource()}\ninstall();` });
  await page.waitForFunction(() => "measure" in window);
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();
}, BROWSER_HOOK_MS);

describe("the measuring module's source", () => {
  test("is JavaScript a browser takes as it stands", () => {
    const source = measureSource();

    expect(source).toContain("export function install");
    expect(source).not.toContain("export interface");
    expect(source).not.toContain("selector: string");
  });
});

describe.skipIf(!ready)("measuring a page instead of looking at one", () => {
  test("reads the gap between rows and the axis they stand on", async () => {
    expect(await page.evaluate(() => measure.gaps("#rows > div")))
      .toEqual({ axis: "y", count: 3, gaps: [12, 12], even: true });
  });

  test("reads a strip left to right", async () => {
    const strip = await page.evaluate(() => measure.gaps("#strip > span"));

    expect(strip.axis).toBe("x");
    expect(strip.gaps).toEqual([8, 8]);
  });

  test("says which edges line up", async () => {
    const lined = await page.evaluate(() => measure.edges("#rows > div"));

    expect(lined.aligned).toEqual({ left: true, right: true, top: false, bottom: false });
    expect(lined.top).toEqual([0, 52, 104]);
  });

  test("says whether a row's contents share one vertical centre", async () => {
    const strip = await page.evaluate(() => measure.middles("#strip, #strip > span"));

    expect(strip.middle).toEqual([166, 166, 166, 166]);
    expect(strip.centred).toBe(true);
    expect(await page.evaluate(() => measure.middles("#rows > div")).then(rows => rows.centred)).toBe(false);
  });

  test("finds what is on the screen and what only stands in the markup", async () => {
    const found = await page.evaluate(() => measure.find("#rows > div, #gone"));

    expect(found).toHaveLength(4);
    expect(found.map(one => one.visible)).toEqual([true, true, true, false]);
    expect(found[0]!.text).toBe("one");
    expect(found[0]!.box).toMatchObject({ w: 200, h: 40 });
  });

  test("answers with the value a rule settled on", async () => {
    const settled = await page.evaluate(() => measure.styles("#rows > div", ["font-size", "height"]));

    expect(settled[0]).toEqual({ "font-size": "14px", height: "40px" });
  });

  test("says a line was cut off rather than leaving it to be seen", async () => {
    const cut = await page.evaluate(() => measure.clipping("#cut"));
    const whole = await page.evaluate(() => measure.clipping("#rows > div"));

    expect(cut[0]).toMatchObject({ clipped: true, ellipsis: true, clientW: 100 });
    expect(cut[0]!.scrollW).toBeGreaterThan(100);
    expect(whole[0]!.clipped).toBe(false);
  });

  test("works out the contrast against the surface the text is drawn on", async () => {
    const contrast = await page.evaluate(() => measure.contrast("#text"));

    expect(contrast[0]).toMatchObject({ background: "rgb(0, 0, 0)", ratio: 21, passesText: true });
  });

  test("converts a colour the stylesheet states in another space", async () => {
    const contrast = await page.evaluate(() => measure.contrast("#modern"));

    expect(contrast[0]).toMatchObject({ background: "rgb(255, 255, 255)", ratio: 10.43 });
  });

  test("lays a see-through surface over what is under it", async () => {
    const contrast = await page.evaluate(() => measure.contrast("#veiled"));

    expect(contrast[0]!.background).toBe("rgb(128, 128, 128)");
    expect(contrast[0]!.ratio).toBeGreaterThan(5);
    expect(contrast[0]!.ratio).toBeLessThan(5.6);
  });

  // A picture that never arrived still stands in the layout with the box its attributes gave it,
  // so where it is and how big it is says nothing about whether anybody can see it.
  test("says whether a picture on the screen actually arrived", async () => {
    const [drawn] = await page.evaluate(() => measure.pictures("#drawn"));
    const [broken] = await page.evaluate(() => measure.pictures("#broken"));

    expect(drawn).toMatchObject({ drawn: true, naturalW: 4, naturalH: 3 });
    expect(drawn!.box).toMatchObject({ w: 40, h: 30 });
    expect(broken).toMatchObject({ drawn: false, naturalW: 0, naturalH: 0 });
    // The broken one is laid out all the same, which is exactly why the box cannot be the answer.
    expect(broken!.box.w).toBeGreaterThan(0);
  });

  test("reads nothing off what is not a picture", async () => {
    expect(await page.evaluate(() => measure.pictures("#rows > div"))).toEqual([]);
  });

  // Two elements answering to one name is invisible on the screen and in a snapshot alike; the page
  // is the one place that can count them.
  test("names every id that stands more than once, and only those", async () => {
    expect(await page.evaluate(() => measure.sharedIds())).toEqual([
      { id: "twice", count: 2, carriers: [{ tag: "button", text: "named once" }, { tag: "span", text: "and again" }] }
    ]);
  });

  // A figure gaining a place pushes what stands after it; the figure itself only changed its text,
  // and a fill moved by its own transform moves by design.
  test("tells what a ticking figure pushed from what only changed its own text", async () => {
    expect(await page.evaluate(() => measure.watch("#ticking > *"))).toBe(2);

    await page.evaluate(() => {
      document.querySelector("#figure")!.textContent = "100%";
      (document.querySelector("#slide") as HTMLElement).style.transform = "translateX(5px)";
    });
    await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));

    const moved = await page.evaluate(() => measure.drift());

    const beside = moved.drifts.find(one => one.text === "beside");

    expect(moved).toMatchObject({ watched: 2, gone: 0, moved: 2, pushed: 1 });
    expect(moved.frames).toBeGreaterThan(0);
    expect(moved.drifts.find(one => one.text === "9%")).toMatchObject({ last: "100%", textChanged: true, moved: { left: 0 } });
    expect(beside).toMatchObject({ textChanged: false, moved: { top: 0, bottom: 0 } });
    expect(beside!.moved.left).toBeGreaterThan(0);
  });

  test("says what screen the numbers were measured on", async () => {
    expect(await page.evaluate(() => measure.viewport()))
      .toMatchObject({ width: 800, height: 600, scrollY: 0 });
  });
});
