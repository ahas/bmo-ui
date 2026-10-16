import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// What opens over another stands over it (`docs/components.md`, "Floating things"): a dialog
// mounted with the app, opened from a drawer mounted after it, is drawn over the drawer and stays
// when the drawer goes. Which of the two the browser draws on top is only the browser's to say. The
// unkeyed page shows the fault the openings key answers, so the check is one that can fail. Skipped
// where the browser build is not on the machine, as every browser check is.

const ready = touchReady();

async function bundle(): Promise<string> {
  const built = await Bun.build({
    entrypoints: [new URL("./openings-harness.ts", import.meta.url).pathname],
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
const pages: Record<"keyed" | "unkeyed", Page> = {} as Record<"keyed" | "unkeyed", Page>;

beforeAll(async () => {
  if (!ready) return;

  const script = await bundle();

  browser = await chromium.launch();

  for (const keyed of [true, false]) {
    const page = await browser.newPage({ viewport: { width: 360, height: 640 } });

    await page.setContent(`<style>body { margin: 0 }</style><div id="box"></div>`);
    await page.addScriptTag({ type: "module", content: `${script}\nwindow.openings = mountOpenings(document.getElementById("box"), { keyed: ${keyed} });` });
    await page.waitForFunction(() => "openings" in window);
    pages[keyed ? "keyed" : "unkeyed"] = page;
  }
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();
});

type Step = "openDrawer" | "closeDrawer" | "openDialog" | "closeDialog";

// Takes the steps in order and says what stands drawn on top over the drawer's own area.
async function topAfter(page: Page, steps: Step[]): Promise<string | null> {
  return await page.evaluate(async (steps) => {
    const harness = (window as unknown as { openings: Record<string, () => void> }).openings;

    for (const step of steps) {
      harness[step]!();
      await new Promise((settled) => requestAnimationFrame(settled));
    }

    return document.elementFromPoint(40, 300)?.getAttribute("data-floating") ?? null;
  }, steps);
}

describe.skipIf(!ready)("a dialog mounted with the app, opened from a drawer mounted after it", () => {
  test("unkeyed, it is drawn under the drawer", async () => {
    expect(await topAfter(pages.unkeyed, ["openDrawer", "openDialog"])).toBe("drawer");
  });

  test("keyed by its openings, it is drawn over the drawer, every time it opens", async () => {
    const page = pages.keyed;

    expect(await topAfter(page, ["openDrawer", "openDialog"])).toBe("dialog");
    expect(await topAfter(page, ["closeDialog", "closeDrawer", "openDrawer", "openDialog"])).toBe("dialog");
  });

  test("keyed, it stays when the drawer under it goes", async () => {
    expect(await topAfter(pages.keyed, ["closeDrawer"])).toBe("dialog");
  });
});
