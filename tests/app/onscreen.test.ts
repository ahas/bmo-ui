import { describe, expect, test } from "bun:test";

import { SCREEN_FRAME, SCREEN_HEIGHT_PROPERTY, SCREEN_TOP_PROPERTY } from "~/domain/screen";

import { appConfig, attribute, DIRECTIVE, elements, nuxtConfig, slotClasses, source, sources, staticClasses, stylesheet, template } from "./sources";

import type { ConfigEntry } from "./sources";

// Everything the layer stands on the screen has to be on the screen (`docs/design.md`, "The
// vertical"). A shell pinned to the window clips rather than scrolls, so anything taller than the
// window is not below the fold — there is no fold — it is simply gone, and the DOM still holds it, so
// only a pair of eyes or a measured rectangle ever finds it. What goes over the edge is always the
// foot of the column, which is where the box being typed in stands.
//
// Two things make a column taller than the window. One is a floor: a piece that insists on a whole
// window of height while strips over every screen have already taken their share out of the column.
// The other is a keyboard, which a phone lays over the page rather than cutting out of it, so the
// window keeps its height while its bottom is behind the keys.
//
// The answers to both are read here off the files that ship, because a screen rendered in a test says
// nothing about either: a browser's own window is what they are about.

// The two properties the whole layer lays itself out from.
const HEIGHT = "--bmo-screen";
const TOP = "--bmo-screen-top";

function rootValue(property: string): string | undefined {
  let found: string | undefined;

  stylesheet.walkDecls(property, (declaration) => {
    if (declaration.parent?.type === "rule" && (declaration.parent as { selector: string }).selector === ":root") found = declaration.value;
  });

  return found;
}

// A class that holds a box to a window's worth of height, whichever of the window's four heights it
// names.
function heldToTheWindow(one: string): boolean {
  return /^(min-)?h-(screen|svh|lvh|dvh)$/.test(one);
}

describe("how much of the window the layer believes it has", () => {
  test("is two properties in the stylesheet, and the whole window until told otherwise", () => {
    // The dynamic viewport unit rather than a number, so the height follows a browser's address bar
    // as it comes and goes instead of standing still while it moves.
    expect(rootValue(HEIGHT)).toBe("100dvh");
    expect(rootValue(TOP)).toBe("0px");
  });

  test("is what a frame standing on the screen is laid out from, height and offset both", () => {
    // The offset as well as the height: a browser may push its own page up to keep the focused box
    // in sight, and a frame pinned to the top of the window is pushed up out of view with it.
    expect(SCREEN_HEIGHT_PROPERTY).toBe(HEIGHT);
    expect(SCREEN_TOP_PROPERTY).toBe(TOP);
    expect(SCREEN_FRAME).toEqual({ top: `var(${TOP})`, height: `var(${HEIGHT})` });
  });

  test("and the browser is asked to take the keyboard's room out of the page in the first place", () => {
    // Where a browser honours it there is nothing left to correct: the window itself shrinks and
    // every length in the layout answers. The reading off the visual viewport is for the browsers
    // that do not.
    const viewport = nuxtConfig.app.head.meta.find((one) => one.name === "viewport");

    expect(viewport?.content?.split(/,\s*/)).toContain("interactive-widget=resizes-content");
  });
});

describe("what the columns of a shell are held to", () => {
  test("the panel every screen is built out of takes the height it is given and no more", () => {
    expect(slotClasses("dashboardPanel", "root")).toContain("min-h-0");
  });

  test("and so does the sidebar beside it, which is the other column of a shell", () => {
    expect(slotClasses("dashboardSidebar", "root")).toContain("min-h-0");
  });

  test("no component holds itself to a window's worth of height", async () => {
    const held: string[] = [];
    const found = await sources("components/**/*.vue");

    for (const { path, text } of found) {
      if (elements(template(text)).some((node) => staticClasses(node).some(heldToTheWindow))) held.push(path);
    }

    // The sweep found the files to sweep, so nothing above passes on an empty list.
    expect(found.length).toBeGreaterThan(20);
    expect(held).toEqual([]);
  });
});

// A screen standing on no shell must still never give the document a scroll of its own. What gives it
// one is not a tall part — every part scrolls inside itself — but a piece laid out absolutely inside a
// part, a word kept for a screen reader above all: with nothing positioned around it, it finds its
// place against the page, at the depth it has in its part's scrolled content, and the page grows as
// tall as that. A frame that is pinned is what those pieces find their place against.
describe("the frame a screen standing on no shell stands in", () => {
  test("is pinned to the visible screen and clips, so it anchors what it holds", async () => {
    const text = await source("components/ScreenFrame.vue");
    const root = elements(template(text))[0]!;
    const style = attribute(root, "style");

    expect(staticClasses(root)).toContain("fixed");
    expect(staticClasses(root)).toContain("overflow-hidden");
    expect(style?.type).toBe(DIRECTIVE);
    expect(style?.exp?.content).toBe("SCREEN_FRAME");
    // It stands where no layout keeps the pair for it, so it keeps them itself.
    expect(text).toContain("useVisibleScreen()");
  });
});

describe("what floats over the screen keeps clear of a phone's own bars", () => {
  // The bars a phone drawing edge to edge lays over the page, as the stylesheet names them.
  const SAFE_TOP = "--bmo-safe-top";
  const SAFE_BOTTOM = "--bmo-safe-bottom";

  // The compound variants of a component's configuration that name the sides given, and the classes
  // they give the box.
  function edgeVariant(component: string, key: string): { sides: string[]; content: string[] } {
    const variants = (appConfig.ui[component]?.compoundVariants ?? []) as ConfigEntry[];
    const found = variants.filter((one) => Array.isArray(one[key]));

    expect(found).toHaveLength(1);

    return {
      sides: [...(found[0]![key] as string[])].sort(),
      content: ((found[0]!.class as { content: string }).content ?? "").split(/\s+/)
    };
  }

  test("is two properties in the stylesheet, read off the device and nought where it reports none", () => {
    expect(rootValue(SAFE_TOP)).toBe("env(safe-area-inset-top, 0px)");
    expect(rootValue(SAFE_BOTTOM)).toBe("env(safe-area-inset-bottom, 0px)");
  });

  test("a drawer reaching the foot adds the gesture bar inside its own box, and one from the top does not", () => {
    const drawer = edgeVariant("drawer", "direction");

    expect(drawer.sides).toEqual(["bottom", "left", "right"]);
    expect(drawer.content).toContain(`pb-(${SAFE_BOTTOM})`);
  });

  test("so does a slideover", () => {
    const slideover = edgeVariant("slideover", "side");

    expect(slideover.sides).toEqual(["bottom", "left", "right"]);
    expect(slideover.content).toContain(`pb-(${SAFE_BOTTOM})`);
  });

  test("a dialog in the middle is centred between both bars and its ceiling leaves both out", () => {
    const content = slotClasses("modal", "content");
    const top = content.find((one) => one.startsWith("top-["));
    const ceilings = content.filter((one) => /^(sm:)?max-h-\[/.test(one));

    expect(top).toContain(`var(${SAFE_TOP})`);
    expect(top).toContain(`var(${SAFE_BOTTOM})`);
    expect(ceilings).toHaveLength(2);

    for (const ceiling of ceilings) {
      expect(ceiling).toContain(`-var(${SAFE_TOP})-var(${SAFE_BOTTOM})`);
    }
  });
});
