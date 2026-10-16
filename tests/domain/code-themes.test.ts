import { describe, expect, test } from "bun:test";
import postcss from "postcss";
import colors from "tailwindcss/colors";

import { CODE_THEMES } from "~/domain/code-themes";
import { THEMES } from "#shared/themes";

// The code themes' promise (`docs/components.md`, "Code and files"): every colour a token takes —
// the editor's own rule where the layer's theme leaves it, the layer's where it sets one — reads at
// 4.5:1 or better on a fenced block's ground in that mode, under every theme. The ground is the
// muted surface the stylesheet gives a fenced block, which is the theme's grey at its 50 in the
// light mode and its 800 in the dark, as hex.

const { vs, vs_dark: vsDark } = (await import(new URL("../../node_modules/monaco-editor/esm/vs/editor/standalone/common/themes.js", import.meta.url).href)) as Record<
  "vs" | "vs_dark",
  { rules: { token: string; foreground?: string }[] }
>;

const SHADES = { light: 50, dark: 800 } as const;
const BASES = { light: vs, dark: vsDark };

function ground(mode: "light" | "dark", neutral: string): string {
  return Bun.color((colors as unknown as Record<string, Record<number, string>>)[neutral]![SHADES[mode]]!, "hex")!;
}

// The background the stylesheet gives a fenced block.
const css = await Bun.file(new URL("../../app/assets/css/main.css", import.meta.url)).text();
let blockGround: string | null = null;

postcss.parse(css).walkRules(".markdown pre", (rule) => {
  rule.walkDecls("background-color", (declaration) => {
    blockGround = declaration.value;
  });
});

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));

  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function ratio(one: string, other: string): number {
  const [light, dark] = [luminance(one), luminance(other)].sort((a, b) => b - a);

  return (light! + 0.05) / (dark! + 0.05);
}

describe("the code themes", () => {
  test("stand a fenced block on the muted surface", () => {
    expect(blockGround).toBe("var(--ui-bg-muted)");
  });

  for (const mode of ["light", "dark"] as const) {
    test(`read at 4.5:1 on a fenced block's ground in the ${mode} mode, token by token, under every theme`, () => {
      const colours = new Map<string, string>();

      for (const rule of [...BASES[mode].rules, ...CODE_THEMES[mode].theme.rules]) {
        if (rule.token !== "" && rule.foreground !== undefined) {
          colours.set(rule.token, `#${rule.foreground.toLowerCase()}`);
        }
      }

      const grounds = THEMES.map((theme) => [theme.id, ground(mode, theme.neutral)] as const);
      const short = grounds.flatMap(([where, under]) =>
        [...colours].filter(([, colour]) => ratio(colour, under) < 4.5).map(([token, colour]) => `${where} ${token} ${colour}`)
      );

      expect(colours.size).toBeGreaterThan(40);
      expect(ground(mode, "zinc")).toBe(mode === "light" ? "#fafafa" : "#27272a");
      expect(short).toEqual([]);
    });
  }
});
