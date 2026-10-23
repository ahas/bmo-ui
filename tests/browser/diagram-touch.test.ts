import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { diagramPlace, fencedRules } from "./fenced-block";
import { BROWSER_HOOK_MS, openTouch, touchReady } from "./touch";

import type { CDPSession } from "playwright-core";
import type { TouchPoint } from "./touch";

// A diagram under fingers (`docs/components.md`, "Code and files"): two fingers pinch it, one finger
// on a fitted diagram scrolls the page past it, and one finger moves a zoomed one. What a finger is
// let do is the browser's own decision, read off the figure's touch-action, so it is checked with
// the browser's own touch input; skipped where the browser build is not on the machine.

const ready = touchReady();
const built = ready ? await Bun.build({ entrypoints: [new URL("../../app/domain/diagram.ts", import.meta.url).pathname], target: "browser" }) : null;
const script = built === null ? "" : await built.outputs[0]!.text();

const WIDE = ["flowchart LR", ...Array.from({ length: 6 }, (_, at) => `  N${at}[a box with a long label ${at}] --> N${at + 1}`)].join("\n");

let touch: Awaited<ReturnType<typeof openTouch>>;
let cdp: CDPSession;

// Fingers on the screen at once, each with its own id, as the browser's input protocol takes them.
async function fingers(type: "touchStart" | "touchMove" | "touchEnd", points: readonly TouchPoint[]): Promise<void> {
  await cdp.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: points.map((at, id) => ({ x: Math.round(at.x), y: Math.round(at.y), radiusX: 6, radiusY: 6, force: 1, id: id + 1 }))
  });
}

async function figureCentre(): Promise<TouchPoint> {
  const box = (await touch.page.locator("#out .markdown-diagram-figure").boundingBox())!;

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function transform(): Promise<string> {
  return touch.page.evaluate(() => document.querySelector<SVGSVGElement>("#out svg")!.style.transform);
}

async function mount(): Promise<void> {
  await touch.page.setContent(
    `<meta name="viewport" content="width=device-width,initial-scale=1"><style>body { margin: 0; } ${fencedRules()}</style>` +
      '<div style="height: 200px"></div><div id="out" class="markdown" style="margin: 0 16px"></div><div style="height: 2000px"></div>'
  );
  await touch.page.addScriptTag({ type: "module", content: `${script}\nwindow.draw = () => drawDiagrams(document.getElementById("out"), false);` });
  await touch.page.waitForFunction(() => "draw" in window);
  await touch.page.evaluate(async (html) => {
    document.getElementById("out")!.innerHTML = html;
    await (window as unknown as { draw: () => Promise<void> }).draw();
  }, diagramPlace(WIDE));
}

describe.skipIf(!ready)("a diagram under fingers", () => {
  beforeAll(async () => {
    expect(built?.success).toBe(true);

    touch = await openTouch();
    cdp = await touch.context.newCDPSession(touch.page);
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await touch?.close();
  }, BROWSER_HOOK_MS);

  test("is pinched larger by two fingers moving apart, and the page neither scrolls nor zooms", async () => {
    await mount();

    const centre = await figureCentre();
    const before = await touch.page.evaluate(() => ({ scroll: window.scrollY, zoom: window.visualViewport?.scale ?? 1 }));

    await fingers("touchStart", [{ x: centre.x - 20, y: centre.y }, { x: centre.x + 20, y: centre.y }]);

    for (let step = 1; step <= 8; step += 1) {
      await fingers("touchMove", [{ x: centre.x - 20 - step * 8, y: centre.y }, { x: centre.x + 20 + step * 8, y: centre.y }]);
      await touch.page.waitForTimeout(16);
    }

    await fingers("touchEnd", []);

    const scale = Number((await transform()).match(/scale\(([\d.]+)\)/)?.[1] ?? 1);
    const after = await touch.page.evaluate(() => ({ scroll: window.scrollY, zoom: window.visualViewport?.scale ?? 1 }));

    expect(scale).toBeGreaterThan(2);
    expect(after).toEqual(before);
  }, 60_000);

  test("lets one finger on a fitted diagram scroll the page, and moves a zoomed one under it", async () => {
    await mount();

    const centre = await figureCentre();

    await touch.swipe(centre, { x: centre.x, y: centre.y - 120 });
    await touch.page.waitForTimeout(300);

    expect(await touch.page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect(await transform()).toBe("");

    await touch.page.evaluate(() => window.scrollTo(0, 0));
    await touch.page.locator("#out .markdown-diagram-figure").evaluate((figure) => {
      figure.parentElement!.insertAdjacentHTML("beforeend", '<div class="markdown-diagram-tools"><button type="button" data-diagram-zoom="in"></button></div>');
    });
    await touch.page.evaluate(() => document.querySelector<HTMLButtonElement>("#out [data-diagram-zoom=in]")!.click());

    const zoomed = await transform();
    const at = await figureCentre();

    await touch.swipe(at, { x: at.x + 40, y: at.y });
    await touch.page.waitForTimeout(100);

    expect(await transform()).not.toBe(zoomed);
    expect(await transform()).toMatch(/^translate\(40px, 0px\)/);
    expect(await touch.page.evaluate(() => window.scrollY)).toBe(0);
  }, 60_000);
});
