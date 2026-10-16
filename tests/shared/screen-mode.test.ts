import { describe, expect, test } from "bun:test";

import { DEFAULT_SCHEME, isDocumentScheme, SCHEME_COOKIE } from "#shared/screen-mode";

// The screen mode's own promises: the three modes a reader may ask for and nothing else, dark where
// no choice was made, and the cookie the mode is kept in.

describe("the screen mode", () => {
  test("is one of system, light or dark", () => {
    expect(["light", "dark", "system"].every(isDocumentScheme)).toBe(true);
  });

  test("is nothing else a cookie or a query may carry", () => {
    expect(["", "Dark", "auto", "sepia", null, undefined, 1, {}].some(isDocumentScheme)).toBe(false);
  });

  test("is dark for a reader who never chose one", () => {
    expect(DEFAULT_SCHEME).toBe("dark");
    expect(isDocumentScheme(DEFAULT_SCHEME)).toBe(true);
  });

  test("is kept in the colour mode's own cookie", () => {
    expect(SCHEME_COOKIE).toBe("nuxt-color-mode");
  });
});
