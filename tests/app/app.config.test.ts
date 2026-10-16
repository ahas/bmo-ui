import { describe, expect, test } from "bun:test";

import { appConfig, attribute, DIRECTIVE, ELEMENT, elements, expression, expressionNodes, slotClasses, sources, staticClasses, stylesheet, template } from "./sources";

import type { TemplateNode } from "./sources";

// How wide the layer reads is one number in one place and one rule that puts it on every panel
// (`docs/design.md`, "Width"). Both are read here from the files that ship. No panel carries a
// width of its own: the panel every screen is built out of carries it, so a screen added later
// stands the same width without being told.
//
// Which layer of that panel carries it matters as much as the number. The panel's body is the box
// that scrolls, and a scroll box narrowed to the column takes its scrollbar in with it, to stand
// beside the text short of the edge of the window. So the width is written on what the body holds,
// never on the body, and that is what these read for.

// Whether a class is aimed at what a box holds rather than at the box.
function aimedAtWhatItHolds(one: string): boolean {
  return one.startsWith("[&>*]:") || /^[a-z]+:\[&>\*\]:/.test(one);
}

function rootDeclaration(property: string): string | undefined {
  let found: string | undefined;

  stylesheet.walkDecls(property, (declaration) => {
    if (declaration.parent?.type === "rule" && (declaration.parent as { selector: string }).selector === ":root") found = declaration.value;
  });

  return found;
}

describe("the width the layer reads at", () => {
  test("is one number, in the stylesheet, and it is 768 pixels", () => {
    expect(rootDeclaration("--ui-container")).toBe("48rem");
  });

  test("is put on the panel every screen is built out of, centred", () => {
    const classes = slotClasses("dashboardPanel", "body");

    expect(classes).toContain("[&>*]:max-w-[calc(var(--ui-container)+var(--bmo-inset,0px))]");
    expect(classes).toContain("[&>*]:mx-auto");
  });

  test("is the width of the content, with a container's own side room added outside it", () => {
    expect(appConfig.ui.container?.base).toBe(
      "[--bmo-inset:2rem] sm:[--bmo-inset:3rem] lg:[--bmo-inset:4rem] max-w-[calc(var(--ui-container)+var(--bmo-inset))]"
    );
  });

  test("is carried by what the body holds and never by the body, which is the box that scrolls", () => {
    // A width on the box itself pulls the scrollbar in off the edge of the window and stands it
    // beside the text, which is the whole of what this rule is here to prevent.
    const onTheBox = slotClasses("dashboardPanel", "body").filter((one) => !aimedAtWhatItHolds(one) && /^(max-w-|w-|mx-auto)/.test(one));

    expect(onTheBox).toEqual([]);
  });
});

// A box to write in stands the width of what holds it, said in the one place that holds every one
// of them. On its own it is an inline control the width of a couple of dozen letters, so in a plain
// block it would come out narrower than the fields above and below it while its neighbours in a
// flexed column are stretched to the full width.
describe("the width a box to write in stands", () => {
  test("is put on the textarea itself, in the layer's own configuration", () => {
    expect(slotClasses("textarea", "root")).toEqual(["w-full"]);
  });

  test("is written on no component of its own", async () => {
    const said: string[] = [];
    let seen = 0;

    for (const { path, text } of await sources("components/**/*.vue")) {
      for (const node of elements(template(text))) {
        if (node.tag !== "UTextarea" && node.tag !== "GrowingTextarea") continue;

        seen += 1;

        if (staticClasses(node).some((one) => one.startsWith("w-") || one.startsWith("max-w-"))) said.push(path);
      }
    }

    // The sweep is only worth anything if it found the boxes to sweep.
    expect(seen).toBeGreaterThan(0);
    expect(said).toEqual([]);
  });
});

// A popover grows to whatever it was handed and is drawn beside the thing that opened it, so a panel
// with no ceiling and no scroll runs off the bottom of a phone and its tail cannot be reached at all
// (`docs/design.md`, "Popovers"). The ceiling is said once, in the layer's configuration, and is read
// from the room the popper worked out rather than from a window measured for itself.
describe("the ceiling a popover stands under", () => {
  test("is the room the popper left it, in height and in width, and never a number of its own", () => {
    const classes = slotClasses("popover", "content");

    expect(classes).toContain("max-h-(--reka-popover-content-available-height)");
    expect(classes).toContain("max-w-(--reka-popover-content-available-width)");

    // A ceiling written as a length, or as a share of the window, is a guess about where the panel
    // will be drawn; the popper already knows, and only its answer follows the trigger.
    const guessed = classes.filter((one) => /^(max-h-|max-w-)/.test(one) && !one.includes("--reka-popover-content-"));

    expect(guessed).toEqual([]);
  });

  test("and past it the panel scrolls rather than losing its tail", () => {
    const classes = slotClasses("popover", "content");

    expect(classes).toContain("overflow-y-auto");
    // A panel that reaches its end and goes on scrolling the page behind it takes the reader off the
    // thing they opened.
    expect(classes).toContain("overscroll-contain");

    for (const undone of ["max-h-none", "overflow-visible", "overflow-hidden", "overflow-y-visible", "overflow-y-hidden"]) {
      expect(classes).not.toContain(undone);
    }
  });
});

// The tag a popover's content slot opens with: the one box that holds everything the panel says.
function contentBox(popover: TemplateNode): TemplateNode | undefined {
  const slot = (popover.children ?? []).find(
    (child) => child.tag === "template" && child.props?.some((prop) => prop.type === DIRECTIVE && prop.name === "slot" && prop.arg?.content === "content")
  );

  return slot?.children?.find((child) => child.type === ELEMENT);
}

// The class strings written into one of an element's bound properties.
function boundStrings(node: TemplateNode, name: string): string[] {
  const bound = attribute(node, name);

  if (bound?.type !== DIRECTIVE || bound.exp?.content === undefined) return [];

  return [...expressionNodes(expression(bound.exp.content))].flatMap((one) => (one.type === "StringLiteral" ? [one.value as string] : []));
}

describe("the popovers the layer draws", () => {
  const popovers = async () =>
    (await sources("components/**/*.vue")).flatMap(({ path, text }) =>
      elements(template(text))
        .filter((node) => node.tag === "UPopover")
        .map((node) => ({ path, text, node }))
    );

  test("are there to read, each with a box its panel holds, so nothing below passes on an empty sweep", async () => {
    const found = await popovers();

    expect(found.length).toBeGreaterThan(0);

    for (const { path, node } of found) {
      expect({ path, box: contentBox(node) !== undefined }).toEqual({ path, box: true });
    }
  });

  test("leave none unbounded, and none writes a ceiling of its own", async () => {
    const said: string[] = [];

    for (const { path, text, node } of await popovers()) {
      // A width on its own panel is the shape it wants where there is room, and that is its own
      // business. A height, an overflow, or the popper's own properties copied out onto a component
      // are the ceiling said twice, and two ceilings drift apart.
      if (boundStrings(node, "ui").some((one) => /(^|\s)(max-h-|overflow-)/.test(one)) || text.includes("--reka-popover-content-available")) {
        said.push(path);
      }

      // The panel is what scrolls, so nothing standing directly in it may take the scroll off it by
      // holding a height of its own: the long content would then sit in a box the finger's drag never
      // reaches. A list further in with a scroll of its own is a different matter.
      const box = contentBox(node)!;

      if ([...staticClasses(box), ...boundStrings(box, "class")].some((one) => /(max-h-|overflow-)/.test(one))) said.push(path);
    }

    expect(said).toEqual([]);
  });
});

// The room a panel's content stands in, and the foot of it above all (`docs/design.md`, "Room at the
// foot"). A screen whose last row ends exactly where the scroll ends reads as cut off rather than
// finished, so the panel keeps room below its last row, the same on all four sides.
describe("the room a panel's content stands in", () => {
  test("is named by the layer rather than left to the component's own default", () => {
    // Inherited, it could go quiet in a version bump and nobody would have written anything.
    expect(slotClasses("dashboardPanel", "body")).toContain("p-4");
    expect(slotClasses("dashboardPanel", "body")).toContain("sm:p-6");
  });

  test("and it is the same room on every side, so the foot is never zero", () => {
    const sided = slotClasses("dashboardPanel", "body").filter((one) => /^(sm:)?p[btxy]-/.test(one));

    expect(sided).toEqual([]);
  });
});

// A menu dropped from a button is as wide as its longest item. The library gives every menu a fixed
// minimum, which a short menu fills with empty room, and every row draws its trailing column — the
// place a check or a key stands — whether it holds one or not, an empty column still costing a gap.
describe("the width a menu dropped from a button stands", () => {
  test("is its longest item's, with no floor of its own, for a button's menu and a pointer's alike", () => {
    for (const menu of ["dropdownMenu", "contextMenu"]) {
      const content = slotClasses(menu, "content");

      expect(content).toContain("min-w-0");
      expect(content).toContain("w-max");
      expect(content.filter((one) => one.startsWith("min-w-"))).toEqual(["min-w-0"]);
    }
  });

  test("and a row's trailing column takes room only where it holds something", () => {
    expect(slotClasses("dropdownMenu", "itemTrailing")).toEqual(["empty:hidden"]);
    expect(slotClasses("contextMenu", "itemTrailing")).toEqual(["empty:hidden"]);
  });

  test("is written on no component of its own", async () => {
    const said: string[] = [];
    let seen = 0;

    for (const { path, text } of await sources("components/**/*.vue")) {
      for (const node of elements(template(text))) {
        if (node.tag !== "UDropdownMenu" && node.tag !== "UContextMenu") continue;

        seen += 1;

        // What a menu hands its own panel, in its content props or in its slots' classes: a width
        // there is a floor or a ceiling said twice.
        if ([...boundStrings(node, "content"), ...boundStrings(node, "ui")].some((one) => /(^|\s)(min-|max-)?w-/.test(one))) said.push(path);
      }
    }

    expect(seen).toBeGreaterThan(1);
    expect(said).toEqual([]);
  });
});
