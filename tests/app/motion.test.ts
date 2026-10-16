import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";

import { appConfig, slotClasses, sources, stylesheet } from "./sources";

import type { AtRule, Declaration, Rule } from "postcss";

// How long the layer's movements take and how they ease is one set of numbers in one place
// (`docs/design.md`, "Motion"), read here from the files that ship. A length written beside one
// component is the one that drifts: the next component copies it, and a kind of movement ends up as
// many lengths as there are components.

const TOKENS = ["--bmo-motion-quick", "--bmo-motion-pop", "--bmo-motion-unfold", "--bmo-ease-enter", "--bmo-ease-exit", "--bmo-ease-move"];

// What may keep a length of its own, and why. Nothing in the layer does: every movement it draws is
// on the tokens.
const OWN_LENGTHS = new Set<string>([]);

function declarations(within: Rule | AtRule): Declaration[] {
  return (within.nodes ?? []).filter((node): node is Declaration => node.type === "decl");
}

function rootRules(): Rule[] {
  return stylesheet.nodes.filter((node): node is Rule => node.type === "rule" && node.selector === ":root");
}

// The keyframes of one name, standing where they were asked for: at the top of the stylesheet, or
// inside a block of the reduced-motion query.
function keyframes(within: { nodes?: unknown[] }, name: string): AtRule | undefined {
  return (within.nodes as AtRule[] | undefined)?.find((node) => node.type === "atrule" && node.name === "keyframes" && node.params === name);
}

// The one reduced-motion block that stops every transition, which is the reader's whole answer.
function reducedMotion(): AtRule {
  const found = stylesheet.nodes.filter(
    (node): node is AtRule =>
      node.type === "atrule" &&
      node.name === "media" &&
      node.params === "(prefers-reduced-motion: reduce)" &&
      (node.nodes ?? []).some((rule) => rule.type === "rule" && declarations(rule).some((one) => one.prop === "transition-duration"))
  );

  expect(found).toHaveLength(1);

  return found[0]!;
}

describe("one set of lengths and easings", () => {
  test("is declared once, on the root", () => {
    for (const token of TOKENS) {
      expect(rootRules().flatMap(declarations).filter((one) => one.prop === token), token).toHaveLength(1);
    }
  });

  test("and every transition a class asks for without a length of its own takes the quick one", () => {
    const theme = stylesheet.nodes.find((node): node is AtRule => node.type === "atrule" && node.name === "theme");
    const said = Object.fromEntries(declarations(theme!).map((one) => [one.prop, one.value]));

    expect(said["--default-transition-duration"]).toBe("var(--bmo-motion-quick)");
    expect(said["--default-transition-timing-function"]).toBe("var(--bmo-ease-move)");
  });

  // A transition or a growing written with a number of its own: `200ms`, `0.1s` or `duration-150`
  // beside a movement. Loops — a spinner's turn, a sliding line — are not comings and goings and are
  // not read for.
  test("no component writes a length of its own", async () => {
    const own = /transition[^;"'`]*\d+m?s|duration-\d|animate-\[[a-z-]+_\d+m?s/;
    const found = (await sources("**/*.vue", "**/*.ts", "**/*.css"))
      .filter(({ path }) => !OWN_LENGTHS.has(path))
      .flatMap(({ path, text }) =>
        text
          .split("\n")
          .filter((line) => own.test(line) && !line.includes("transition-duration: 0s"))
          .map((line) => `${path}: ${line.trim()}`)
      );

    expect(found).toEqual([]);
  });
});

describe("a reader who asked for less movement", () => {
  test("sees no transition move anything, and a region or a dialog at most fade", () => {
    const reduced = reducedMotion();
    const stopped = (reduced.nodes ?? []).filter((node): node is Rule => node.type === "rule").flatMap(declarations);

    expect(stopped).toContainEqual(expect.objectContaining({ prop: "transition-duration", value: "0s", important: true }));

    for (const name of ["collapsible-down", "collapsible-up", "bmo-dialog-in", "bmo-dialog-out"]) {
      const frames = keyframes(reduced, name);

      expect(frames, name).toBeDefined();

      // Every stop of it changes the opacity and nothing else.
      const said = (frames!.nodes ?? []).flatMap((stop) => declarations(stop as Rule).map((one) => one.prop));

      expect(said.length, name).toBeGreaterThan(0);
      expect(new Set(said), name).toEqual(new Set(["opacity"]));
    }
  });
});

// The library's own movements merged with what the layer says over them, the way the library merges
// them, for every component the layer floats or folds. A component whose movement sits on a variant
// rather than on its slot keeps the library's own length however the slot is written, so what is read
// is the class each ends up with. The library's themes are generated when the layer is prepared;
// without them there is nothing to merge.
const here = new URL(".", import.meta.url).pathname;
const themes = new URL("../../.nuxt/ui/", import.meta.url).pathname;

describe.skipIf(!existsSync(themes))("every floating or folding component the library draws", () => {
  test("comes and goes at the layer's lengths", async () => {
    const variants = Bun.resolveSync("tailwind-variants", Bun.resolveSync("@nuxt/ui", here));
    const { createTV } = (await import(variants)) as { createTV: (config: object) => (options: object) => (props: object) => unknown };
    const tv = createTV({});
    const cases: [string, string, Record<string, unknown>, string[]][] = [
      ["modal", "modal", { transition: true, fullscreen: false, scrollable: false }, ["overlay", "content"]],
      ["slideover", "slideover", { transition: true, side: "left" }, ["overlay", "content"]],
      ["slideover", "slideover", { transition: true, side: "right" }, ["content"]],
      ["slideover", "slideover", { transition: true, side: "top" }, ["content"]],
      ["slideover", "slideover", { transition: true, side: "bottom" }, ["content"]],
      ["popover", "popover", {}, ["content"]],
      ["tooltip", "tooltip", {}, ["content"]],
      ["dropdownMenu", "dropdown-menu", {}, ["content"]],
      ["contextMenu", "context-menu", {}, ["content"]],
      ["select", "select", { position: "popper" }, ["content"]],
      ["selectMenu", "select-menu", { position: "popper" }, ["content"]],
      ["inputMenu", "input-menu", {}, ["content"]],
      ["collapsible", "collapsible", {}, ["content"]],
      ["navigationMenu", "navigation-menu", { orientation: "vertical", collapsed: false }, ["content"]],
      ["tabs", "tabs", {}, ["indicator"]]
    ];

    for (const [name, file, props, slots] of cases) {
      const theme = ((await import(`${themes}${file}.ts`)) as { default: object }).default;
      const ui = tv({ extend: tv(theme), ...(appConfig.ui[name] ?? {}) })(props) as Record<string, () => string>;

      for (const slot of slots) {
        const motion = ui[slot]!()
          .split(" ")
          .filter((one) => /animate-|duration-|^ease-/.test(one));

        expect(motion.length, `${name}.${slot}`).toBeGreaterThan(0);

        for (const one of motion) {
          expect(one, `${name}.${slot}`).toContain("--bmo-");
        }
      }
    }
  });
});

describe("a dialog", () => {
  test("comes and goes by the layer's own growing, at the layer's length", () => {
    expect(slotClasses("modal", "content")).toContain("data-[state=open]:animate-[bmo-dialog-in_var(--bmo-motion-pop)_var(--bmo-ease-enter)]");

    const grows = keyframes(stylesheet, "bmo-dialog-in");
    const said = (grows!.nodes ?? []).flatMap((stop) => declarations(stop as Rule));

    expect(said).toContainEqual(expect.objectContaining({ prop: "transform", value: "scale(var(--bmo-dialog-from, 1))" }));
  });
});
