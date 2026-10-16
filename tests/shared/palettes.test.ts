import { describe, expect, test } from "bun:test";

import { DEFAULT_PALETTE, PALETTES, isPaletteId, paletteDeclarations, paletteOf, paletteTokens } from "#shared/palettes";
import { THEMES } from "#shared/themes";
import { WORDING_KEYS } from "#shared/wording-keys";

// The palette list's own promise (`docs/design.md`, "Palettes"): each entry is told apart by its id
// and named by a key the layer declares, and states the two grounds of either mode and nothing else,
// which the page, the swatch and every contrast check read from it.

const declared: readonly string[] = WORDING_KEYS;

describe("the palettes", () => {
  test("each have an id of their own and a name among the layer's keys", () => {
    expect(new Set(PALETTES.map((palette) => palette.id)).size).toBe(PALETTES.length);

    for (const palette of PALETTES) {
      expect(declared).toContain(palette.label);
    }
  });

  test("each state both grounds in either mode, and no colour of the theme's", () => {
    for (const palette of PALETTES) {
      const tokens = paletteTokens(palette);

      expect(tokens).toEqual({
        "--bmo-palette-own-light": palette.mine.light,
        "--bmo-palette-own-dark": palette.mine.dark,
        "--bmo-palette-other-light": palette.theirs.light,
        "--bmo-palette-other-dark": palette.theirs.dark
      });
      expect(paletteDeclarations(palette)).toContain(`--bmo-palette-other-dark: ${palette.theirs.dark};`);
    }
  });

  test("give every theme a palette of its id, so a palette can be taken as the theme's", () => {
    for (const theme of THEMES) {
      expect(isPaletteId(theme.id)).toBe(true);
    }
  });

  test("read an id the list does not have as the default", () => {
    expect(isPaletteId(DEFAULT_PALETTE.id)).toBe(true);
    expect(isPaletteId("nope")).toBe(false);
    expect(paletteOf("nope")).toBe(DEFAULT_PALETTE);
    expect(paletteOf(null)).toBe(DEFAULT_PALETTE);
  });
});
