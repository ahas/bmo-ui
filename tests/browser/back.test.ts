import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// One press of the back gesture closes what floats over the screen, a tooltip standing over it or
// not (`docs/components.md`, "Floating things"). A dialog moves the focus onto its close control as
// it opens, and a menu hands the focus back to its own button as it goes, so a control named on
// hover is named at the moment of the press. The press belongs to the dialog or the drawer, not to
// the tooltip that names a control of it.
//
// The tooltip's leaving is drawn, as the layer's stylesheet draws it, so its element stands a
// moment after the tooltip has gone — the moment the press is answered in. Skipped where the
// browser build is not on the machine, as every browser check is.

const ready = touchReady();

async function bundle(): Promise<string> {
  const built = await Bun.build({
    entrypoints: [new URL("./back-harness.ts", import.meta.url).pathname],
    target: "browser",
    define: {
      "process.env.NODE_ENV": '"production"',
      __VUE_OPTIONS_API__: "false",
      __VUE_PROD_DEVTOOLS__: "false",
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false"
    }
  });

  return (await built.outputs.find((output) => output.kind === "entry-point")?.text()) ?? "";
}

let browser: Browser;
let script = "";

beforeAll(async () => {
  if (!ready) return;

  script = await bundle();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();
});

// A closed tooltip keeps its element on the page for as long as its leaving is drawn, at the length
// the layer's stylesheet gives a tooltip's leaving.
const PAGE = `
  @keyframes tooltip-out { to { opacity: 0 } }
  [data-tooltip][data-state="closed"] { animation: tooltip-out 150ms ease both; }
  [data-sheet="dialog"][data-state="closed"] { animation: tooltip-out 300ms ease both; }
  body { margin: 0; font: 16px sans-serif; }
`;

async function openPage(): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 400, height: 700 } });

  await page.setContent(`<style>${PAGE}</style><div id="box"></div>`);
  await page.addScriptTag({ type: "module", content: `${script}\nwindow.back = mountBack(document.getElementById("box"));` });
  await page.waitForFunction(() => "back" in window);

  return page;
}

interface Standing {
  layers: number;
  marked: boolean;
  open: string[];
}

async function standing(page: Page): Promise<Standing> {
  return page.evaluate(() => ({
    layers: (window as unknown as { back: { layerCount: () => number } }).back.layerCount(),
    marked: (history.state as Record<string, unknown> | null)?.bmoLayer !== undefined,
    open: [...document.querySelectorAll("[data-sheet][data-state=open]")].map((element) => element.getAttribute("data-sheet") ?? "")
  }));
}

// One press of the back gesture, after which nothing floats and nothing is registered. A layer is
// let go of as the press is answered and the thing it stood for closes a turn later, so what is
// waited on is the page rather than the registry alone.
async function pressBack(page: Page): Promise<void> {
  await page.evaluate(() => history.back());

  await page.waitForFunction(
    () =>
      (window as unknown as { back: { layerCount: () => number } }).back.layerCount() === 0 &&
      document.querySelector("[data-sheet][data-state=open]") === null,
    null,
    { timeout: 3000 }
  );
}

describe.skipIf(!ready)("the back gesture over a tooltip standing on the control", () => {
  test("closes a dialog in the one press, the tooltip the focus brought up under it", async () => {
    const page = await openPage();

    await page.click("#open-dialog");
    await page.waitForSelector('[data-sheet="dialog"][data-state="open"]');
    await page.waitForSelector('[data-tooltip="close"][data-state="instant-open"]');

    expect(await standing(page)).toMatchObject({ layers: 1, marked: true, open: ["dialog"] });

    await pressBack(page);

    const after = await standing(page);

    expect(after.open).toEqual([]);
    expect(after.marked).toBe(false);
    await page.close();
  });

  test("closes a drawer opened from a menu in the one press, the tooltip on the menu's button under it", async () => {
    const page = await openPage();

    await page.click("#open-menu");
    await page.click('[data-item="properties"]');
    await page.waitForSelector('[data-sheet="drawer"][data-state="open"]');
    await page.waitForSelector('[data-tooltip="more"][data-state="instant-open"]');

    expect(await standing(page)).toMatchObject({ layers: 1, marked: true, open: ["drawer"] });

    await pressBack(page);

    const after = await standing(page);

    expect(after.open).toEqual([]);
    expect(after.marked).toBe(false);
    await page.close();
  });

  // One press of a screen's own that takes down a dialog and the drawer under it asks for two steps back. Asked for
  // together, the browser takes one and the other is lost, and whatever floats next stands with no entry of its own.
  test("two floating things taken down in one press leave the history as it was, and the next one is closed by back", async () => {
    const page = await openPage();
    const stand = (dialog: boolean, drawer: boolean): Promise<void> =>
      page.evaluate(([one, other]) => (window as unknown as { back: { stand: (dialog: boolean, drawer: boolean) => void } }).back.stand(one!, other!), [dialog, drawer]);
    // Whether the page stands on its own entry: an entry of a layer carries the page's state with the layer's mark.
    const based = (): Promise<boolean> =>
      page.evaluate(() => {
        const state = history.state as Record<string, unknown> | null;

        return state?.base === true && state.bmoLayer === undefined;
      });
    const settled = (layers: number, sheets: number): Promise<unknown> =>
      page.waitForFunction(
        ([count, open]) =>
          (window as unknown as { back: { layerCount: () => number } }).back.layerCount() === count &&
          document.querySelectorAll("[data-sheet][data-state=open]").length === open,
        [layers, sheets],
        { timeout: 3000 }
      );

    await page.evaluate(() => history.replaceState({ base: true }, ""));
    await stand(false, true);
    await settled(1, 1);
    await stand(true, true);
    await settled(2, 2);

    expect(await based()).toBe(false);

    await stand(false, false);
    await settled(0, 0);
    await page.waitForFunction(() => (history.state as Record<string, unknown> | null)?.bmoLayer === undefined, null, { timeout: 3000 });

    expect(await based()).toBe(true);

    // What floats next has an entry of its own, and one press of back closes it without leaving the page.
    await stand(false, true);
    await settled(1, 1);
    await page.waitForFunction(() => (history.state as Record<string, unknown> | null)?.bmoLayer !== undefined, null, { timeout: 3000 });
    await pressBack(page);

    expect(await based()).toBe(true);
    await page.close();
  });

  // A dialog's leaving is drawn, so it is still on the page a moment after it closed, and the library hands the key
  // to it for that moment. A press of back made in it is the drawer's all the same.
  test("a press made while a dialog just closed is still leaving closes the drawer under it", async () => {
    const page = await openPage();
    const stand = (dialog: boolean, drawer: boolean): Promise<void> =>
      page.evaluate(([one, other]) => (window as unknown as { back: { stand: (dialog: boolean, drawer: boolean) => void } }).back.stand(one!, other!), [dialog, drawer]);

    await stand(false, true);
    await page.waitForSelector('[data-sheet="drawer"][data-state="open"]');
    await stand(true, true);
    await page.waitForSelector('[data-sheet="dialog"][data-state="open"]');
    await page.waitForFunction(() => (window as unknown as { back: { layerCount: () => number } }).back.layerCount() === 2);

    await stand(false, true);
    // The dialog is leaving and its step back has landed: the press is made now.
    await page.waitForSelector('[data-sheet="dialog"][data-state="closed"]');
    await page.waitForFunction(() => (window as unknown as { back: { layerCount: () => number } }).back.layerCount() === 1);
    await pressBack(page);

    const after = await standing(page);

    expect(after.open).toEqual([]);
    expect(after.marked).toBe(false);
    await page.close();
  });
});

