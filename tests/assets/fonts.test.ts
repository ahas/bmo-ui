import { describe, expect, test } from "bun:test";
import postcss from "postcss";
import valueParser from "postcss-value-parser";

import type { AtRule, Container } from "postcss";

// The faces the layer's stylesheet declares and the stacks it names (`docs/design.md`, "Fonts"), read
// as the stylesheet ships.

const stylesheet = new URL("../../app/assets/css/main.css", import.meta.url);
const css = await Bun.file(stylesheet).text();
const sheet = postcss.parse(css);

// The stylesheet's own faces and those of the sheet it imports for Pretendard.
const pretendard = postcss.parse(await Bun.file(new URL("../../app/assets/css/pretendard.css", import.meta.url)).text());
const faces: AtRule[] = [];
for (const declaring of [sheet, pretendard]) {
  declaring.walkAtRules("font-face", (face) => {
    faces.push(face);
  });
}

// The value of one declaration inside a rule, as written.
function field(rule: Container, name: string): string {
  let value = "";
  rule.walkDecls(name, (declaration) => {
    value = declaration.value;
  });
  return value;
}

// The first rule written that names a selector among its own.
function ruleOf(selector: string): Container {
  let found: Container | undefined;
  sheet.walkRules((rule) => {
    if (found === undefined && rule.selectors.includes(selector)) found = rule;
  });
  return found!;
}

// The stacks the theme states on the root, which every page reads unless its language names its own.
let rootTheme: Container | undefined;
sheet.walkAtRules("theme", (theme) => {
  if (rootTheme === undefined && field(theme, "--font-sans") !== "") rootTheme = theme;
});

// The families a stack names, in order, as written: the root's, or the one a rule states.
function stack(name: string, rule: Container = rootTheme!): string[] {
  return postcss.list.comma(field(rule, name));
}

// A face's family as the stacks write it, in double quotes whichever quotes its declaration used.
function familyOf(face: AtRule): string {
  return `"${field(face, "font-family").replace(/^['"]|['"]$/g, "")}"`;
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
  test("is Pretendard, with Apple SD Gothic Neo behind it, ahead of the faces a system already has", () => {
    expect(stack("--font-sans").slice(0, 3)).toEqual(['"Pretendard Variable"', '"Pretendard"', '"Apple SD Gothic Neo"']);
    expect(stack("--font-sans")).toContain("sans-serif");
  });

  // The face is under no open licence, so the layer leaves it to a host that carries it.
  test("carries no Apple SD Gothic Neo face of its own", () => {
    expect(facesOf('"Apple SD Gothic Neo"')).toEqual([]);
  });

  // Whole, as one variable face over every weight, split into files by range of letters, each file the layer
  // carries and each face naming the letters its file holds.
  test("carries Pretendard whole, a variable face over every weight in files by range of letters", async () => {
    const pretendardFaces = facesOf('"Pretendard Variable"');

    expect(pretendardFaces.length).toBeGreaterThan(50);
    expect(new Set(pretendardFaces.map((face) => field(face, "font-weight")))).toEqual(new Set(["45 920"]));
    expect(pretendardFaces.every((face) => field(face, "unicode-range") !== "")).toBe(true);

    for (const file of pretendardFaces.flatMap(filesOf)) {
      expect(await Bun.file(new URL(file, new URL("../../app/assets/css/", import.meta.url))).exists(), file).toBe(true);
    }
  });

  // Its static cut stands right behind it at the four weights the interface asks for, for the letters the variable
  // face's subsets leave out.
  test("carries Pretendard's static cut at the four weights the interface asks for and no others", () => {
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
    expect(stack("--font-mono").slice(1, 4)).toEqual(['"Pretendard Variable"', '"Pretendard"', '"Apple SD Gothic Neo"']);
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

// A Korean face holds kana and Han as well, drawn in Korean shapes, so a page in Japanese or Chinese
// names its own language's faces where the root names the Korean ones, and leaves those out.
describe.each([
  ["Japanese", ":root:lang(ja)", '"Hiragino Sans"'],
  ["Chinese", ":root:lang(zh)", '"PingFang SC"']
])("a page in %s", (_, selector, own) => {
  const korean = ['"Apple SD Gothic Neo"', '"Noto Sans KR"', '"Malgun Gothic"'];

  test("reads its interface in its own language's face, with no Korean face in the stack", () => {
    const sans = stack("--font-sans", ruleOf(selector));

    expect(sans[0]).toBe(own);
    expect(sans.at(-1)).toBe("sans-serif");
    expect(sans.filter((family) => korean.includes(family))).toEqual([]);
  });

  test("reads its fixed-width places in CaskaydiaCove, with its own language's face right behind", () => {
    const mono = stack("--font-mono", ruleOf(selector));

    expect(mono.slice(0, 2)).toEqual(['"CaskaydiaCove NFM"', own]);
    expect(mono.at(-1)).toBe("monospace");
    expect(mono.filter((family) => korean.includes(family))).toEqual([]);
  });

  // Words kept whole in a language with no spaces between them could break nowhere.
  test("breaks the words a class keeps whole as its own language's rules allow", () => {
    const language = selector.slice(":root".length);

    expect(field(ruleOf(`.break-keep${language}`), "word-break")).toBe("normal");
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

  // A page fetches only the files whose letters it draws, so each file stays small enough to hand over on a first
  // visit, and all of them together stay within what the layer is carried with.
  test("stay small enough to hand over on a first visit, each by itself", () => {
    const sizes = files.map((file) => Bun.file(new URL(file, stylesheet)).size);

    expect(Math.max(...sizes)).toBeLessThan(200_000);
    expect(sizes.reduce((sum, size) => sum + size, 0)).toBeLessThan(4_000_000);
  });

  test("each have their typeface's licence beside them", async () => {
    for (const family of ["Pretendard", "CaskaydiaCove"]) {
      expect([family, await Bun.file(new URL(`../fonts/LICENSE-${family}.txt`, stylesheet)).exists()]).toEqual([family, true]);
    }
  });
});
