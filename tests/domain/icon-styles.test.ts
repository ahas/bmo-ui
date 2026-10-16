import { describe, expect, test } from "bun:test";

import { isIconStyle } from "~/domain/icon-styles";

const options = { cssSelectorPrefix: "i-", cssLayer: "base" };
const style = (textContent: string) => ({ nodeName: "STYLE", textContent });

// The icon library's style for one icon is put in behind the page's other stylesheets, and nothing
// else is (`docs/design.md`, "Fonts").
describe("an icon's own style", () => {
  test("is told by the rule it opens with, in the library's layer", () => {
    expect(isIconStyle(style("@layer base { :where(.i-material-symbols\\:arrow-downward){display:inline-block} }"), options)).toBe(true);
    expect(isIconStyle(style(".i-material-symbols\\:check{display:inline-block}"), { cssSelectorPrefix: "i-", cssLayer: false })).toBe(true);
  });

  test("and nothing else is taken for one", () => {
    expect(isIconStyle(style("@layer base { .card{color:red} }"), options)).toBe(false);
    expect(isIconStyle(style(".i-x{display:block}"), options)).toBe(false);
    expect(isIconStyle({ nodeName: "LINK", textContent: "" }, options)).toBe(false);
  });
});
