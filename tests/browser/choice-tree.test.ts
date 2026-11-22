import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// The side tree drawn by a real browser (`docs/components.md`, "Choosing from a side tree"). At a desk's
// width the tree stands beside the body, the search sharing one padding with its rows, its box, icon
// and words on a row's leading with an icon, and each level standing in by the tree's own step; the way down to the chosen node stands open, each node above it
// marked and heard as holding it. A node's badge stands on its label's line, and a drag of the host's kind lights the row it
// stands over where the host takes it and hands its key over on the drop. The chosen row stands in the list's view
// as it stands and as the host chooses another. Choosing another company and then handing that company its units
// moves nothing: no row runs a transition or an animation, and every row stands at its own depth in
// every frame, while the words narrowing the tree move its rows. The chevron alone opens and closes a
// node; the keys walk the tree and choose; the search keeps the nodes over each match, open. At a
// phone's width one button carrying the chosen label, in a row of its own or in a toolbar row the body
// places it in, opens the tree as a bottom drawer, which Back and Esc close alone and a choice closes. What the side list does around its rows is its own browser test
// (`tests/browser/choice-sidebar.test.ts`), and which nodes the words keep the side-parts module's
// (`tests/domain/side-parts.test.ts`). Skipped where the browser build is not on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/choice-tree-harness.js" defer></script></head><body><div id="page" style="isolation:isolate"></div></body></html>`;

const TREE = "[data-choice-tree]";
const ITEM = "[role=treeitem]";
const DESK = { width: 1280, height: 800 };
const PHONE = { width: 360, height: 780 };

let out = "";
let script = "";
let browser: Browser;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-choice-tree-"));

  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/choice-tree-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "choice-tree-harness.js")).text();
  browser = await chromium.launch();
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

// The page at a width, moving as a reader who asked for nothing less sees it unless told otherwise,
// so a row that moved would be seen moving.
async function opened(viewport: { width: number; height: number }, reducedMotion: "reduce" | "no-preference" = "no-preference"): Promise<Page> {
  const page = await (await browser.newContext({ viewport, reducedMotion })).newPage();

  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/choice-tree-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForSelector("#chosen");
  await page.waitForFunction(() => "tree" in window);

  return page;
}

interface Row {
  label: string;
  level: number;
  indent: number;
  expanded: string | null;
  selected: string | null;
  way: boolean;
}

// The rows as they stand, top to bottom: each by its label, its depth, how far its words stand in,
// whether it stands open and chosen, and whether it carries the mark of a node above the chosen one.
async function rows(page: Page, scope = TREE): Promise<Row[]> {
  return await page.$$eval(`${scope} [role=treeitem]`, (items) =>
    items.map((item) => ({
      label: item.querySelector("[data-choice-tree-row]")?.textContent ?? "",
      level: Number(item.getAttribute("aria-level")),
      indent: Number.parseFloat(getComputedStyle(item).paddingInlineStart),
      expanded: item.getAttribute("aria-expanded"),
      selected: item.getAttribute("aria-selected"),
      way: item.querySelector("[data-choice-tree-way]") !== null
    }))
  );
}

const labels = (standing: Row[]): string[] => standing.map((row) => row.label);

interface Lines {
  searchBox: number;
  searchIcon: number;
  searchWords: number;
  rowBox: number;
  rowIcon: number;
  rowWords: number;
  plainWords: number;
}

// Where the search and the top-level rows of the list in the scope start: the search's box, its icon
// and its words; the box, the icon and the words of a row leading with an icon; and the words of one
// with none.
async function lines(page: Page, scope: string): Promise<Lines> {
  return await page.$eval(scope, (list) => {
    const left = (element: Element | null | undefined): number => element!.getBoundingClientRect().left;
    const input = list.querySelector<HTMLInputElement>("[data-choice-sidebar-search]")!;
    const iconRow = list.querySelector('[data-choice-tree-row="string:atlas"]')!.closest("[role=treeitem]")!;

    return {
      searchBox: left(input),
      searchIcon: left(input.parentElement!.querySelector("[data-slot=leadingIcon]")),
      searchWords: left(input) + Number.parseFloat(getComputedStyle(input).paddingInlineStart),
      rowBox: left(iconRow),
      rowIcon: left(iconRow.querySelector("[data-choice-tree-icon]")),
      rowWords: left(iconRow.querySelector("[data-choice-tree-row]")),
      plainWords: left(list.querySelector('[data-choice-tree-row="string:north"]'))
    };
  });
}

// The search and the rows share one padding: the search's box stands on the rows' box, its icon on
// the rows' icons and its words on their words, and a row with no icon has its words on the icon line.
function linedUp(at: Lines): void {
  expect(at.searchBox).toBe(at.rowBox);
  expect(at.searchIcon).toBe(at.rowIcon);
  expect(at.searchWords).toBe(at.rowWords);
  expect(at.plainWords).toBe(at.searchIcon);
}

async function setState(page: Page, change: Record<string, unknown>): Promise<void> {
  await page.evaluate((next) => Object.assign((window as unknown as { tree: Record<string, unknown> }).tree, next), change);
}

async function choices(page: Page): Promise<(string | number)[]> {
  return await page.evaluate(() => [...(window as unknown as { tree: { choices: (string | number)[] } }).tree.choices]);
}

// The row of a label.
function row(page: Page, label: string, scope = TREE) {
  return page.locator(`${scope} ${ITEM}`, { has: page.locator(`[data-choice-tree-row]:text-is("${label}")`) });
}

// Watches the tree frame by frame until it is told to stop: every transition or animation that ran on
// anything inside it, every part of it whose style would move it, and every row standing at a depth
// other than its own. A row's depth is its own where how far its words stand in is the step its level
// says, the same in every frame.
async function watchTree(page: Page): Promise<void> {
  await page.evaluate(() => {
    const seen = { motions: [] as string[], moving: [] as string[], depths: new Map<number, Set<number>>(), frames: 0, stop: false };

    (window as unknown as { watched: typeof seen }).watched = seen;

    const frame = (): void => {
      const tree = document.querySelector("[data-choice-tree]");

      if (tree !== null) {
        for (const motion of document.getAnimations()) {
          const target = (motion.effect as KeyframeEffect | null)?.target;

          if (target instanceof Element && tree.contains(target)) seen.motions.push(`${motion.constructor.name} on ${target.tagName}`);
        }

        for (const part of [tree, ...tree.querySelectorAll("*")]) {
          for (const pseudo of [null, "::before"]) {
            const style = getComputedStyle(part, pseudo);
            const timed = style.transitionProperty !== "none" && style.transitionDuration.split(",").some((length) => Number.parseFloat(length) > 0);

            if (timed || style.animationName !== "none") seen.moving.push(`${part.tagName}${pseudo ?? ""} ${style.transitionProperty} ${style.animationName}`);
          }
        }

        for (const item of tree.querySelectorAll("[role=treeitem]")) {
          const level = Number(item.getAttribute("aria-level"));
          const indents = seen.depths.get(level) ?? new Set<number>();

          indents.add(Number.parseFloat(getComputedStyle(item).paddingInlineStart));
          seen.depths.set(level, indents);
        }
      }

      seen.frames += 1;

      if (!seen.stop) requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  });
}

async function watched(page: Page): Promise<{ motions: string[]; moving: string[]; depths: Record<number, number[]>; frames: number }> {
  return await page.evaluate(async () => {
    const seen = (window as unknown as { watched: { motions: string[]; moving: string[]; depths: Map<number, Set<number>>; frames: number; stop: boolean } }).watched;

    await new Promise((settled) => requestAnimationFrame(() => requestAnimationFrame(settled)));
    seen.stop = true;

    return { motions: [...new Set(seen.motions)], moving: [...new Set(seen.moving)], depths: Object.fromEntries([...seen.depths].map(([level, indents]) => [level, [...indents]])), frames: seen.frames };
  });
}

describe.skipIf(!ready)("the side tree at a desk's width", () => {
  test("stands beside the body, its search lined up with its rows, the way to the chosen node open and marked", async () => {
    const page = await opened(DESK);
    const sizes = await page.evaluate(() => {
      const list = document.querySelector("[data-choice-sidebar-list]")!.getBoundingClientRect();
      const body = document.querySelector("[data-choice-sidebar-body]")!.getBoundingClientRect();

      return { listLeft: list.left, listRight: list.right, bodyLeft: body.left, bodyRight: body.right };
    });

    expect(sizes.listLeft).toBe(0);
    expect(sizes.bodyLeft).toBe(sizes.listRight + 1);
    expect(sizes.bodyRight).toBe(DESK.width);
    linedUp(await lines(page, "[data-choice-sidebar-list]"));
    expect(await page.locator("[data-choice-sidebar-open]").count()).toBe(0);
    expect(await page.getAttribute(`${TREE}`, "role")).toBe("tree");
    expect(await page.getAttribute(`${TREE}`, "aria-label")).toBe("Organisations");

    const standing = await rows(page);

    expect(labels(standing)).toEqual(["Northwind", "Sales", "Field team", "Support", "Atlas", "Beacon"]);
    expect(standing.map((one) => one.level)).toEqual([1, 2, 3, 2, 1, 1]);
    expect(standing[1]!.indent - standing[0]!.indent).toBe(28);
    expect(standing[2]!.indent - standing[1]!.indent).toBe(28);
    expect(standing.map((one) => one.expanded)).toEqual(["true", "true", null, null, null, null]);
    expect(standing.map((one) => one.way)).toEqual([true, true, false, false, false, false]);
    expect(standing.map((one) => one.selected)).toEqual(["false", "false", "true", "false", "false", "false"]);

    // Each node above the chosen one is heard as holding it, and no other.
    expect(await page.getByRole("treeitem", { name: /Holds the chosen/ }).count()).toBe(2);
    expect(await page.getByRole("treeitem", { name: /^Northwind\s*Holds the chosen$/ }).count()).toBe(1);
    await page.close();
  });

  test("draws a node's badge on its label's line, and lights the row a drag of the host's kind stands over, handing its key on the drop", async () => {
    const page = await opened(DESK);
    const line = await page.evaluate(() => {
      const label = document.querySelector('[data-choice-tree-row="number:4"]')!.getBoundingClientRect();
      const badge = document.querySelector("[data-choice-tree-badge]")!;
      const box = badge.getBoundingClientRect();

      return { text: badge.textContent?.trim(), apart: Math.abs((label.top + label.bottom) / 2 - (box.top + box.bottom) / 2), gap: box.left - label.right };
    });

    expect(line).toEqual({ text: "Desk", apart: expect.any(Number), gap: 8 });
    expect(line.apart).toBeLessThanOrEqual(1);

    // A drag event of a kind, dispatched on a row's words, and whether the tree took it.
    const drag = async (row: string, type: string, kind: "dragover" | "drop"): Promise<boolean> =>
      await page.evaluate(
        ([row, type, kind]) => {
          const data = new DataTransfer();

          data.setData(type!, "rows");

          const event = new DragEvent(kind!, { bubbles: true, cancelable: true, dataTransfer: data });

          document.querySelector(`[data-choice-tree-row="${row}"]`)!.dispatchEvent(event);

          return event.defaultPrevented;
        },
        [row, type, kind]
      );
    const litRows = async (): Promise<string[]> => await page.$$eval("[data-choice-tree-lit] [data-choice-tree-row]", (marks) => marks.map((mark) => mark.textContent ?? ""));
    const HARNESS_DRAG = "application/x-harness-rows";

    expect(await drag("number:4", HARNESS_DRAG, "dragover")).toBe(true);
    await page.waitForSelector("[data-choice-tree-lit]");
    expect(await litRows()).toEqual(["Support"]);

    // A row the host refuses, and a drag of another kind, take nothing and light nothing.
    expect(await drag("string:beacon", HARNESS_DRAG, "dragover")).toBe(false);
    await page.waitForSelector("[data-choice-tree-lit]", { state: "detached" });
    expect(await drag("number:2", "text/plain", "dragover")).toBe(false);
    expect(await litRows()).toEqual([]);

    expect(await drag("number:4", HARNESS_DRAG, "drop")).toBe(true);
    expect(await page.evaluate(() => [...(window as unknown as { tree: { drops: (string | number)[] } }).tree.drops])).toEqual([4]);
    expect(await choices(page)).toEqual([]);
    expect(await litRows()).toEqual([]);
    await page.close();
  });

  test("brings the chosen row into the list's view as it stands and as the host chooses another", async () => {
    const page = await opened({ width: 1280, height: 220 });
    // Whether a row stands whole inside the list's visible box, and how far the list is scrolled.
    const inView = async (row: string) =>
      await page.evaluate((row) => {
        const item = document.querySelector(`[data-choice-tree-row="${row}"]`)!.closest("[role=treeitem]")!.getBoundingClientRect();
        const scroller = document.querySelector("[data-choice-tree]")!.closest(".overflow-y-auto")!;
        const box = scroller.getBoundingClientRect();

        return { whole: item.top >= box.top - 0.5 && item.bottom <= box.bottom + 0.5, scrolled: scroller.scrollTop > 0 };
      }, row);

    expect(await inView("number:3")).toEqual({ whole: true, scrolled: false });
    expect((await inView("string:beacon")).whole).toBe(false);
    await page.evaluate(() => (window as unknown as { choose: (key: string) => void }).choose("beacon"));
    await page.waitForFunction(() => document.querySelector('[data-choice-tree-row="string:beacon"]')!.closest("[role=treeitem]")!.getAttribute("aria-selected") === "true");
    await page.waitForFunction(() => document.querySelector("[data-choice-tree]")!.closest(".overflow-y-auto")!.scrollTop > 0, null, { timeout: 5_000 });
    expect(await inView("string:beacon")).toEqual({ whole: true, scrolled: true });
    await page.close();
  });

  test("moves no row as another company is chosen and then handed its units, each row at its own depth in every frame", async () => {
    const page = await opened(DESK);

    await watchTree(page);
    await row(page, "Atlas").click();
    await page.waitForFunction(() => document.querySelector("#chosen")?.textContent === "atlas");
    await setState(page, { atlasUnits: true });
    await page.waitForFunction(() => document.querySelectorAll("[data-choice-tree] [role=treeitem]").length === 8);

    const seen = await watched(page);

    expect(seen.frames).toBeGreaterThan(2);
    expect(seen.motions).toEqual([]);
    expect(seen.moving).toEqual([]);
    expect(seen.depths).toEqual({ 1: [12], 2: [40], 3: [68] });
    expect(await choices(page)).toEqual(["atlas"]);

    // The chosen company stands open over its units, and the way to the old choice is no longer marked.
    const standing = await rows(page);

    expect(labels(standing)).toEqual(["Northwind", "Sales", "Field team", "Support", "Atlas", "Harbor", "Indigo", "Beacon"]);
    expect(standing.find((one) => one.label === "Atlas")).toMatchObject({ expanded: "true", selected: "true", way: false });
    expect(standing.filter((one) => one.way)).toEqual([]);

    // Choosing a unit of it, which opens the unit over its own team, moves nothing either.
    await watchTree(page);
    await row(page, "Harbor").click();
    await page.waitForFunction(() => document.querySelector("#chosen")?.textContent === "6");

    const again = await watched(page);

    expect(again.motions).toEqual([]);
    expect(again.moving).toEqual([]);
    expect((await rows(page)).filter((one) => one.way).map((one) => one.label)).toEqual(["Atlas"]);

    // The words narrowing the tree are the one change that moves its rows.
    await watchTree(page);
    await page.fill("[data-choice-sidebar-search]", "night");

    const narrowed = await watched(page);

    expect(narrowed.motions).toContain("CSSTransition on LI");
    await page.close();
  });

  test("opens and closes a node by its chevron alone, choosing nothing, and a press on the row chooses without closing it", async () => {
    const page = await opened(DESK);

    await row(page, "Northwind").locator("[data-choice-tree-toggle]").click();
    await page.waitForFunction(() => document.querySelectorAll("[data-choice-tree] [role=treeitem]").length === 3);
    expect(labels(await rows(page))).toEqual(["Northwind", "Atlas", "Beacon"]);
    expect(await choices(page)).toEqual([]);
    expect(await page.textContent("#chosen")).toBe("3");

    await row(page, "Northwind").locator("[data-choice-tree-toggle]").click();
    await page.waitForFunction(() => document.querySelectorAll("[data-choice-tree] [role=treeitem]").length === 6);

    await row(page, "Sales").click();
    await page.waitForFunction(() => document.querySelector("#chosen")?.textContent === "2");
    expect((await rows(page)).find((one) => one.label === "Sales")).toMatchObject({ expanded: "true", selected: "true" });
    expect(await choices(page)).toEqual([2]);
    await page.close();
  });

  test("walks by the library's keys and chooses on Enter", async () => {
    const page = await opened(DESK);

    await row(page, "Field team").focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => document.querySelector("#chosen")?.textContent === "atlas");
    expect(await choices(page)).toEqual(["atlas"]);

    // The left arrow closes the node the focus stands on, the right one opens it again.
    await row(page, "Northwind").focus();
    await page.keyboard.press("ArrowLeft");
    await page.waitForFunction(() => document.querySelectorAll("[data-choice-tree] [role=treeitem]").length === 3);
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => document.querySelectorAll("[data-choice-tree] [role=treeitem]").length > 3);
    expect(await choices(page)).toEqual(["atlas"]);
    await page.close();
  });

  test("narrows to the nodes the words find, each under the nodes above it standing open, and gives the tree back", async () => {
    const page = await opened(DESK, "reduce");

    await row(page, "Northwind").locator("[data-choice-tree-toggle]").click();
    await page.waitForFunction(() => document.querySelectorAll("[data-choice-tree] [role=treeitem]").length === 3);

    await page.fill("[data-choice-sidebar-search]", "field");
    await page.waitForFunction(() => document.querySelectorAll("[data-choice-tree] [role=treeitem]").length === 3);

    const found = await rows(page);

    expect(labels(found)).toEqual(["Northwind", "Sales", "Field team"]);
    expect(found.map((one) => one.expanded)).toEqual(["true", "true", null]);
    expect(await page.$$eval(`${TREE} mark`, (marks) => marks.map((mark) => mark.textContent))).toEqual(["Field"]);

    await page.fill("[data-choice-sidebar-search]", "nobody");
    await page.waitForSelector("[data-choice-sidebar-empty]");
    expect(await page.textContent("[data-choice-sidebar-empty]")).toBe("Nothing found");

    await page.fill("[data-choice-sidebar-search]", "");
    await page.waitForFunction(() => document.querySelectorAll("[data-choice-tree] [role=treeitem]").length === 3);
    expect(labels(await rows(page))).toEqual(["Northwind", "Atlas", "Beacon"]);
    await page.close();
  });

  test("stands the side list's skeleton while unread and its failure with a refresh for the host", async () => {
    const page = await opened(DESK, "reduce");

    await setState(page, { unread: true });
    await page.waitForSelector("[data-choice-sidebar-list] [aria-busy=true]");
    expect(await page.locator(TREE).count()).toBe(0);

    await setState(page, { failure: "The tree could not be read" });
    await page.waitForSelector("[data-choice-sidebar-failure]");
    await page.click("[data-choice-sidebar-failure] button");
    expect(await page.evaluate(() => (window as unknown as { tree: { retries: number } }).tree.retries)).toBe(1);
    await page.close();
  });
});

describe.skipIf(!ready)("the side tree at a phone's width", () => {
  test("hands its body the button to place in a toolbar row of the body's own, drawing no row for it", async () => {
    const page = await opened(PHONE, "reduce");

    await setState(page, { openerInBody: true });
    await page.waitForSelector("[data-toolbar] [data-choice-sidebar-open]");
    expect(await page.$$eval("[data-choice-sidebar-body] > *", (rows) => rows.map((element) => (element.hasAttribute("data-toolbar") ? "toolbar" : element.id)))).toEqual(["toolbar", "chosen"]);
    expect(await page.locator("[data-choice-sidebar-open]").count()).toBe(1);

    await page.click("[data-choice-sidebar-open]");
    await page.waitForSelector(`[role=dialog] ${TREE}`);
    await row(page, "Beacon", `[role=dialog] ${TREE}`).click();
    await page.waitForFunction(() => document.querySelector("[role=dialog]") === null);
    expect(await page.textContent("[data-toolbar] [data-choice-sidebar-open]")).toBe("Beacon");
    await page.close();
  });

  test("leaves the body the screen and opens the tree from one button carrying the chosen label, closing as a node is chosen", async () => {
    const page = await opened(PHONE, "reduce");

    await page.waitForSelector("[data-choice-sidebar-open]");
    expect(await page.locator(TREE).count()).toBe(0);
    expect(await page.textContent("[data-choice-sidebar-open]")).toBe("Field team");
    expect(await page.$eval("[data-choice-sidebar-body]", (element) => element.getBoundingClientRect().width)).toBe(PHONE.width);

    await page.click("[data-choice-sidebar-open]");
    await page.waitForSelector(`[role=dialog] ${TREE}`);
    expect(labels(await rows(page, `[role=dialog] ${TREE}`))).toEqual(["Northwind", "Sales", "Field team", "Support", "Atlas", "Beacon"]);
    linedUp(await lines(page, "[role=dialog] [data-choice-sidebar-list]"));

    await row(page, "Beacon", `[role=dialog] ${TREE}`).click();
    await page.waitForFunction(() => document.querySelector("[role=dialog]") === null);
    expect(await page.textContent("#chosen")).toBe("beacon");
    expect(await page.textContent("[data-choice-sidebar-open]")).toBe("Beacon");
    expect(await choices(page)).toEqual(["beacon"]);
    await page.close();
  });

  test("closes its drawer on Back and on Esc alone, the page and the choice standing as they were", async () => {
    const page = await opened(PHONE, "reduce");
    const address = page.url();

    await page.waitForSelector("[data-choice-sidebar-open]");

    for (const close of [() => page.goBack(), () => page.keyboard.press("Escape")]) {
      await page.click("[data-choice-sidebar-open]");
      await page.waitForSelector(`[role=dialog] ${TREE}`);
      await close();
      await page.waitForFunction(() => document.querySelector("[role=dialog]") === null);
      expect(page.url()).toBe(address);
      expect(await page.textContent("#chosen")).toBe("3");
      expect(await page.textContent("[data-choice-sidebar-open]")).toBe("Field team");
    }

    expect(await choices(page)).toEqual([]);
    await page.close();
  });
});
