import { describe, expect, test } from "bun:test";
import { Glob } from "bun";

// The toolbar's own shape, read off the file that ships: a rendered screen shows the squares but
// says nothing about where they came from, and the whole point of the rule is that no toolbar has
// to be told.

const components = new URL("../../app/components/", import.meta.url);
const bar = await Bun.file(new URL("ToolBar.vue", components)).text();

describe("a toolbar's item buttons", () => {
  test("are squares of the toolbar's own height, on a finger too", () => {
    expect(bar).toContain("h-9");
    expect(bar).toContain("pointer-coarse:h-10");
    expect(bar).toContain("[&_button:has(>.iconify:only-child)]:h-9");
    expect(bar).toContain("[&_button:has(>.iconify:only-child)]:min-w-9");
    expect(bar).toContain("pointer-coarse:[&_button:has(>.iconify:only-child)]:h-10");
    expect(bar).toContain("pointer-coarse:[&_button:has(>.iconify:only-child)]:min-w-10");
  });

  // The rule is set once and reads a button by what it holds, so a select, a switch or a button
  // carrying a word keeps its own shape and a toolbar written later is held to it without being
  // told.
  test("are told from everything else by their content being one mark", () => {
    expect(bar).toContain(":only-child");
    expect(bar).not.toContain("[&_button]:size-9");
    expect(bar).not.toContain("[&_button]:min-w-9");
  });

  // A word beside a mark is invisible to the stylesheet, so the square has to be a floor: a width
  // that cannot be pushed past would catch such a button and fold its word into the row's height.
  test("are a floor and never a fixed width", () => {
    expect(bar).not.toContain(":size-9");
    expect(bar).not.toContain(":size-10");
  });
});

describe("a toolbar's buttons that carry a word", () => {
  // The one rule every toolbar is held to by standing in this file: a word in a button stays on one
  // line, wherever the toolbar has been squeezed to.
  test("never break that word into two lines, and are told so once for all of them", () => {
    expect(bar).toContain("[&_button]:whitespace-nowrap");
  });

  // A toolbar too wide for its container flows sideways; that is the answer to a width too small,
  // and it is set on the toolbar itself rather than by shrinking what stands in it.
  test("are answered by the row flowing sideways when the width runs out", () => {
    expect(bar).toContain("overflow-x-auto");
    expect(bar).toContain("[&>*]:shrink-0");
  });
});

describe("every toolbar of the layer", () => {
  test("is this one, so none of them sizes its own buttons", async () => {
    for await (const path of new Glob("**/*.vue").scan({ cwd: components.pathname })) {
      if (path.endsWith("ToolBar.vue")) {
        continue;
      }

      expect(await Bun.file(new URL(path, components)).text()).not.toContain('role="toolbar"');
    }
  });
});

// A cell is as wide as what it holds. The room a cell of words keeps on either side, laid around a
// group of buttons, stands a folded group's more button half again as wide as the squares beside
// it, and laid over a library button, replaces the padding that button already carries.
describe("a toolbar's cells", () => {
  test("keep the toolbar's room only where a cell is drawn by hand and it is more than buttons", () => {
    expect(bar).toContain("[&>:not([data-slot]):not(:has(>button):not(:has(>:not(button))))]:px-3");
    expect(bar).not.toContain("[&>*]:px-3");
  });
});
