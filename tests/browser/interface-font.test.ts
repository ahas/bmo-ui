import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// The faces the layer carries, as the browser draws them (`docs/design.md`, "Fonts"). Each file is
// handed to a page as it ships, and what the browser lays out with it is read back. Pretendard is the
// interface's face whole, one variable face over every weight in files by range of letters, so Hangul,
// Latin and the marks between them are all drawn by it whatever stands behind it. Every text is drawn at
// geometric precision, as the layer draws its tabular figures: the browser hints as it comes, which on
// Linux rounds each glyph's advance on its own.

const WEIGHTS = { Regular: 400, Medium: 500, SemiBold: 600, Bold: 700 } as const;

// Letters the interface draws: Hangul, written as escapes, an accented Latin letter, the middle dot, the minus
// sign and Latin letters and digits.
const CARRIED = "\uAC00\uB098\uB2E4\u00E9\u00B7\u2212Aa0";

async function face(family: string, file: string, weight: number): Promise<string> {
  const bytes = await Bun.file(new URL(`../../app/assets/fonts/${file}`, import.meta.url)).bytes();

  return `@font-face { font-family: "${family}"; font-weight: ${weight}; src: url(data:font/woff2;base64,${Buffer.from(bytes).toString("base64")}) format("woff2"); }`;
}

// The layer's Pretendard sheet as it ships, every file it names put in its place as data and its family
// named "Interface".
async function pretendardFaces(): Promise<string> {
  const sheet = await Bun.file(new URL("../../app/assets/css/pretendard.css", import.meta.url)).text();
  const files = [...new Set([...sheet.matchAll(/url\(([^)]+)\)/g)].map((found) => found[1]!))];
  let faces = sheet.replaceAll("'Pretendard Variable'", '"Interface"');

  for (const file of files) {
    const bytes = await Bun.file(new URL(file, new URL("../../app/assets/css/", import.meta.url))).bytes();

    faces = faces.replaceAll(`url(${file})`, `url(data:font/woff2;base64,${Buffer.from(bytes).toString("base64")})`);
  }

  return faces;
}

const ready = touchReady();
let browser: Browser | null = null;
let page: Page;
// What each load ended with, by the font it asked for: the status of every face it matched.
let loaded: Record<string, string[]> = {};

beforeAll(async () => {
  if (!ready) {
    return;
  }

  const faces = await Promise.all([
    pretendardFaces(),
    ...Object.entries(WEIGHTS).map(([name, weight]) => face("Gap", `Pretendard-${name}.gap.woff2`, weight)),
    face("Fixed", "CaskaydiaCoveNFM-Regular.subset.woff2", 400)
  ]);

  browser = await chromium.launch();
  page = await browser.newPage();
  await page.setContent(`<style>${faces.join("\n")}</style>`);
  loaded = await page.evaluate(
    async ({ weights, carried }) =>
      Object.fromEntries(
        await Promise.all(
          [...weights.flatMap((weight) => [`${weight} 16px Interface`, `${weight} 16px Gap`]), "400 16px Fixed"].map(async (font) => [
            font,
            [...new Set((await document.fonts.load(font, carried)).map((one) => one.status))]
          ])
        )
      ),
    { weights: Object.values(WEIGHTS), carried: CARRIED }
  );
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();
}, BROWSER_HOOK_MS);

// How wide each text stands in a font, and how tall a line of normal height is.
function measured(font: string, texts: string[]): Promise<{ widths: number[]; line: number }> {
  return page.evaluate(
    ({ font, texts }) => {
      const box = (text: string, style: string) => {
        const span = document.createElement("span");
        span.textContent = text;
        span.style.cssText = `font: ${font}; text-rendering: geometricPrecision; display: inline-block; white-space: nowrap; ${style}`;
        document.body.append(span);
        const { width, height } = span.getBoundingClientRect();
        span.remove();
        return { width, height };
      };

      return { widths: texts.map((text) => box(text, "").width), line: box(texts[0] ?? "", "line-height: normal").height };
    },
    { font, texts }
  );
}

describe.skipIf(!ready)("Pretendard", () => {
  for (const [name, weight] of Object.entries(WEIGHTS)) {
    test(`${name} loads from the files the letters ask for`, () => {
      expect(loaded[`${weight} 16px Interface`]).toEqual(["loaded"]);
    });

    test(`${name} draws Hangul, Latin and the marks between them, its static cut right behind it, whatever stands behind both`, async () => {
      const [overFixed, overSerif] = await Promise.all([
        measured(`${weight} 100px Interface, Gap, Fixed`, [CARRIED]),
        measured(`${weight} 100px Interface, Gap, serif`, [CARRIED])
      ]);

      expect(overFixed.widths[0]).toBeGreaterThan(0);
      expect(overFixed.widths[0]).toBeCloseTo(overSerif.widths[0] ?? 0, 2);
    });

    // A bold word in a line asks for no more height than the words around it.
    test(`${name} stands its line on the same metrics as Regular`, async () => {
      const [own, regular] = await Promise.all([measured(`${weight} 100px Interface`, [CARRIED]), measured("400 100px Interface", [CARRIED])]);

      expect(own.line).toBeGreaterThan(0);
      expect(own.line).toBeCloseTo(regular.line, 2);
    });
  }

  test("Bold is drawn heavier than Regular", async () => {
    const [bold, regular] = await Promise.all([measured("700 100px Interface", [CARRIED.repeat(4)]), measured("400 100px Interface", [CARRIED.repeat(4)])]);

    expect(bold.widths[0]).toBeGreaterThan((regular.widths[0] ?? 0) + 1);
  });
});

const FIXED_TEXTS = [..."0123456789AWmi.é"].map((one) => one.repeat(4));

describe.skipIf(!ready)("CaskaydiaCove", () => {
  test("loads from its file", () => {
    expect(loaded["400 16px Fixed"]).toEqual(["loaded"]);
  });

  for (const size of [100, 14]) {
    test(`keeps every digit and letter at one width at ${size}px`, async () => {
      const { widths } = await measured(`400 ${size}px Fixed, serif`, FIXED_TEXTS);

      expect(widths[0]).toBeGreaterThan(0);
      for (const width of widths) {
        expect(width).toBeCloseTo(widths[0] ?? 0, 2);
      }
    });
  }
});
