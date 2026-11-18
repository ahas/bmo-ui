import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// Every kind of list the library drops from a control, drawn by a real browser under the layer's
// overrides (`docs/design.md`, "Lists"): at every size, each padding and gap of a row, of a group's
// label, of an empty list's words, of a row's trailing marks and of a shortcut's keys is a multiple of
// 4px, a row and a label stand 8px in all round with 8px between their parts from the small size up,
// and a row's trailing check stands as far in from the row's edge as from its top. Skipped where the
// browser build is not on the machine.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;
const ORIGIN = "http://page.test";
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/menus-harness.js" defer></script></head><body><div id="page" style="isolation:isolate"></div></body></html>`;

const LIST = "[data-slot=content]";
const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

// Each list by the control that opens it and how it is opened, and whether it holds choices or says
// it holds none.
const LISTS = [
  { control: "#select", press: "left", empty: false },
  { control: "#select-menu", press: "left", empty: false },
  { control: "#select-menu-empty", press: "left", empty: true },
  { control: "#input-menu", press: "left", empty: false },
  { control: "#input-menu-empty", press: "left", empty: true },
  { control: "#dropdown-menu", press: "left", empty: false },
  { control: "#context-menu", press: "right", empty: false }
] as const;

let out = "";
let script = "";
let browser: Browser;
let page: Page;

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-menus-"));

  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "tests/browser/menus-harness.config.ts", "--outDir", out, "--logLevel", "error"], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "production", VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" }
  });

  if (built.exitCode !== 0) throw new Error(`the harness build failed: ${built.stderr.toString()}`);

  script = await Bun.file(join(out, "menus-harness.js")).text();
  browser = await chromium.launch();
  page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/menus-harness.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (path === "/") return route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE });

    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForSelector("#context-menu");
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
});

// The spacing an open list draws, in pixels: each padding and gap of the parts named, and where its
// rows' trailing checks stand in from the row's trailing edge and from its top.
interface Spacing {
  // Every value read, by the part it was read on, for a message that names what is off the grid.
  values: { part: string; px: number }[];
  row: { padding: number[]; gap: number } | null;
  label: { padding: number[]; gap: number } | null;
  check: { fromEdge: number; fromTop: number } | null;
}

async function spacing(): Promise<Spacing> {
  return await page.evaluate(async (list) => {
    const content = document.querySelector<HTMLElement>(list)!;

    await Promise.all(content.getAnimations({ subtree: true }).map((animation) => animation.finished));

    const values: { part: string; px: number }[] = [];
    const read = (slot: string, properties: string[]): number[] | null => {
      const element = content.querySelector(`[data-slot=${slot}]`);

      if (element === null) return null;

      const style = getComputedStyle(element);
      const got = properties.map((property) => Number.parseFloat(style.getPropertyValue(property)) || 0);

      got.forEach((px, at) => values.push({ part: `${slot} ${properties[at]}`, px }));

      return got;
    };
    const PADDING = ["padding-top", "padding-right", "padding-bottom", "padding-left"];
    const row = read("item", [...PADDING, "column-gap"]);
    const label = read("label", [...PADDING, "column-gap"]);

    read("empty", PADDING);
    read("itemTrailing", ["column-gap"]);
    read("itemTrailingKbds", ["column-gap"]);

    const checked = [...content.querySelectorAll("[data-slot=itemTrailingIcon]")].find((icon) => icon.closest("[data-slot=item]") !== null);
    let check: { fromEdge: number; fromTop: number } | null = null;

    if (checked !== undefined) {
      const box = checked.closest("[data-slot=item]")!.getBoundingClientRect();
      const mark = checked.getBoundingClientRect();

      check = { fromEdge: Math.round(box.right - mark.right), fromTop: Math.round(mark.top - box.top) };
    }

    return {
      values,
      row: row === null ? null : { padding: row.slice(0, 4), gap: row[4]! },
      label: label === null ? null : { padding: label.slice(0, 4), gap: label[4]! },
      check
    };
  }, LIST);
}

async function opened(control: string, press: "left" | "right"): Promise<void> {
  await page.click(control, { button: press });
  await page.waitForSelector(`${LIST}[data-state=open]`);
}

async function close(): Promise<void> {
  await page.keyboard.press("Escape");
  await page.waitForSelector(LIST, { state: "detached" });
}

describe.skipIf(!ready)("the lists dropped from a control", () => {
  test("stand every padding and gap of their rows on the 4px grid, at every size", async () => {
    for (const size of SIZES) {
      await page.evaluate((one) => (window as unknown as { sizeMenus: (to: string) => void }).sizeMenus(one), size);

      for (const { control, press, empty } of LISTS) {
        await opened(control, press);

        const seen = await spacing();
        const offGrid = seen.values.filter(({ px }) => px % 4 !== 0).map(({ part, px }) => `${size} ${control} ${part} ${px}px`);

        expect(offGrid).toEqual([]);
        if (empty) expect(seen.values.some(({ part }) => part.startsWith("empty "))).toBe(true);
        else expect(seen.row).not.toBeNull();

        if (seen.row !== null && size !== "xs") {
          expect(seen.row).toEqual({ padding: [8, 8, 8, 8], gap: 8 });
          if (seen.label !== null) expect(seen.label).toEqual({ padding: [8, 8, 8, 8], gap: 8 });
        }

        if (seen.check !== null) expect(seen.check.fromEdge).toBe(seen.check.fromTop);

        await close();
      }
    }
  }, 60_000);
});
