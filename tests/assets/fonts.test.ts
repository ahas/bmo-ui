import { describe, expect, test } from "bun:test";
import postcss from "postcss";
import valueParser from "postcss-value-parser";

import type { AtRule, Container } from "postcss";

// The faces the layer's stylesheet declares and the stacks it names (`docs/design.md`, "Fonts"), read
// as the stylesheet ships.

const stylesheet = new URL("../../app/assets/css/main.css", import.meta.url);
const css = await Bun.file(stylesheet).text();
const sheet = postcss.parse(css);

const faces: AtRule[] = [];
sheet.walkAtRules("font-face", (face) => {
  faces.push(face);
});

// The value of one declaration inside a rule, as written.
function field(rule: Container, name: string): string {
  let value = "";
  rule.walkDecls(name, (declaration) => {
    value = declaration.value;
  });
  return value;
}

// The families a stack names, in order, as written.
function stack(name: string): string[] {
  return postcss.list.comma(field(sheet, name));
}

function familyOf(face: AtRule): string {
  return field(face, "font-family");
}

function facesOf(family: string): AtRule[] {
  return faces.filter((face) => familyOf(face) === family);
}

// The files a face's source names.
function filesOf(face: AtRule): string[] {
  const files: string[] = [];
  valueParser(field(face, "src")).walk((node) => {
    if (node.type === "function" && node.value === "url") {
      files.push(...node.nodes.map((inner) => inner.value));
    }
  });
  return files;
}

describe("the interface typeface", () => {
  test("is Apple SD Gothic Neo, with Pretendard behind it, ahead of the faces a system already has", () => {
    expect(stack("--font-sans").slice(0, 2)).toEqual(['"Apple SD Gothic Neo"', '"Pretendard"']);
    expect(stack("--font-sans")).toContain("sans-serif");
  });

  // The face is under no open licence, so the layer leaves it to a host that carries it.
  test("carries no Apple SD Gothic Neo face of its own", () => {
    expect(facesOf('"Apple SD Gothic Neo"')).toEqual([]);
  });

  test("carries Pretendard at the four weights the interface asks for and no others", () => {
    expect(facesOf('"Pretendard"').map((face) => field(face, "font-weight"))).toEqual(["400", "500", "600", "700"]);
  });

  // Tabular figures share one width in the file; only drawn at geometric precision do they keep it on
  // a browser that rounds each hinted glyph on its own, which the browser check measures.
  test("draws its tabular figures at geometric precision", () => {
    const rules: string[] = [];
    sheet.walkRules(".tabular-nums", (rule) => {
      rules.push(field(rule, "text-rendering"));
    });

    expect(rules).toEqual(["geometricPrecision"]);
  });

  test("shows the words before a face lands", () => {
    expect(faces.length).toBeGreaterThan(0);
    expect(faces.map((face) => field(face, "font-display"))).toEqual(faces.map(() => "swap"));
  });
});

// No monospace face has Hangul, so the interface's own faces stand right behind the fixed-width one,
// and a Hangul word in a fixed-width place reads in the interface's face rather than whatever a
// machine happens to have.
describe("the fixed-width typeface", () => {
  test("is CaskaydiaCove, which the layer carries", () => {
    expect(stack("--font-mono")[0]).toBe('"CaskaydiaCove NFM"');
    expect(facesOf('"CaskaydiaCove NFM"')).not.toEqual([]);
  });

  test("with the interface's own faces right behind it", () => {
    expect(stack("--font-mono").slice(1, 3)).toEqual(['"Apple SD Gothic Neo"', '"Pretendard"']);
  });

  test("and the faces a machine already has behind both, so a machine with neither still reads", () => {
    expect(stack("--font-mono")).toContain("ui-monospace");
    expect(stack("--font-mono").at(-1)).toBe("monospace");
  });

  // A browser thickens what it has where a bold one is wanted, and a second file is a second file to
  // hand over on a phone.
  test("at one weight", () => {
    expect(facesOf('"CaskaydiaCove NFM"').map((face) => field(face, "font-weight"))).toEqual(["400"]);
  });
});

describe("the font files", () => {
  const files = faces.flatMap(filesOf);

  test("are the ones the faces name, one to a face, and they are here", async () => {
    expect(files).toHaveLength(faces.length);
    for (const file of files) {
      expect([file, await Bun.file(new URL(file, stylesheet)).exists()]).toEqual([file, true]);
    }
  });

  test("come from the layer and not from somewhere else on the web", () => {
    expect(files.filter((file) => !file.startsWith("../fonts/"))).toEqual([]);
    expect(css).not.toContain("://");
  });

  test("stay small enough to hand over on a first visit", () => {
    const size = files.reduce((sum, file) => sum + Bun.file(new URL(file, stylesheet)).size, 0);

    expect(size).toBeLessThan(1_000_000);
  });

  test("each have their typeface's licence beside them", async () => {
    for (const family of ["Pretendard", "CaskaydiaCove"]) {
      expect([family, await Bun.file(new URL(`../fonts/LICENSE-${family}.txt`, stylesheet)).exists()]).toEqual([family, true]);
    }
  });
});
