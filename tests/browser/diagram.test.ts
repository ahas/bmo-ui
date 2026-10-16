import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright-core";

import { isDiagram } from "~/domain/diagram";
import { diagramPlace, fencedBlock, fencedRules } from "./fenced-block";
import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// A Mermaid block in a text, drawn as the picture it describes (`docs/components.md`, "Code and
// files"). Drawing needs a real layout — Mermaid measures every word it places — so it is checked
// in a real browser, with the drawing built as the layer ships it and the layer's own rules for the
// place; skipped where the browser build is not on the machine.

const ready = touchReady();
const built = ready ? await Bun.build({ entrypoints: [new URL("../../app/domain/diagram.ts", import.meta.url).pathname], target: "browser" }) : null;
const script = built === null ? "" : await built.outputs[0]!.text();

let browser: Browser;
let page: Page;

// The labels are Hangul, since how its words break and are measured is what a label has to survive.
const ITEM = "\ud56d\ubaa9\uc73c\ub85c \uc62c\ub9bc";
const FLOW = ["flowchart TD", `  A[\uc694\uccad] --> B[${ITEM}]`, "  B --> C[\uc791\uc5c5]"].join("\n");

interface Seen {
  drawn: string | null;
  failed: boolean;
  svgs: number;
  words: string;
  width: number | null;
  sourceShown: boolean;
}

async function drawn(html: string, dark: boolean): Promise<Seen> {
  return page.evaluate(
    async ([shown, night]) => {
      const out = document.getElementById("out")!;

      out.innerHTML = shown;
      await (window as unknown as { draw: (dark: boolean) => Promise<void> }).draw(night);

      const place = out.querySelector<HTMLElement>("div[data-diagram]");
      const svg = place?.querySelector("svg") ?? null;

      return {
        drawn: place?.dataset.drawn ?? null,
        failed: place?.dataset.failed !== undefined,
        svgs: out.querySelectorAll("svg").length,
        words: svg?.textContent ?? "",
        width: svg === null ? null : Number(svg.getAttribute("width")),
        sourceShown: place?.querySelector("pre")?.checkVisibility() ?? false
      };
    },
    [html, dark] as const
  );
}

describe.skipIf(!ready)("a diagram in a text", () => {
  beforeAll(async () => {
    expect(built?.success).toBe(true);

    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 412, height: 915 } });
    await page.setContent(`<style>${fencedRules()}</style><div id="out" class="markdown" style="width: 380px"></div>`);
    await page.addScriptTag({ type: "module", content: `${script}\nwindow.draw = (dark) => drawDiagrams(document.getElementById("out"), dark);` });
    await page.waitForFunction(() => "draw" in window);
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await browser?.close();
  }, BROWSER_HOOK_MS);

  test("is drawn as the picture, its Hangul words in it and its source put away", async () => {
    const seen = await drawn(diagramPlace(FLOW), false);

    expect(seen.drawn).toBe("neo");
    expect(seen.svgs).toBe(1);
    expect(seen.words).toContain(ITEM);
    expect(seen.sourceShown).toBe(false);
  }, 60_000);

  test("stands at the size it was laid out at, giving up at most a fifth of it to the column", async () => {
    const seen = await drawn(diagramPlace(FLOW), false);
    const sizes = await page.evaluate(() => {
      const svg = document.querySelector<SVGSVGElement>("#out svg")!;

      return { laidOut: svg.viewBox.baseVal.width, floor: svg.style.minWidth };
    });

    expect(seen.width).toBe(Math.ceil(sizes.laidOut));
    expect(sizes.floor).toBe(`${Math.ceil(sizes.laidOut * 0.8)}px`);
  }, 60_000);

  test("breaks a Hangul label between words, never between the syllables of one", async () => {
    const words =
      "\ub2e4\uc774\uc5b4\uadf8\ub7a8\uc73c\ub85c \uadf8\ub824\uc9c0\ub294 \ud55c\uad6d\uc5b4 \uc124\uba85\uc740 \ub0b1\ub9d0 \uc0ac\uc774\uc5d0\uc11c\ub9cc \uc904\uc744 \ubc14\uafbc\ub2e4 \uadf8\ub798\uc57c \uc77d\ud78c\ub2e4";

    await drawn(diagramPlace(["flowchart TD", `  A["${words}"] --> B`].join("\n")), false);

    const breaks = await page.evaluate(() => {
      const found: string[] = [];
      const walker = document.createTreeWalker(document.querySelector("#out foreignObject")!, NodeFilter.SHOW_TEXT);

      while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = node.textContent ?? "";
        let previous: number | null = null;

        for (let at = 0; at < text.length; at += 1) {
          const range = document.createRange();

          range.setStart(node, at);
          range.setEnd(node, at + 1);

          const top = range.getBoundingClientRect().top;

          if (previous !== null && top > previous + 2) found.push(`${text[at - 1]}|${text[at]}`);
          previous = top;
        }
      }

      return found;
    });

    expect(breaks.length).toBeGreaterThan(0);
    expect(breaks.every((pair) => pair.startsWith(" |") || pair.endsWith("| "))).toBe(true);
  }, 60_000);

  test("is drawn again in the dark theme when the page switches to it", async () => {
    await drawn(diagramPlace(FLOW), false);

    const dark = await page.evaluate(async () => {
      await (window as unknown as { draw: (dark: boolean) => Promise<void> }).draw(true);

      return { drawn: document.querySelector<HTMLElement>("#out div[data-diagram]")!.dataset.drawn, svgs: document.querySelectorAll("#out svg").length };
    });

    expect(dark).toEqual({ drawn: "neo-dark", svgs: 1 });
  }, 60_000);

  // Every fill a diagram's parts stand in, by the selector that finds them, in the order drawn.
  async function fills(source: string, dark: boolean, selector: string): Promise<string[]> {
    await drawn(diagramPlace(source), dark);

    return page.evaluate((query) => [...document.querySelectorAll(`#out svg ${query}`)].map((part) => getComputedStyle(part).fill), selector);
  }

  // Whether a colour carries a hue rather than standing grey: its channels lie apart.
  function hued(colour: string): boolean {
    const channels = (colour.match(/\d+/g) ?? []).slice(0, 3).map(Number);

    return Math.max(...channels) - Math.min(...channels) > 24;
  }

  const PIE = ["pie", '  "one" : 4', '  "two" : 3', '  "three" : 2', '  "four" : 1'].join("\n");
  const BARS = ["xychart-beta", '  x-axis ["a", "b", "c"]', "  y-axis 0 --> 10", "  bar [3, 5, 7]"].join("\n");
  const KINDS = ["flowchart TD", "  A[one] --> B[two]", "  B --> C[three]", "  class A c1", "  class B c2"].join("\n");
  const PERIODS = ["timeline", "  2024 : one", "  2025 : two", "  2026 : three"].join("\n");

  for (const dark of [false, true]) {
    test(`tells its series apart by hue in the ${dark ? "dark" : "light"} theme`, async () => {
      const slices = await fills(PIE, dark, "path.pieCircle");
      const bars = await fills(BARS, dark, "g.plot rect");
      const boxes = await fills(KINDS, dark, ".node > :is(rect, path, polygon)");
      const periods = await fills(PERIODS, dark, ".timeline-node :is(rect, path)");

      expect(slices).toHaveLength(4);
      expect(new Set(slices).size).toBe(4);
      expect(slices.every(hued)).toBe(true);
      expect(bars.length).toBeGreaterThan(0);
      expect(bars.every(hued)).toBe(true);
      expect(new Set(boxes).size).toBe(3);
      expect(boxes.filter(hued)).toHaveLength(2);
      expect(new Set(periods).size).toBe(3);
      expect(periods.length).toBeGreaterThan(0);
      expect(periods.every(hued)).toBe(true);
    }, 60_000);
  }

  test("leaves a source Mermaid refuses as the code it was written as", async () => {
    const seen = await drawn(diagramPlace("flowchart TD\n  A --> --> B["), false);

    expect(seen).toMatchObject({ drawn: null, failed: true, svgs: 0, sourceShown: true });
  }, 60_000);

  test("leaves a block in any other language as code", async () => {
    await drawn(fencedBlock("const a = 1;\n", "ts", "Copy"), false);

    const standing = await page.evaluate(() => ({
      figures: document.querySelectorAll("#out .markdown-diagram-figure").length,
      code: document.querySelectorAll("#out .markdown-code pre").length
    }));

    expect(standing).toEqual({ figures: 0, code: 1 });
  }, 60_000);
});

describe("which fenced block is a diagram", () => {
  test("is the one whose info string's first word is mermaid, in any case", () => {
    expect(isDiagram("mermaid")).toBe(true);
    expect(isDiagram(" Mermaid  title")).toBe(true);
    expect(isDiagram("ts")).toBe(false);
    expect(isDiagram(undefined)).toBe(false);
  });
});
