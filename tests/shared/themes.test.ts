import { describe, expect, test } from "bun:test";

import { DEFAULT_THEME, THEMES, isThemeId, themeDeclarations, themeOf, themeTokens } from "#shared/themes";
import { WORDING_KEYS } from "#shared/wording-keys";

// The theme list's own promise (`docs/design.md`, "Themes"): each entry is told apart by its id and
// named by a key the layer declares, and states the whole of the two scales and nothing of the
// palette's grounds, which the page, the preview and every contrast check read from it.

const declared: readonly string[] = WORDING_KEYS;

describe("the themes", () => {
  test("each have an id of their own and a name among the layer's keys", () => {
    expect(new Set(THEMES.map((theme) => theme.id)).size).toBe(THEMES.length);

    for (const theme of THEMES) {
      expect(declared).toContain(theme.label);
    }
  });

  test("each state both scales whole, and no palette's ground", () => {
    for (const theme of THEMES) {
      const tokens = themeTokens(theme);

      expect(Object.keys(tokens)).toHaveLength(2 * 11);
      expect(Object.keys(tokens).every((name) => name.startsWith("--ui-color-primary-") || name.startsWith("--ui-color-neutral-"))).toBe(true);
      expect(Object.values(tokens).every((value) => value !== undefined && value !== "")).toBe(true);
      expect(themeDeclarations(theme)).toContain(`--ui-color-neutral-900: ${tokens["--ui-color-neutral-900"]};`);
    }
  });

  test("read an id the list does not have as the default", () => {
    expect(isThemeId(DEFAULT_THEME.id)).toBe(true);
    expect(isThemeId("nope")).toBe(false);
    expect(themeOf("nope")).toBe(DEFAULT_THEME);
    expect(themeOf(null)).toBe(DEFAULT_THEME);
  });
});
