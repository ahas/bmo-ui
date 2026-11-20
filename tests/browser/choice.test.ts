import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { pressSystemBack, standInSystemBack } from "./system-back";
import { BROWSER_HOOK_MS, centreOf, openTouch, touchReady } from "./touch";

import type { TouchSession } from "./touch";

import type { Browser, Page } from "playwright-core";

// The one select drawn by a real browser (`docs/components.md`, "Choosing a value"): a list of seven
// opens with no search, a list of a dozen opens with the search at its top holding the focus, typing
// narrows it to what the choices show with the hits marked and the headings of what stays while the
// control still names what is chosen, an empty answer says why, a list found over a road asks it and
// says when it refused, a list of three taking free entry opens with its search and takes a value
// typed into it, closing as it does while a list of several values stays open, a list of several
// values ends a value at its separators however the keyboard writes them, once an input method
// commits a word, at Enter where nothing stands highlighted, letting no value chosen go however soon
// after the typing it comes, at a paste cut there and as it closes,
// by a key, a finger and the back gesture, a slot the screen fills only after the
// first drawing is drawn, a list whose screen
// says its choices are on their way draws a skeleton line until they land, a choice of nothing keyed
// by the empty string is listed, taken and named, a preview follows the choice the keyboard rests on, a closing list keeps the choices
// it showed until it is gone, the control takes the accent on its edge with no ring when the keyboard
// reaches it, each list stands as wide as its choices and its control against an edge of the control
// at a desktop's and a phone's width, and a finger opening a long list leaves the keyboard down and
// keeps a long value typed in free entry inside the screen. As the words narrow a list and give back
// what they took, its choices slide, fold and unfold, a group left with none folding as one, a choice
// folding away takes no Enter and hands its highlight on, and the choices stand at once for a reader
// who asked for less movement. Which choices the words keep is the
// choices module's own test (`tests/domain/choices.test.ts`). Skipped where the browser build is not
// on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/choice-harness.js" defer></script></head><body><div id="page" style="isolation:isolate"></div></body></html>`;

const LIST = "[data-slot=content]";
const FIELD = `${LIST} input`;

// What the harness page hands the test for the list whose screen says its choices are on their way.
interface AwaitedChoices {
  landChoices: (labels: string[]) => void;
  readChoicesAgain: () => void;
}

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

// The values the separators' list took last, as its screen writes them beside it, its search cleared.
async function takenAs(page: Page, values: string[]): Promise<void> {
  await page.waitForFunction(
    ([field, wanted]) => {
      const held = JSON.parse(document.querySelector("#cut-value")?.textContent ?? "[]") as string[];

      return JSON.stringify(held.slice(-wanted.length)) === JSON.stringify(wanted) && (document.querySelector(field) as HTMLInputElement | null)?.value === "";
    },
    [FIELD, values] as const,
    { timeout: 3_000 }
  );
}

// Pastes words into the open list's search, saying whether the select took the paste as values
// rather than leaving it to be typed.
async function pasted(page: Page, words: string): Promise<boolean> {
  return await page.$eval(
    FIELD,
    (input, text) => {
      const data = new DataTransfer();

      data.setData("text/plain", text);

      return !input.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    },
    words
  );
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

    await page.fill(FIELD, "zzz");
    await saysEmpty(page, "Nothing found");
    expect(await page.$eval("#long [data-slot=value]", (value) => value.textContent?.trim())).toBe("Oslo");
    await close(page);
  });

  test("names every value chosen from the road's answers once a later answer finds none of them", async () => {
    await page.click("#members");
    await page.waitForSelector(FIELD);

    for (const [typed, name] of [["ada", "Ada Byron"], ["grace", "Grace Hill"]] as const) {
      await page.fill(FIELD, typed);
      await listedAs(page, [name]);
      await page.keyboard.press("Enter");
    }

    await page.fill(FIELD, "zzz");
    await saysEmpty(page, "Nothing found");
    expect(await page.$eval("#members [data-slot=value]", (value) => value.textContent?.trim())).toBe("Ada Byron, Grace Hill");
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

    // Taken, the new value closes a list of one value as any choice does, the focus back on its control.
    await page.getByRole("option", { name: 'Add "Analyst"' }).click();
    await page.waitForSelector(LIST, { state: "detached" });
    expect(await page.textContent("#free")).toContain("Analyst");
    expect(await page.$eval("#free", (control) => document.activeElement === control)).toBe(true);

    await page.click("#free");
    await listedAs(page, ["Designer", "Engineer", "Manager", "Analyst"]);
    await close(page);
  });

  test("keeps a list of several values open once a value typed in free entry is taken", async () => {
    await page.click("#free-many");
    await page.waitForSelector(FIELD);
    await page.keyboard.type("Singing");
    // The words stay, so the list shows the new value alone, chosen, with nothing more to offer.
    await page.getByRole("option", { name: 'Add "Singing"' }).click();
    await listedAs(page, ["Singing"]);
    expect(await page.getByRole("option", { name: "Singing" }).getAttribute("aria-selected")).toBe("true");
    expect(await page.textContent("#free-many")).toContain("Singing");
    await close(page);
  });

  test("ends a value at a separator, at Enter with nothing highlighted and at a paste cut there, clearing the search each time", async () => {
    await page.click("#cut");
    await page.waitForSelector(FIELD);

    // At a separator the words before it are a new value, or the choice they name.
    await page.keyboard.type("Cooking,");
    await takenAs(page, ["Cooking"]);
    await page.keyboard.type(" drawing ;");
    await takenAs(page, ["Cooking", "Drawing"]);

    // While the road is asked nothing stands highlighted, so Enter ends the words too.
    await page.fill(FIELD, "slow tag");
    await page.waitForSelector(`${LIST} [data-slot=empty] [role=status]`, { timeout: 3_000 });
    await page.keyboard.press("Enter");
    await takenAs(page, ["Cooking", "Drawing", "slow tag"]);

    // A paste holding separators or line breaks is cut there, joined to the words already typed.
    await page.keyboard.type("Gar");
    expect(await pasted(page, "dening; Writing\nRowing")).toBe(true);
    await takenAs(page, ["Cooking", "Drawing", "slow tag", "Writing", "Gardening", "Rowing"]);
    expect(await pasted(page, "Reading")).toBe(false);
    await close(page);
  });

  test("takes the words left typed as a value once its list closes", async () => {
    await page.click("#cut");
    await page.waitForSelector(FIELD);
    await page.keyboard.type("Hiking");
    await close(page);
    expect(JSON.parse((await page.textContent("#cut-value")) ?? "[]")).toContain("Hiking");
  });

  test("ends a value at a separator a keyboard hands over as text alone, or an input method commits with its word", async () => {
    const cdp = await page.context().newCDPSession(page);

    await page.click("#cut");
    await page.waitForSelector(FIELD);

    // A phone's keyboard names no key: the separator arrives as the text it writes.
    await page.keyboard.type("Sailing");
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Unidentified", windowsVirtualKeyCode: 229, text: "," });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Unidentified", windowsVirtualKeyCode: 229 });
    await takenAs(page, ["Sailing"]);

    // While a word is composed its separator stays in it, and the word is taken as it is committed.
    await cdp.send("Input.imeSetComposition", { text: "\uD64D,", selectionStart: 2, selectionEnd: 2 });
    expect(await page.$eval(FIELD, (input) => (input as HTMLInputElement).value)).toBe("\uD64D,");
    expect(JSON.parse((await page.textContent("#cut-value")) ?? "[]")).not.toContain("\uD64D");
    await cdp.send("Input.insertText", { text: "\uD64D," });
    await takenAs(page, ["Sailing", "\uD64D"]);

    await cdp.detach();
    await close(page);
  });

  test("cuts words pasted from the clipboard at their separators and line breaks", async () => {
    await page.fill("#clip", "Alpha; Beta\nGamma");
    await page.focus("#clip");
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("ControlOrMeta+C");
    await page.click("#cut");
    await page.waitForSelector(FIELD);
    await page.keyboard.press("ControlOrMeta+V");
    await takenAs(page, ["Alpha", "Beta", "Gamma"]);
    await close(page);
  });

  test("draws a slot its screen fills only after the select is first drawn", async () => {
    expect(await page.$("#late [data-slot=value]")).not.toBeNull();
    await page.evaluate(() => (window as unknown as { fillLateSlot: () => void }).fillLateSlot());
    await page.waitForSelector("#late #late-mark", { timeout: 3_000 });
    expect(await page.$("#late [data-slot=value]")).toBeNull();
  });

  test("draws a skeleton line in a list whose screen says its first choices are on their way, and what lands once it lands", async () => {
    await page.click("#awaited");
    await page.waitForSelector(`${LIST} [data-slot=empty] [role=status][aria-busy=true]`, { timeout: 3_000 });
    expect(await page.textContent(`${LIST} [data-slot=empty]`)).not.toContain("No choices");

    // A first read that found none is content: read again, the list keeps its words under the busy mark.
    await page.evaluate(() => (window as unknown as AwaitedChoices).landChoices([]));
    await saysEmpty(page, "No choices");
    await page.evaluate(() => (window as unknown as AwaitedChoices).readChoicesAgain());
    await page.waitForSelector("#awaited .animate-spin", { timeout: 3_000 });
    expect(await page.$(`${LIST} [data-slot=empty] [role=status]`)).toBeNull();
    await saysEmpty(page, "No choices");

    await page.evaluate(() => (window as unknown as AwaitedChoices).landChoices(["Apple", "Pear"]));
    await listedAs(page, ["Apple", "Pear"]);
    expect(await page.$(`${LIST} [data-slot=empty]`)).toBeNull();
    await close(page);
  });

  test("lists, takes and names a choice of nothing, handing the screen the empty string for it", async () => {
    await page.click("#team");
    await listedAs(page, ["Nobody", "Design", "Research", "Support"]);

    await page.getByRole("option", { name: "Nobody" }).click();
    await page.waitForSelector(LIST, { state: "detached" });
    expect(await page.textContent("#team-value")).toBe('""');
    expect(await page.textContent("#team")).toContain("Nobody");

    // Opened again, the choice of nothing stands chosen and another can be taken in its place.
    await page.click("#team");
    expect(await page.getByRole("option", { name: "Nobody" }).getAttribute("aria-selected")).toBe("true");
    await page.getByRole("option", { name: "Support" }).click();
    await page.waitForSelector(LIST, { state: "detached" });
    expect(await page.textContent("#team-value")).toBe('"support"');
  });
});

describe.skipIf(!ready)("the one select under a finger at a phone's width", () => {
  let touch: TouchSession;

  beforeAll(async () => {
    touch = await openTouch({ device: "Galaxy S24" });
    await standInSystemBack(touch.page);
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
    await page.waitForSelector(LIST, { state: "detached" });
    expect(await page.textContent("#free")).toContain(words);
  });

  test("ends a value typed by a finger at a separator, and takes the words left as a tap outside closes the list", async () => {
    const { page } = touch;

    await touch.tap(await centreOf(page, "#cut"));
    await page.waitForSelector(FIELD);
    await touch.tap(await centreOf(page, FIELD));
    await page.keyboard.type("Baking,");
    await takenAs(page, ["Baking"]);

    await page.keyboard.type("Rowing");
    await touch.tap(await centreOf(page, "#cut-value"));
    await page.waitForSelector(LIST, { state: "detached" });
    expect(JSON.parse((await page.textContent("#cut-value")) ?? "[]")).toEqual(["Baking", "Rowing"]);
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
    await pressSystemBack(page);
    await page.waitForSelector(LIST, { state: "detached", timeout: 3_000 });
    expect(page.url()).toBe(address);
    expect(await page.$("#long")).not.toBeNull();
  });

  test("takes the words a finger left typed as the back gesture closes the list", async () => {
    const { page } = touch;

    await touch.tap(await centreOf(page, "#cut"));
    await page.waitForSelector(FIELD);
    await touch.tap(await centreOf(page, FIELD));
    await page.keyboard.type("Surfing");
    await pressSystemBack(page);
    await page.waitForSelector(LIST, { state: "detached", timeout: 3_000 });
    expect(JSON.parse((await page.textContent("#cut-value")) ?? "[]")).toContain("Surfing");
  });

  test("closes only its list when a finger taps the dialog or the drawer it stands in", async () => {
    const { page } = touch;
    const menu = `${LIST}:has([role=option])`;
    const holder = "[role=dialog]";

    for (const { opener, select } of [
      { opener: "#open-dialog", select: "#in-dialog" },
      { opener: "#open-drawer", select: "#in-drawer" }
    ]) {
      await touch.tap(await centreOf(page, opener));
      await page.waitForSelector(`${holder} ${select}`);
      // A drawer rises into place, so the finger waits for it to stand where it is measured.
      await page.$eval(holder, async (element) => await Promise.all(element.getAnimations({ subtree: true }).map(async (motion) => await motion.finished)));
      await touch.tap(await centreOf(page, select));
      await page.waitForSelector(menu);

      // The title presses nothing and stands outside the list alone. The list keeps the focus as the
      // finger lands there, and the tap closes the list it lands away from, the dialog or the drawer
      // standing.
      await touch.tap(await centreOf(page, `${holder} [data-slot=title]`));
      await page.waitForSelector(menu, { state: "detached" });
      await page.evaluate(async () => await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      expect(await page.$$eval(holder, (elements) => elements.map((element) => element.getAttribute("data-state")))).toEqual(["open"]);

      await close(page);
    }
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

// The open list's every frame from here on: each choice by its label and each group by the label of
// the first choice it was seen holding, where it stands, how tall it is drawn and how opaque.
interface Drawn {
  boxes: Record<string, { left: number; top: number; height: number; opacity: number }>;
}

// Starts writing down the open list's frames once its opening has finished.
async function recordList(page: Page): Promise<void> {
  await page.evaluate(async (selector) => {
    const list = document.querySelector<HTMLElement>(selector)!;

    await Promise.all(list.getAnimations({ subtree: true }).map((animation) => animation.finished));

    const recorder = { frames: [] as Drawn[], recording: true };
    const groups = new WeakMap<Element, string>();
    const labelOf = (part: Element): string => part.querySelector("[data-slot=itemLabel]")?.textContent?.trim() ?? "";
    const keyOf = (part: HTMLElement): string => {
      if (part.dataset.slot !== "group") return labelOf(part);
      if (!groups.has(part)) groups.set(part, `group ${labelOf(part)}`);

      return groups.get(part)!;
    };
    const look = (): void => {
      const boxes: Drawn["boxes"] = {};

      for (const part of list.querySelectorAll<HTMLElement>("[data-slot=item], [data-slot=group]")) {
        const rect = part.getBoundingClientRect();

        boxes[keyOf(part)] = { left: Math.round(rect.left), top: Math.round(rect.top), height: Math.round(rect.height), opacity: Number(getComputedStyle(part).opacity) };
      }

      recorder.frames.push({ boxes });
      if (recorder.recording) requestAnimationFrame(look);
    };

    // The first frame is the list as it stands before the key, written down before the key is pressed.
    Object.assign(window, { listFrames: recorder });
    look();
  }, LIST);
}

// The frames written down since recording began, once a movement has begun and ended, or long enough
// has passed that one would have begun, and the last frames are all alike.
async function settledList(page: Page): Promise<Drawn[]> {
  return (await page.evaluate(
    (selector) =>
      new Promise((resolve) => {
        const recorder = (window as unknown as { listFrames: { frames: Drawn[]; recording: boolean } }).listFrames;
        const list = document.querySelector<HTMLElement>(selector)!;
        let began = false;
        const wait = (): void => {
          const running = list.getAnimations({ subtree: true }).length > 0;
          const last = recorder.frames.slice(-3).map((one) => JSON.stringify(one.boxes));

          began ||= running;

          if (((began || recorder.frames.length > 30) && !running && last.length === 3 && new Set(last).size === 1) || recorder.frames.length > 600) {
            recorder.recording = false;
            resolve(recorder.frames);
          } else {
            requestAnimationFrame(wait);
          }
        };

        requestAnimationFrame(wait);
      }),
    LIST
  )) as Drawn[];
}

// Every frame the open list draws while a key is pressed into its search.
async function framesOf(page: Page, key: string): Promise<Drawn[]> {
  await recordList(page);
  await page.keyboard.press(key);

  return await settledList(page);
}

// One box's course through the frames it stands in.
function courseOf(seen: Drawn[], key: string): { left: number; top: number; height: number }[] {
  return seen.flatMap((one) => (one.boxes[key] === undefined ? [] : [one.boxes[key]!]));
}

function steady(values: number[]): boolean {
  const steps = values.slice(1).map((value, at) => value - values[at]!);

  return steps.every((step) => step >= 0) || steps.every((step) => step <= 0);
}

// The frame a value first leaves where it stood in the first frame.
function leavesAt(values: number[]): number {
  return values.findIndex((value) => value !== values[0]);
}

const LEFT_BY_A = ["Berlin", "Dublin", "Oslo"];
const KEPT_BY_A = ["Riga", "Tallinn", "Vienna", "Athens", "Lisbon", "Madrid", "Rome", "Seville", "Valletta"];

// The one select's list as the words typed narrow it and give back what they took (`docs/design.md`,
// "Motion"): a moving list, at a shorter length than the layer's so a run costs a fraction of a
// second and still draws several frames. How a moving list's hooks size an item is the motion
// test's own (`tests/browser/motion.test.ts`); this checks the select's list is moved by them.
describe.skipIf(!ready)("the one select's list as the words narrow it", () => {
  async function opened(reducedMotion: "reduce" | "no-preference"): Promise<Page> {
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion })).newPage();

    await serve(page);
    await page.addStyleTag({ content: ":root { --bmo-motion-unfold: 160ms; }" });

    return page;
  }

  let page: Page;

  beforeAll(async () => {
    page = await opened("no-preference");
  }, BROWSER_HOOK_MS);

  afterEach(async () => {
    await closeLeftOpen(page);
  });

  afterAll(async () => {
    await page?.context().close();
  });

  test("slides the choices that stay, folds those it leaves out and unfolds them back, all at once, with no fade", async () => {
    await page.click("#long");
    await page.waitForSelector(FIELD);
    await listedWhole(page);

    const narrowing = await framesOf(page, "a");

    for (const one of narrowing) {
      for (const [key, box] of Object.entries(one.boxes)) expect(box.opacity, key).toBe(1);
    }

    for (const key of LEFT_BY_A) {
      const heights = courseOf(narrowing, key).map((one) => one.height);

      expect(steady(heights), key).toBe(true);
      expect(Math.min(...heights), key).toBeLessThan(5);
      expect(narrowing.at(-1)!.boxes[key], key).toBeUndefined();
    }

    // A choice that stays is the same choice wherever it stands, so it slides up through the frames
    // between rather than another choice taking its place at once.
    for (const key of KEPT_BY_A) {
      const course = courseOf(narrowing, key);

      expect(new Set(course.map((one) => one.left)).size, key).toBe(1);
      expect(steady(course.map((one) => one.top)), key).toBe(true);
      expect(new Set(course.map((one) => one.top)).size, key).toBeGreaterThan(3);
    }

    // The highlight leaves a choice that goes for the first one left, once the choices have moved.
    expect(await page.$$eval(`${LIST} [data-highlighted]`, (parts) => parts.map((part) => part.querySelector("[data-slot=itemLabel]")?.textContent?.trim()))).toEqual(["Riga"]);

    const starts = [...LEFT_BY_A.map((key) => leavesAt(courseOf(narrowing, key).map((one) => one.height))), ...KEPT_BY_A.map((key) => leavesAt(courseOf(narrowing, key).map((one) => one.top)))];

    expect(Math.max(...starts) - Math.min(...starts), starts.join(",")).toBeLessThanOrEqual(1);

    const widening = await framesOf(page, "Backspace");

    for (const key of LEFT_BY_A) {
      const heights = courseOf(widening, key).map((one) => one.height);

      expect(steady(heights), key).toBe(true);
      expect(heights[0], key).toBeLessThan(heights.at(-1)!);
      expect(new Set(heights).size, key).toBeGreaterThan(3);
    }

    expect(new Set(courseOf(widening, "Valletta").map((one) => one.top)).size).toBeGreaterThan(3);
    await listedWhole(page);
    await close(page);
  });

  test("folds a group the words leave no choice in as one, the group after it sliding up", async () => {
    await page.click("#grouped");
    await page.waitForSelector(FIELD);
    await listedAs(page, ["Almond", "Apricot", "Aqua", "Azure", "Beige", "Black", "Bronze", "Brown"]);

    const seen = await framesOf(page, "b");
    const group = courseOf(seen, "group Almond").map((one) => one.height);

    expect(steady(group)).toBe(true);
    expect(Math.min(...group)).toBeLessThan(5);
    expect(seen.at(-1)!.boxes["group Almond"]).toBeUndefined();

    // Its choices go with it, clipped by it, rather than folding of their own.
    expect(new Set(courseOf(seen, "Almond").map((one) => one.height)).size).toBe(1);
    expect(new Set(courseOf(seen, "group Beige").map((one) => one.top)).size).toBeGreaterThan(3);
    await listedAs(page, ["Beige", "Black", "Bronze", "Brown"]);
    await close(page);
  });

  test("takes no Enter on a choice while it folds away, and gives its highlight to the one left", async () => {
    await page.click("#found");
    await page.waitForSelector(FIELD);
    await page.keyboard.type("linus");
    await listedAs(page, ["Linus Park"]);
    await page.fill(FIELD, "ada");

    // Enter pressed in the frame the road's next answer comes in, the highlighted choice it leaves
    // out still folding.
    const folding = await page.evaluate(async (selector) => {
      const list = document.querySelector(selector)!;
      const labels = (): string[] => [...list.querySelectorAll("[data-slot=itemLabel]")].map((part) => part.textContent?.trim() ?? "");

      await new Promise<void>((arrived) => {
        const look = (): void => (labels().includes("Ada Byron") ? arrived() : void requestAnimationFrame(look));

        look();
      });

      const stillThere = labels().includes("Linus Park");

      list.querySelector("input")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));

      return stillThere;
    }, LIST);

    expect(folding).toBe(true);
    await listedAs(page, ["Ada Byron"]);
    expect(await page.$(LIST)).not.toBeNull();
    expect(await page.textContent("#found")).not.toContain("Linus Park");

    await page.waitForFunction((selector) => document.querySelector(`${selector} [data-highlighted] [data-slot=itemLabel]`)?.textContent?.trim() === "Ada Byron", LIST, { timeout: 3_000 });
    await page.keyboard.press("Enter");
    await page.waitForSelector(LIST, { state: "detached" });
    expect(await page.textContent("#found")).toContain("Ada Byron");
  });

  test("changes at once for a reader who asked for less movement", async () => {
    const still = await opened("reduce");

    try {
      await still.click("#long");
      await still.waitForSelector(FIELD);
      await listedWhole(still);

      const seen = await framesOf(still, "a");

      // A choice that goes stands at its height until the frame it is gone in, or stands at none for
      // that frame before it is taken out.
      for (const key of LEFT_BY_A) {
        const heights = courseOf(seen, key).map((one) => one.height);

        expect(heights.every((height) => height === heights[0] || height === 0), `${key}: ${heights.join(",")}`).toBe(true);
        expect(seen.at(-1)!.boxes[key], key).toBeUndefined();
      }

      for (const key of KEPT_BY_A) {
        expect(new Set(courseOf(seen, key).map((one) => one.top)).size, key).toBeLessThanOrEqual(2);
      }
    } finally {
      await still.context().close();
    }
  });
});

// Enter pressed while the road is asked for the words just typed, in a list of several values that
// ends values at its separators, at a desktop's and a phone's width. The list then shows no entry,
// and the value the Enter takes redraws it at once with the first value chosen highlighted, as the
// library highlights a list whose value it did not change itself; the library's own Enter, heard
// around the search, would take that value back. The list changes at once for a reader who asked for
// less movement, so no entry still folding away stands in the way.
describe.skipIf(!ready)("the one select's Enter pressed while the road is asked", () => {
  for (const width of [1280, 360]) {
    test(`at ${width} wide, takes the words as a value and lets no value already chosen go`, async () => {
      const page = await (await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: "reduce" })).newPage();

      try {
        await serve(page);
        await page.click("#cut");
        await page.waitForSelector(FIELD);
        await page.keyboard.type("ann,");
        await takenAs(page, ["ann"]);
        await page.keyboard.type("bob,");
        await takenAs(page, ["ann", "bob"]);

        // The road answers "slo" with nothing, and holds its answer to "slow" for as long as the list
        // stands open.
        await page.keyboard.type("slo");
        await listedAs(page, ['Add "slo"']);
        await page.keyboard.type("w");
        await page.waitForSelector(`${LIST} [data-slot=empty] [role=status]`, { timeout: 3_000 });
        await listedAs(page, []);

        await page.keyboard.press("Enter");
        await takenAs(page, ["slow"]);
        expect(JSON.parse((await page.textContent("#cut-value")) ?? "[]")).toEqual(["ann", "bob", "slow"]);

        // An entry the list stands highlighted is still the one Enter takes.
        await page.keyboard.type("writ");
        await page.waitForFunction((selector) => document.querySelector(`${selector} [data-highlighted] [data-slot=itemLabel]`)?.textContent?.trim() === "Writing", LIST, {
          timeout: 3_000
        });
        await page.keyboard.press("Enter");
        await takenAs(page, ["Writing"]);
        expect(JSON.parse((await page.textContent("#cut-value")) ?? "[]")).toEqual(["ann", "bob", "slow", "Writing"]);
      } finally {
        await page.context().close();
      }
    });
  }
});
