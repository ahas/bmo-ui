import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright-core";
import postcss from "postcss";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";
import type { AtRule } from "postcss";

// The work-in-progress mark as the browser draws it (`docs/design.md`, "Motion"). The page holds the
// layer's own rules for the mark as its stylesheet ships them, read out of it, beside the spin utility
// as Tailwind writes it in the utilities layer, where the library's loading icons take it. A mark
// carrying no spin, one carrying it and the library's loading icon are drawn, and the animation the
// browser settled on for each is read back, with and without less movement asked for.

const css = await Bun.file(new URL("../../app/assets/css/main.css", import.meta.url)).text();

// Every rule of the stylesheet that names the mark, with the at-rule standing around it.
function markRules(): string {
  const found: string[] = [];

  postcss.parse(css).walkRules((rule) => {
    if (!rule.selector.includes("progress-activity")) return;

    const parent = rule.parent as AtRule | undefined;

    found.push(parent?.type === "atrule" ? `@${parent.name} ${parent.params} { ${rule.toString()} }` : rule.toString());
  });

  return found.join("\n");
}

const utilities = `@layer theme, base, components, utilities;
  @layer utilities {
    .animate-spin { animation: var(--animate-spin); }
  }
  :root { --animate-spin: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }`;

function fixture(): string {
  return `<style>${utilities}\n${markRules()}
    span { display: inline-block; width: 16px; height: 16px; background: currentColor; }</style>
    <span class="i-material-symbols-progress-activity" data-at-rest></span>
    <span class="i-material-symbols-progress-activity animate-spin" data-spun></span>
    <span class="i-material-symbols-progress-activity shrink-0 animate-spin" data-slot="leadingIcon" data-library></span>`;
}

const ready = touchReady();
let browser: Browser | null = null;
let page: Page;

beforeAll(async () => {
  if (!ready) {
    return;
  }

  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 400, height: 300 } });

  await page.setContent(fixture());
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();
}, BROWSER_HOOK_MS);

// The animation each mark turns by, by its data attribute; "none" for one that stands still.
async function turning(): Promise<Record<string, string>> {
  return page.evaluate(() =>
    Object.fromEntries(["at-rest", "spun", "library"].map((name) => [name, getComputedStyle(document.querySelector(`[data-${name}]`)!).animationName]))
  );
}

describe.skipIf(!ready)("the work-in-progress mark in the browser", () => {
  test("turns only where it carries the spin", async () => {
    await page.emulateMedia({ reducedMotion: "no-preference" });

    expect(await turning()).toEqual({ "at-rest": "none", spun: "spin", library: "spin" });
  });

  test("stands still wherever it turns once less movement was asked for", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    expect(await turning()).toEqual({ "at-rest": "none", spun: "none", library: "none" });
  });
});
