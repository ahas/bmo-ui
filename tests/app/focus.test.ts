import { describe, expect, test } from "bun:test";
import selectorParser from "postcss-selector-parser";

import { slotClasses, sources, stylesheet } from "./sources";

import type { Declaration, Rule } from "postcss";

// How focus is shown is one token and one style in one place (`docs/design.md`, "Focus"), read here
// from the files that ship. A colour or a width written beside one component is the one that drifts:
// the next component copies it, and the layer ends up ringing its controls as many ways as it has
// components. What a component may still say is whether the ring is drawn, inside or outside its edge.

// The rules of the stylesheet whose selector is exactly the one asked for, comma for comma.
function rulesAt(selector: string): Rule[] {
  const found: Rule[] = [];

  stylesheet.walkRules((rule) => {
    if (rule.selectors.join(", ") === selector) found.push(rule);
  });

  return found;
}

function declared(rules: Rule[], property: string): Declaration | undefined {
  return rules.flatMap((rule) => rule.nodes).find((node): node is Declaration => node.type === "decl" && node.prop === property);
}

describe("one focus ring", () => {
  // The colour is stated by each theme on its own class as well as on the root, so a box drawn in a
  // mode the page is not in rings in its own accent (`docs/design.md`, "Themes").
  test("is declared once, on the root, with the dark mode's own accent", () => {
    for (const token of ["--bmo-focus-width", "--bmo-focus-gap"]) {
      expect(declared(rulesAt(":root"), token), token).toBeDefined();
    }

    expect(declared(rulesAt(":root, .light"), "--bmo-focus")).toBeDefined();
    expect(declared(rulesAt(".dark"), "--bmo-focus")).toBeDefined();
  });

  test("is drawn on every element the keyboard reaches", () => {
    const ring = rulesAt(":focus-visible, a:focus-visible").filter(
      (rule) => rule.parent?.type === "atrule" && (rule.parent as { name: string; params: string }).name === "layer"
    );

    expect(ring).toHaveLength(1);
    expect(ring[0]!.parent).toMatchObject({ params: "base" });
    expect(declared(ring, "outline")?.value).toBe("var(--bmo-focus-width) solid var(--bmo-focus)");
    expect(declared(ring, "outline-offset")?.value).toBe("var(--bmo-focus-gap)");
  });

  // A focus that a press reaches as well as the keyboard is `:focus` standing on an element of its
  // own. Inside another pseudo-class it is a question asked of what an element holds — a bar whose
  // text box has the caret — and that is the bar's to answer.
  test("and on nothing a press reaches", () => {
    const pressed: string[] = [];

    stylesheet.walkRules((rule) => {
      selectorParser((selectors) => {
        selectors.walkPseudos((pseudo) => {
          if (pseudo.value === ":focus" && pseudo.parent?.parent?.type === "root") pressed.push(rule.selector);
        });
      }).processSync(rule.selector);
    });

    expect(pressed).toEqual([]);
  });

  test("and the message box's bar wears its focus on itself", () => {
    expect(slotClasses("chatPrompt", "root")).toContain("focus-bar");
  });

  // A class under a focus variant that colours, thickens or moves a ring: `focus-visible:outline-2`,
  // `focus-visible:outline-primary`, `focus:ring-2`, `focus-visible:-outline-offset-2`. Saying it is
  // drawn, hidden or drawn at the shared gap stays the component's own. So does `focus:` with nothing
  // after it but a ring or a tone, which would show for a press as well; it is read for too.
  test("no component writes a focus colour, width or place of its own", async () => {
    const own =
      /(?<![\w-])focus(?:-visible|-within)?:(?:[\w-]+:)*-?(?:outline|ring)-(?!none\b|solid\b|offset-\(--bmo-focus-gap\))|(?<![\w-])focus:(?:[\w-]+:)*(?:outline|ring|bg)-/;
    const found = (await sources("**/*.vue", "**/*.ts")).flatMap(({ path, text }) =>
      text
        .split("\n")
        .filter((line) => own.test(line))
        .map((line) => `${path}: ${line.trim()}`)
    );

    expect(found).toEqual([]);
  });
});
