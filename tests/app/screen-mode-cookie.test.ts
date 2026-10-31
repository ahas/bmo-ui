import { describe, expect, test } from "bun:test";
import { serialize } from "cookie-es";

import { SCHEME_COOKIE } from "../../shared/screen-mode";
import { nuxtConfig } from "./sources";

// The cookie the screen mode is kept in outlives the browser's session (`docs/design.md`, "Themes").
// The colour mode module hands the layer's cookie attributes to Nuxt's cookie composable, which writes
// the cookie with them through the serializer read here, so the cookie is written here as the
// composable writes it and its attributes are read off what comes out.

const YEAR = 60 * 60 * 24 * 365;

const attributes = nuxtConfig.colorMode.cookieAttrs ?? {};

// The cookie as the composable writes it, its attributes by their lowercased names.
function written(options: Record<string, unknown>): Map<string, string> {
  const [, ...parts] = serialize(SCHEME_COOKIE, "dark", options).split("; ");

  return new Map(
    parts.map((part) => {
      const [name = "", value = ""] = part.split("=");

      return [name.toLowerCase(), value];
    })
  );
}

describe("the screen mode's cookie", () => {
  test("is the one the mode is kept in", () => {
    expect(nuxtConfig.colorMode.storage).toBe("cookie");
    expect(nuxtConfig.colorMode.storageKey).toBe(SCHEME_COOKIE);
  });

  test("is written with an expiry a year away, so it outlives the browser's session", () => {
    expect(written(attributes).get("max-age")).toBe(String(YEAR));
  });

  test("is read on every page of the site", () => {
    expect(written(attributes).get("path")).toBe("/");
  });

  test("names no attribute the composable drops", () => {
    // An attribute under a name the serializer does not read leaves the cookie as it would be
    // without it, and a cookie with no expiry ends with the session.
    const dropped = Object.keys(attributes).filter((name) => {
      const without = Object.fromEntries(Object.entries(attributes).filter(([one]) => one !== name));

      return serialize(SCHEME_COOKIE, "dark", attributes) === serialize(SCHEME_COOKIE, "dark", without);
    });

    expect(Object.keys(attributes).length).toBeGreaterThan(0);
    expect(dropped).toEqual([]);
  });
});
