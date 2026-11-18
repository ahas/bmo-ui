import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, centreOf, openTouch, touchReady } from "./touch";

import type { TouchSession } from "./touch";

import type { Browser, Page } from "playwright-core";

// The one select drawn by a real browser (`docs/components.md`, "Choosing a value"): a list of seven
// opens with no search, a list of a dozen opens with the search at its top holding the focus, typing
// narrows it to what the choices show with the hits marked and the headings of what stays while the
// control still names what is chosen, an empty answer says why, a list found over a road asks it and
// says when it refused, a list of three taking free entry opens with its search and takes a value
// typed into it, a preview follows the choice the keyboard rests on, a closing list keeps the choices
// it showed until it is gone, the control takes the accent on its edge with no ring when the keyboard
// reaches it, each list stands as wide as its choices and its control against an edge of the control
// at a desktop's and a phone's width, and a finger opening a long list leaves the keyboard down and
// keeps a long value typed in free entry inside the screen. Which choices the words keep is the
// choices module's own test (`tests/domain/choices.test.ts`). Skipped where the browser build is not
// on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/choice-harness.js" defer></script></head><body><div id="page" style="isolation:isolate"></div></body></html>`;

const LIST = "[data-slot=content]";
const FIELD = `${LIST} input`;

let out = "";
let script = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-choice-"));

  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/choice-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "choice-harness.js")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

async function serve(page: Page): Promise<void> {
  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/choice-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForSelector("#found");
}

// What the open list shows, top to bottom: each heading as `# words`, each choice by its label.
async function listedAs(page: Page, wanted: string[]): Promise<void> {
  await page.waitForFunction(
    ([selector, words]) =>
      JSON.stringify(
        [...document.querySelectorAll(selector)].map((part) => (part.getAttribute("data-slot") === "label" ? `# ${part.textContent?.trim()}` : (part.textContent?.trim() ?? "")))
      ) === JSON.stringify(words),
    [`${LIST} [data-slot=label], ${LIST} [data-slot=itemLabel]`, wanted] as const,
    { timeout: 3_000 }
  );
}

// Where the open list and the control that opened it start, each from the page's left.
async function leadingEdges(page: Page, control: string): Promise<{ list: number; control: number }> {
  return await page.evaluate((selector) => {
    const list = document.querySelector("[data-slot=content]")!.getBoundingClientRect();
    const opener = document.querySelector(selector)!.getBoundingClientRect();

    return { list: Math.round(list.left), control: Math.round(opener.left) };
  }, control);
}

// The cities' list whole: its two headings and its twelve choices.
async function listedWhole(page: Page): Promise<void> {
  await listedAs(page, ["# North", "Berlin", "Dublin", "Oslo", "Riga", "Tallinn", "Vienna", "# South", "Athens", "Lisbon", "Madrid", "Rome", "Seville", "Valletta"]);
}

async function saysEmpty(page: Page, words: string): Promise<void> {
  await page.waitForFunction(([selector, wanted]) => document.querySelector(selector)?.textContent?.trim() === wanted, [`${LIST} [data-slot=empty]`, words] as const, {
    timeout: 3_000
  });
}

// The open list, the control that opened it and the list's search field, measured once the list has
// grown to its size: part way through its opening it stands scaled down and reads narrower than it is.
// `natural` is the width its choices take at their own widths.
interface Fitted {
  list: { left: number; right: number; width: number };
  control: { left: number; right: number; width: number };
  field: number | null;
  natural: number;
  screen: number;
}

async function fitted(page: Page, control: string): Promise<Fitted> {
  return await page.evaluate(async (selector) => {
    const list = document.querySelector<HTMLElement>("[data-slot=content]")!;

    await Promise.all(list.getAnimations({ subtree: true }).map((animation) => animation.finished));
    await new Promise((settled) => requestAnimationFrame(() => requestAnimationFrame(settled)));

    const box = (element: Element): { left: number; right: number; width: number } => {
      const rect = element.getBoundingClientRect();

      return { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
    };
    const natural = Math.max(
      ...[...list.querySelectorAll<HTMLElement>("[data-slot=group]")].map((group) => {
        group.style.width = "max-content";
        group.style.minWidth = "0";

        const width = group.getBoundingClientRect().width;

        group.style.width = "";
        group.style.minWidth = "";

        return Math.round(width);
      })
    );
    const field = list.querySelector("[data-slot=input]");

    return { list: box(list), control: box(document.querySelector(selector)!), field: field === null ? null : box(field).width, natural, screen: document.documentElement.clientWidth };
  }, control);
}

// A list stands as wide as its choices, floored at its control and capped at the screen less a
// gutter each side, its search field filling that width and setting none of it, against the given
// edge of its control.
function expectFitted(seen: Fitted, edge: "leading" | "trailing"): void {
  const width = Math.min(Math.max(seen.control.width, seen.natural), seen.screen - 16);

  expect(Math.abs(seen.list.width - width)).toBeLessThanOrEqual(1);
  if (seen.field !== null) expect(Math.abs(seen.field - seen.list.width)).toBeLessThanOrEqual(1);
  if (edge === "leading") expect(seen.list.left).toBe(seen.control.left);
  else expect(seen.list.right).toBe(seen.control.right);
}

async function close(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await page.waitForSelector(LIST, { state: "detached" });
}

// Closes a list a failed test left open, so the next test starts from a closed select and fails only
// where its own check does.
async function closeLeftOpen(page: Page): Promise<void> {
  if ((await page.$(LIST)) !== null) await close(page);
}

describe.skipIf(!ready)("the one select at a desktop's width", () => {
  let page: Page;

  beforeAll(async () => {
    page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
    await serve(page);
  }, BROWSER_HOOK_MS);

  afterEach(async () => {
    await closeLeftOpen(page);
  });

  afterAll(async () => {
    await page?.context().close();
  });

  test("opens a list of seven with no search", async () => {
    await page.click("#short");
    await listedAs(page, ["Tiny", "Small", "Medium", "Large", "Huge", "Vast", "Giant"]);
    expect(await page.$(FIELD)).toBeNull();
    await close(page);
  });

  test("opens a list of a dozen with the search at its top, the focus in it and the pack's words in it", async () => {
    await page.click("#long");
    await page.waitForSelector(FIELD);

    const field = await page.$eval(FIELD, (input) => {
      const first = document.querySelector("[data-slot=content] [data-slot=label], [data-slot=content] [data-slot=item]");

      return {
        placeholder: input.getAttribute("placeholder"),
        focused: document.activeElement === input,
        above: first !== null && input.getBoundingClientRect().bottom <= first.getBoundingClientRect().top
      };
    });

    expect(field).toEqual({ placeholder: "Search", focused: true, above: true });
    expect(await leadingEdges(page, "#long")).toEqual({ list: 16, control: 16 });

    // The field has no edge, so its focus is the elevated background, gone once the focus leaves it.
    const ground = async (): Promise<string> => await page.$eval(FIELD, (input) => getComputedStyle(input.parentElement!).backgroundColor);
    const focusedGround = await ground();

    await page.$eval(FIELD, (input) => (input as HTMLInputElement).blur());
    expect(await ground()).not.toBe(focusedGround);
    expect(focusedGround).not.toBe("rgba(0, 0, 0, 0)");
    await listedWhole(page);
    await close(page);
  });

  test("opened by a key, puts the focus in its search so typing searches at once", async () => {
    await page.focus("#long");
    await page.keyboard.press("Enter");
    await page.waitForSelector(FIELD);
    expect(await page.$eval(FIELD, (input) => document.activeElement === input)).toBe(true);

    await page.keyboard.type("oslo");
    await listedAs(page, ["# North", "Oslo"]);
    await close(page);
  });

  test("narrows to what the choices show, marks the hits and keeps the headings of what stays", async () => {
    await page.click("#long");
    await page.waitForSelector(FIELD);

    await page.keyboard.type("RI");
    await listedAs(page, ["# North", "Riga", "# South", "Madrid"]);
    expect(await page.$$eval(`${LIST} mark`, (marks) => marks.map((mark) => mark.textContent))).toEqual(["Ri", "ri"]);

    // The line under a choice is searched as its label is.
    await page.fill(FIELD, "warm");
    await listedAs(page, ["# South", "Athens", "Lisbon", "Madrid", "Rome", "Seville", "Valletta"]);

    await page.fill(FIELD, "zzz");
    await listedAs(page, []);
    await saysEmpty(page, "Nothing found");

    // Opening again clears the words, so the list opens whole.
    await close(page);
    await page.click("#long");
    await page.waitForSelector(FIELD);
    expect(await page.inputValue(FIELD)).toBe("");
    await listedWhole(page);
    await close(page);
  });

  test("names what is chosen on its control while the words typed leave it out of the list", async () => {
    await page.click("#long");
    await page.waitForSelector(FIELD);
    await page.keyboard.type("oslo");
    await listedAs(page, ["# North", "Oslo"]);
    await page.keyboard.press("Enter");
    await page.waitForSelector(LIST, { state: "detached" });

    await page.click("#long");
    await page.waitForSelector(FIELD);
    await page.keyboard.type("rome");
    await listedAs(page, ["# South", "Rome"]);
    expect(await page.$eval("#long [data-slot=value]", (value) => value.textContent?.trim())).toBe("Oslo");
    await close(page);
  });

  test("moves its preview with the choice the keyboard highlights, and back to the chosen one as it closes", async () => {
    const preview = async (wanted: string): Promise<void> => {
      await page.waitForFunction((words) => document.querySelector("#preview")?.textContent === words, wanted, { timeout: 3_000 });
    };

    await page.click("#tinted");
    await page.waitForSelector(FIELD);
    await preview("teal");
    await page.keyboard.press("ArrowDown");
    await preview("sea");
    await page.keyboard.press("ArrowDown");
    await preview("sunset");
    await close(page);
    await preview("teal");
  });

  test("keeps the choices the words left until the list is off the screen, closed by a key or by a choice", async () => {
    for (const closing of ["Escape", "Enter"]) {
      await page.click("#long");
      await page.waitForSelector(FIELD);
      await page.keyboard.type("oslo");
      await listedAs(page, ["# North", "Oslo"]);
      await page.evaluate(() => {
        const seen = new Set<number>();
        const watch = (): void => {
          const list = document.querySelector("[data-slot=content]");

          if (list === null) return;
          if (list.getAttribute("data-state") === "closed") seen.add(list.querySelectorAll("[data-slot=item]").length);
          requestAnimationFrame(watch);
        };

        Object.assign(window, { closingCounts: seen });
        requestAnimationFrame(watch);
      });
      await page.keyboard.press(closing);
      await page.waitForSelector(LIST, { state: "detached" });
      expect(await page.evaluate(() => [...(window as unknown as { closingCounts: Set<number> }).closingCounts])).toEqual([1]);
    }
  });

  test("takes the accent on its control's edge and draws no ring when the keyboard reaches it", async () => {
    await page.focus("#short");
    await page.keyboard.press("Tab");

    const drawn = await page.$eval("#long", (control) => {
      const probe = document.createElement("i");

      probe.style.color = "var(--bmo-focus)";
      document.body.append(probe);

      const accent = getComputedStyle(probe).color;

      probe.remove();

      return { visible: control.matches(":focus-visible"), outline: getComputedStyle(control).outlineStyle, edge: getComputedStyle(control).boxShadow.includes(`${accent} 0px 0px 0px 1px inset`) };
    });

    expect(drawn).toEqual({ visible: true, outline: "none", edge: true });
  });

  test("stands each list as wide as its choices and its control, against an edge of the control", async () => {
    for (const control of ["#short", "#long"]) {
      await page.click(control);
      expectFitted(await fitted(page, control), "leading");
      await close(page);
    }

    // A control at the trailing end opens a list wider than itself against its trailing edge.
    await page.click("#wide");

    const wide = await fitted(page, "#wide");

    expect(wide.natural).toBeGreaterThan(wide.control.width);
    expectFitted(wide, "trailing");
    await close(page);
  });

  test("asks the road for a list found on the server, and says when nothing came back and when it refused", async () => {
    await page.click("#found");
    await page.waitForSelector(FIELD);
    await saysEmpty(page, "No choices");

    await page.keyboard.type("al");
    await listedAs(page, ["Alan Moor"]);

    await page.fill(FIELD, "a");
    await listedAs(page, ["Ada Byron", "Alan Moor", "Grace Hill", "Linus Park"]);

    await page.fill(FIELD, "zzz");
    await saysEmpty(page, "Nothing found");

    await page.fill(FIELD, "fail");
    await saysEmpty(page, "Search failed");

    // The first answer to the words typed is awaited under a skeleton, a busy status with no words.
    await page.fill(FIELD, "slow");
    await page.waitForSelector(`${LIST} [data-slot=empty] [role=status][aria-busy=true]`, { timeout: 3_000 });
    expect(await page.$eval(`${LIST} [data-slot=empty]`, (empty) => empty.querySelector("[aria-hidden=true]") !== null)).toBe(true);
    await page.evaluate(() => (window as unknown as { letAnswerGo: () => void }).letAnswerGo());
    await listedAs(page, ["Sam Lowe"]);

    await page.fill(FIELD, "ada");
    await listedAs(page, ["Ada Byron"]);
    await page.keyboard.press("Enter");
    await page.waitForSelector(LIST, { state: "detached" });
  });

  test("takes a value typed into a list of three in free entry, offering only words no choice shows", async () => {
    await page.click("#free");
    await page.waitForSelector(FIELD);
    expect(await page.$eval(FIELD, (input) => document.activeElement === input)).toBe(true);
    await listedAs(page, ["Designer", "Engineer", "Manager"]);

    // Words a choice shows are that choice, whatever their letter case; words it only holds are offered too.
    await page.keyboard.type("engineer");
    await listedAs(page, ["Engineer"]);
    await page.fill(FIELD, "eng");
    await listedAs(page, ["Engineer", 'Add "eng"']);

    // Words no choice holds stand as the one entry, so the list says no empty words.
    await page.fill(FIELD, " Analyst ");
    await listedAs(page, ['Add "Analyst"']);
    expect(await page.$(`${LIST} [data-slot=empty]`)).toBeNull();

    await page.getByRole("option", { name: 'Add "Analyst"' }).click();
    await listedAs(page, ["Analyst"]);
    await close(page);
    expect(await page.textContent("#free")).toContain("Analyst");

    await page.click("#free");
    await listedAs(page, ["Designer", "Engineer", "Manager", "Analyst"]);
    await close(page);
  });
});

describe.skipIf(!ready)("the one select under a finger at a phone's width", () => {
  let touch: TouchSession;

  beforeAll(async () => {
    touch = await openTouch({ device: "Galaxy S24" });
    await serve(touch.page);
  }, BROWSER_HOOK_MS);

  afterEach(async () => {
    await closeLeftOpen(touch.page);
  });

  afterAll(async () => {
    await touch?.close();
  });

  test("opens a long list against its control's edge, its search standing and the keyboard left down", async () => {
    const { page } = touch;

    expect(page.viewportSize()?.width).toBe(360);

    await touch.tap(await centreOf(page, "#long"));
    await page.waitForSelector(FIELD);
    await listedWhole(page);
    expect(await page.$eval(FIELD, (input) => document.activeElement === input)).toBe(false);
    expect(await leadingEdges(page, "#long")).toEqual({ list: 16, control: 16 });
    await close(page);
  });

  test("keeps a long value typed in free entry inside the screen, its words whole, and takes it from a finger", async () => {
    const { page } = touch;
    const words = "Principal platform reliability engineer";

    await touch.tap(await centreOf(page, "#free"));
    await page.waitForSelector(FIELD);
    expect(await page.$eval(FIELD, (input) => document.activeElement === input)).toBe(false);
    await touch.tap(await centreOf(page, FIELD));
    await page.keyboard.type(words);
    await listedAs(page, [`Add "${words}"`]);

    const placed = await page.$eval(LIST, (list) => {
      const box = list.getBoundingClientRect();
      const label = list.querySelector("[data-slot=itemLabel]")!;

      return { inside: box.left >= 0 && box.right <= window.innerWidth, whole: label.scrollWidth <= label.clientWidth };
    });

    expect(placed).toEqual({ inside: true, whole: true });

    await touch.tap(await centreOf(page, `${LIST} [data-slot=item]`));
    await listedAs(page, [words]);
    await close(page);
    expect(await page.textContent("#free")).toContain(words);
  });

  test("stands each list as wide as its choices and its control, against an edge of the control", async () => {
    const { page } = touch;

    for (const control of ["#short", "#long"]) {
      await touch.tap(await centreOf(page, control));
      await page.waitForSelector(LIST);
      expectFitted(await fitted(page, control), "leading");
      await close(page);
    }

    // Against its leading edge the list would run off the screen, so it stands against the trailing one.
    await touch.tap(await centreOf(page, "#wide"));
    await page.waitForSelector(LIST);

    const wide = await fitted(page, "#wide");

    expect(wide.control.left + wide.list.width).toBeGreaterThan(wide.screen - 8);
    expectFitted(wide, "trailing");
    await close(page);
  });

  test("closes its list on the back gesture and leaves the page where it was", async () => {
    const { page } = touch;
    const address = page.url();

    await touch.tap(await centreOf(page, "#long"));
    await page.waitForSelector(FIELD);
    await page.evaluate(() => history.back());
    await page.waitForSelector(LIST, { state: "detached", timeout: 3_000 });
    expect(page.url()).toBe(address);
    expect(await page.$("#long")).not.toBeNull();
  });

  test("closes only its list when a finger taps the dialog it stands in", async () => {
    const { page } = touch;
    const menu = `${LIST}:has([role=option])`;
    const dialog = "[role=dialog]";

    await touch.tap(await centreOf(page, "#open-dialog"));
    await page.waitForSelector(`${dialog} #in-dialog`);
    await touch.tap(await centreOf(page, "#in-dialog"));
    await page.waitForSelector(menu);

    // The dialog's title presses nothing and stands outside the list alone. The focus moves onto the
    // dialog as the finger lands there, which closes the list before the tap ends.
    await touch.tap(await centreOf(page, `${dialog} [data-slot=title]`));
    await page.waitForSelector(menu, { state: "detached" });
    await page.evaluate(async () => await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await page.$$eval(dialog, (elements) => elements.map((element) => element.getAttribute("data-state")))).toEqual(["open"]);

    await close(page);
  });

  test("keeps its search and its list in sight once a pressed field brings the keyboard up", async () => {
    const { page } = touch;
    const full = page.viewportSize()!;

    await touch.tap(await centreOf(page, "#long"));
    await page.waitForSelector(FIELD);
    await touch.tap(await centreOf(page, FIELD));
    await page.waitForFunction((selector) => document.activeElement === document.querySelector(selector), FIELD, { timeout: 3_000 });

    // The keyboard takes the lower part of the screen, and the host's viewport has it resize the page.
    const left = Math.round(full.height * 0.55);

    try {
      await page.setViewportSize({ width: full.width, height: left });
      await page.waitForFunction(
        ([field, list, height]) => {
          const input = document.querySelector(field)?.getBoundingClientRect();
          const box = document.querySelector(list)?.getBoundingClientRect();

          return input !== undefined && box !== undefined && input.top >= 0 && input.bottom <= height && box.top >= 0 && box.bottom <= height;
        },
        [FIELD, LIST, left] as const,
        { timeout: 3_000 }
      );
    } finally {
      await page.setViewportSize(full);
    }

    await close(page);
  });
});
