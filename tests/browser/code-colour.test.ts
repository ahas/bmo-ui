import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright-core";

import { fencedBlock, fencedRules } from "./fenced-block";
import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// A fenced block naming its language (`docs/components.md`, "Code and files"): the name at its
// head, its lines kept as written, and coloured as the editor drew them once it comes near the
// screen while the text stays as written. The editor itself is a browser bundle of its own, left
// out of the page: a stand-in takes its place, naming every word but `none` a language and drawing
// each line as one run of its second colour, so what is driven here is when a block is coloured and
// the reading of what the editor draws.

const ready = touchReady();
const STAND_IN_EDITOR = `
export function fenceLanguage(word) { return word === "none" ? null : word; }
export async function colourised(text) {
  return text.split("\\n").map((line) => "<span><span class=\\"mtk2\\">" + line.replaceAll("&", "&amp;").replaceAll("<", "&lt;") + "</span></span><br/>").join("");
}`;
const standInEditor = {
  name: "stand-in-editor",
  setup: (build: Bun.PluginBuilder) => {
    build.onResolve({ filter: /\/monaco$/ }, () => ({ path: "monaco", namespace: "stand-in" }));
    build.onLoad({ filter: /.*/, namespace: "stand-in" }, () => ({ contents: STAND_IN_EDITOR, loader: "js" }));
  }
};
const built = ready
  ? await Bun.build({ entrypoints: [new URL("../../app/domain/code-colour.ts", import.meta.url).pathname], target: "browser", plugins: [standInEditor] })
  : null;
const script = built === null ? "" : await built.outputs[0]!.text();

const COPY = "Copy";
const LONG = `let line = "${"a long line of code ".repeat(8)}";`;

// A text the way the editor draws it: a line a span, each run a span with its colour class, a space
// as a no-break space, the characters escaped, the lines closed by a break.
const TEXT = 'curl -s "a&b" <x>\n\n\techo 1\n';
const DRAWN =
  '<span><span class="mtk6">curl</span><span class="mtk1">&nbsp;</span><span class="mtk7">-s</span><span class="mtk1">&nbsp;</span><span class="mtk8">"a&amp;b"</span><span class="mtk1">&nbsp;&lt;x&gt;</span></span><br/>' +
  "<span><span></span></span><br/>" +
  '<span><span class="mtk1">&nbsp;</span><span class="mtk6">echo</span><span class="mtk1">&nbsp;</span><span class="mtk9 mtki">1</span></span><br/>' +
  "<span><span></span></span><br/>";

const FIXTURE = `<meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body { margin: 0; font: 16px sans-serif; } ${fencedRules()}</style>
  <div id="text" class="markdown" style="width: 320px; padding: 16px">${fencedBlock("curl -s https://example.com\n", "shell", COPY)}</div>
  <div id="far" class="markdown" style="width: 320px; padding: 16px">${fencedBlock(`${LONG}\n`, "rust", COPY)}${fencedBlock(`${LONG}\n`, "text", COPY)}${fencedBlock("plain\n", "none", COPY)}</div>
  <div style="height: 3000px"></div>
  <div id="farthest" class="markdown" style="width: 320px; padding: 16px">${fencedBlock("const far = 1;\n", "ts", COPY)}</div>`;

let browser: Browser;
let page: Page;

describe.skipIf(!ready)("a fenced block naming its language", () => {
  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 360, height: 780 } });
    await page.setContent(FIXTURE);
    await page.addScriptTag({ type: "module", content: `${script}\nwindow.colouredRuns = colouredRuns;\nwindow.colourCode = colourCode;` });
    await page.waitForFunction(() => "colourCode" in window);
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await browser?.close();
  }, BROWSER_HOOK_MS);

  test("stands its colour runs over the text as written, the default colour left plain", async () => {
    const read = await page.evaluate(
      ([text, drawn]) => {
        const nodes = (window as unknown as { colouredRuns: (text: string, drawn: string) => Node[] | null }).colouredRuns(text!, drawn!);
        const code = document.createElement("code");

        code.replaceChildren(...(nodes ?? []));

        return {
          text: code.textContent,
          runs: [...code.childNodes].filter((node) => node.textContent !== "").map((node) => [node instanceof HTMLElement ? node.className : "", node.textContent])
        };
      },
      [TEXT, DRAWN]
    );

    expect(read.text).toBe(TEXT);
    expect(read.runs).toEqual([
      ["mtk6", "curl"],
      ["", " "],
      ["mtk7", "-s"],
      ["", " "],
      ["mtk8", '"a&b"'],
      ["", " <x>"],
      ["", "\n"],
      ["", "\n"],
      ["", "\t"],
      ["mtk6", "echo"],
      ["", " "],
      ["mtk9 mtki", "1"],
      ["", "\n"]
    ]);
  });

  test("refuses a drawing whose lines or runs do not add up to the text", async () => {
    const refused = await page.evaluate(
      ([drawn]) =>
        ["curl -s", 'curl -s "a&b"\n\n\techo 1\n'].map((text) => (window as unknown as { colouredRuns: (text: string, drawn: string) => Node[] | null }).colouredRuns(text, drawn!)),
      [DRAWN]
    );

    expect(refused).toEqual([null, null]);
  });

  test("names the language at its head, on the copy button's line, and starts its lines under it", async () => {
    const where = await page.evaluate(() => {
      const name = document.querySelector(".markdown-code-language")!.getBoundingClientRect();
      const button = document.querySelector("button[data-copy]")!.getBoundingClientRect();
      const code = document.querySelector("pre code")!.getBoundingClientRect();

      return {
        centres: Math.abs(name.top + name.height / 2 - (button.top + button.height / 2)),
        left: Math.abs(name.left - code.left),
        under: code.top - button.bottom
      };
    });

    expect(where.centres).toBeLessThanOrEqual(1);
    expect(where.left).toBeLessThanOrEqual(1);
    expect(where.under).toBeGreaterThanOrEqual(0);
  });

  test("keeps every block's lines as written, scrolling sideways where one is wider than the column", async () => {
    const lines = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("#far .markdown-code")].map((block) => {
        const pre = block.querySelector("pre")!;

        return [block.dataset.language, getComputedStyle(pre).whiteSpace, pre.scrollWidth > pre.clientWidth];
      })
    );

    expect(lines).toEqual([
      ["rust", "pre", true],
      ["text", "pre", true],
      ["none", "pre", false]
    ]);
  });

  test("colours a block once it comes near the screen, and again at once when the theme switches", async () => {
    type Colouring = Window & { colourCode: (root: HTMLElement, dark: boolean) => void };
    const read = (): string =>
      [...document.querySelectorAll<HTMLElement>(".markdown-code[data-language] code")].map((code) => `${code.closest<HTMLElement>(".markdown-code")!.dataset.language}:${code.dataset.coloured ?? "-"}`).join(" ");
    const settled = async (expected: string): Promise<string> => {
      await page.waitForFunction(`(${read.toString()})() === ${JSON.stringify(expected)}`, null, { timeout: 5000 }).catch(() => undefined);

      return await page.evaluate(`(${read.toString()})()`);
    };

    await page.evaluate(() => (window as unknown as Colouring).colourCode(document.body, false));
    expect(await settled("shell:light rust:light text:light none:- ts:-")).toBe("shell:light rust:light text:light none:- ts:-");
    expect(await page.evaluate(() => document.querySelector("#far .markdown-code code")!.textContent)).toBe(`${LONG}\n`);

    await page.evaluate(() => document.querySelector("#farthest")!.scrollIntoView());
    expect(await settled("shell:light rust:light text:light none:- ts:light")).toBe("shell:light rust:light text:light none:- ts:light");

    await page.evaluate(() => (window as unknown as Colouring).colourCode(document.body, true));
    expect(await settled("shell:dark rust:dark text:dark none:- ts:dark")).toBe("shell:dark rust:dark text:dark none:- ts:dark");
  });
});
