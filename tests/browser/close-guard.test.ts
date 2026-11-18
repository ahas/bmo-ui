import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, BrowserContext, Page } from "playwright-core";

// A form's dialog asks before it closes only while its values differ from what it opened with
// (`docs/components.md`, "Forms" and "Floating things"): left untouched, whether opened for a new
// record with its defaults or with its data landing after it opened, and with its change put back
// or saved, it closes at once. Its close over one holding a change asks first with the dialog still
// standing under the question, since the modal's own close is a request to leave like any other.
// The back gesture over one holding a change asks first, as its close and Esc do: the question
// stands over the dialog, discard takes both away and leaves the history
// as it was, and every way out of the question keeps the dialog standing with an entry of its own,
// so the next press of back asks again. A focus handed back to the page while a picker stands open
// in the dialog, as a menu that opened the dialog hands it to its trigger, reaches the dialog as an
// outside focus it refuses on its own: that raises no question even once the form has turned dirty,
// and the guard still asks at every real request to close after it, and closes at once where the
// form is untouched. Esc and back reach the dialog the same way with the focus
// in a date or a time field's segment. The page is built as the layer's custom elements are, from
// the components that ship, and driven by a real Chromium at a phone's width and a desktop's.
// Skipped where the browser build is not on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/close-guard-harness.js" defer></script></head><body><div id="page"></div></body></html>`;

const OPEN = "[data-open]";
const CREATE = "[data-create]";
const REASON = "[data-reason]";
const SAVE = "[data-save]";
const LANDED = "Annual leave";
const FORM = "[role=dialog]:has([data-reason])";
const QUESTION = "[role=dialog]:has-text('Discard unsaved changes?')";

const WIDTHS = [
  { name: "a phone", width: 360, height: 740 },
  { name: "a desktop", width: 1280, height: 720 }
];

let out = "";
let script = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-close-guard-"));

  // The test runner names its own environment, which the build would read as a mode of its own; the
  // page is built as a host's script is, for production.
  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/close-guard-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "close-guard-harness.js")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

// The harness page at the address named, with no dialog open.
async function harness(width: number, height: number, address: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();

  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/close-guard-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}${address}`);

  return { context, page };
}

// The page with the form's dialog standing open for a new request, with its defaults and nothing to
// load.
async function created(width: number, height: number): Promise<{ context: BrowserContext; page: Page }> {
  const { context, page } = await harness(width, height, "/");

  await page.click(CREATE);
  await settledOn(page, 1);

  return { context, page };
}

// The page with the form's dialog standing open, its data landed after it opened. Where `beforeLanding`
// is handed, the reader does that first and the form says when it is ready.
async function opened(width: number, height: number, beforeLanding?: (page: Page) => Promise<void>): Promise<{ context: BrowserContext; page: Page }> {
  const { context, page } = await harness(width, height, beforeLanding === undefined ? "/" : "/?ready");

  await page.click(OPEN);
  await settledOn(page, 1);
  await beforeLanding?.(page);
  await page.evaluate((reason) => (window as unknown as { land: (reason: string) => void }).land(reason), LANDED);
  await page.waitForFunction((reason) => document.querySelector<HTMLTextAreaElement>("[data-reason]")?.value === reason, LANDED, { timeout: 3000 });

  return { context, page };
}

// The page with the form's dialog standing open and a change written into it.
async function changed(width: number, height: number): Promise<{ context: BrowserContext; page: Page }> {
  const { context, page } = await opened(width, height);

  await page.fill(REASON, "Family event");

  return { context, page };
}

// The focus handed back from outside while the dialog stands, as a menu that opened it hands the
// focus to its trigger once its own way out has played: it lands while the reader has a picker open
// in the dialog, whose hold on the focus stands above the dialog's, so the move reaches the dialog as
// an outside focus it refuses. The page's own button takes it, and the picker going with it is
// awaited before the answer to that hand-back is read.
async function handFocusBack(page: Page): Promise<void> {
  await page.click("[data-pick]");
  await page.waitForSelector("[data-half]", { timeout: 3000 });
  await page.evaluate(() => document.querySelector<HTMLButtonElement>("[data-open]")?.focus());
  await page.waitForSelector("[data-half]", { state: "detached", timeout: 3000 });
  await page.evaluate(() => new Promise((frame) => requestAnimationFrame(() => requestAnimationFrame(frame))));
}

// The dialog goes at once on the way out taken, with no question raised, and its entry with it.
async function closesAtOnce(page: Page, leave: () => Promise<void>): Promise<void> {
  await leave();
  await page.waitForSelector(FORM, { state: "detached", timeout: 3000 });

  expect(await page.locator(QUESTION).count()).toBe(0);

  await settledOn(page, 0);
}

const pressClose = (page: Page) => () => page.getByRole("button", { name: "Close" }).click();
const pressEsc = (page: Page) => () => page.keyboard.press("Escape");

// Whether the page stands on an entry pushed for a floating thing, and how many layers are registered.
async function entries(page: Page): Promise<{ layers: number; marked: boolean }> {
  return page.evaluate(() => ({
    layers: (window as unknown as { layerCount: () => number }).layerCount(),
    marked: (history.state as Record<string, unknown> | null)?.bmoLayer !== undefined
  }));
}

// Resolves once as many layers are registered as are named and the page stands on the top one's entry.
async function settledOn(page: Page, layers: number): Promise<void> {
  await page.waitForFunction(
    (count) =>
      (window as unknown as { layerCount: () => number }).layerCount() === count &&
      ((history.state as Record<string, unknown> | null)?.bmoLayer !== undefined) === (count > 0),
    layers,
    { timeout: 3000 }
  );
}

// One press of back, answered by the question standing over the form's dialog: the question first
// raised is the one still standing once its entry has been pushed, not one closed unanswered.
async function backAsks(page: Page): Promise<void> {
  await page.evaluate(() => history.back());

  const question = await page.waitForSelector(QUESTION, { timeout: 3000 });

  await settledOn(page, 1);

  expect(await question.evaluate((element) => element.isConnected && element.getAttribute("data-state"))).toBe("open");
  expect(await page.locator(FORM).count()).toBe(1);
}

// The segments the component library's own date and time fields are typed in, each of which keeps
// every key but Tab for itself.
const SEGMENTS = [
  { field: "date", segment: "[data-reka-date-field-segment=month]" },
  { field: "time", segment: "[data-reka-time-field-segment=hour]" }
];

const pressBack = (page: Page) => async () => {
  await page.evaluate(() => history.back());
};

// One press of Esc answered by the question standing over the form's dialog.
async function escAsks(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await page.waitForSelector(QUESTION, { timeout: 3000 });

  expect(await page.locator(FORM).count()).toBe(1);
}

for (const { name, width, height } of WIDTHS) {
  describe.skipIf(!ready)(`a form's dialog with no change, on ${name}`, () => {
    test("closes at once when opened for a new record with its defaults and left untouched", async () => {
      const { context, page } = await created(width, height);

      await closesAtOnce(page, pressClose(page));

      await context.close();
    });

    test("closes at once when left untouched, its data landing after it opened", async () => {
      const { context, page } = await opened(width, height);

      await closesAtOnce(page, pressEsc(page));

      await context.close();
    });

    test("closes at once when its data lands after the reader's first press, the form saying when it is ready", async () => {
      const { context, page } = await opened(width, height, (page) => page.click(REASON));

      await closesAtOnce(page, pressClose(page));

      await context.close();
    });

    test("closes at once once its change is put back", async () => {
      const { context, page } = await changed(width, height);

      await page.fill(REASON, LANDED);
      await closesAtOnce(page, pressClose(page));

      await context.close();
    });

    test("closes at once once its change is saved", async () => {
      const { context, page } = await changed(width, height);

      await page.click(SAVE);
      await closesAtOnce(page, pressEsc(page));

      await context.close();
    });
  });

  describe.skipIf(!ready)(`the close of a form's dialog holding a change, on ${name}`, () => {
    test("asks first with the dialog standing under the question, and discard takes both away", async () => {
      const { context, page } = await changed(width, height);

      await pressClose(page)();
      await page.waitForSelector(QUESTION, { timeout: 3000 });

      expect(await page.locator(FORM).count()).toBe(1);

      await page.getByRole("button", { name: "Discard" }).click();
      await page.waitForSelector("[role=dialog]", { state: "detached", timeout: 3000 });
      await settledOn(page, 0);

      await context.close();
    });

    test("is held by cancel on the question, the dialog keeping its change", async () => {
      const { context, page } = await changed(width, height);

      await pressClose(page)();
      await page.waitForSelector(QUESTION, { timeout: 3000 });
      await page.getByRole("button", { name: "Cancel" }).click();
      await page.waitForSelector(QUESTION, { state: "detached", timeout: 3000 });
      await settledOn(page, 1);

      expect(await page.locator(FORM).count()).toBe(1);
      expect(await page.inputValue(REASON)).toBe("Family event");

      await context.close();
    });
  });

  describe.skipIf(!ready)(`a focus handed back to the page over a form's dialog, on ${name}`, () => {
    test("raises no question once the form has turned dirty, and Esc still asks and Cancel holds", async () => {
      const { context, page } = await changed(width, height);

      await handFocusBack(page);

      expect(await page.locator(QUESTION).count()).toBe(0);
      expect(await page.locator(FORM).count()).toBe(1);

      await escAsks(page);
      await page.getByRole("button", { name: "Cancel" }).click();
      await page.waitForSelector(QUESTION, { state: "detached", timeout: 3000 });
      await settledOn(page, 1);

      expect(await page.inputValue(REASON)).toBe("Family event");

      await context.close();
    });

    test("still asks on back, and discard takes both away", async () => {
      const { context, page } = await changed(width, height);

      await handFocusBack(page);

      await backAsks(page);
      await page.getByRole("button", { name: "Discard" }).click();
      await page.waitForSelector("[role=dialog]", { state: "detached", timeout: 3000 });
      await settledOn(page, 0);

      await context.close();
    });

    test("closes at once on Esc when the dialog holds no change", async () => {
      const { context, page } = await created(width, height);

      await handFocusBack(page);

      expect(await page.locator(QUESTION).count()).toBe(0);

      await closesAtOnce(page, pressEsc(page));

      await context.close();
    });
  });

  describe.skipIf(!ready)(`the back gesture over a form's dialog holding a change, on ${name}`, () => {
    test("asks first, and discard takes the dialog away and leaves the history as it was", async () => {
      const { context, page } = await changed(width, height);

      await backAsks(page);
      await page.getByRole("button", { name: "Discard" }).click();
      await page.waitForSelector("[role=dialog]", { state: "detached", timeout: 3000 });
      await settledOn(page, 0);

      expect(await entries(page)).toEqual({ layers: 0, marked: false });

      await context.close();
    });

    test("is held by back on the question, the dialog keeping its change and an entry of its own", async () => {
      const { context, page } = await changed(width, height);

      await backAsks(page);
      await page.evaluate(() => history.back());
      await page.waitForSelector(QUESTION, { state: "detached", timeout: 3000 });
      await settledOn(page, 1);

      expect(await page.inputValue(REASON)).toBe("Family event");

      // The dialog's own entry stands again, so the next press asks again rather than leaving the page.
      await backAsks(page);
      await page.getByRole("button", { name: "Cancel" }).click();
      await page.waitForSelector(QUESTION, { state: "detached", timeout: 3000 });
      await settledOn(page, 1);

      expect(await page.locator(FORM).count()).toBe(1);

      await context.close();
    });
  });

  for (const { field, segment } of SEGMENTS) {
    describe.skipIf(!ready)(`a form's dialog with the focus in a ${field} field's segment, on ${name}`, () => {
      test("closes at once on Esc while it holds no change", async () => {
        const { context, page } = await created(width, height);

        await page.click(segment);
        await closesAtOnce(page, pressEsc(page));

        await context.close();
      });

      test("asks on Esc while it holds a change", async () => {
        const { context, page } = await changed(width, height);

        await page.click(segment);
        await escAsks(page);

        await context.close();
      });

      test("closes at once on back while it holds no change", async () => {
        const { context, page } = await created(width, height);

        await page.click(segment);
        await closesAtOnce(page, pressBack(page));

        await context.close();
      });

      test("asks on back while it holds a change", async () => {
        const { context, page } = await changed(width, height);

        await page.click(segment);
        await backAsks(page);

        await context.close();
      });
    });
  }
}
