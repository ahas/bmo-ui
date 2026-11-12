import { describe, expect, test } from "bun:test";
import { Glob } from "bun";

// The toolbar's own shape, read off the file that ships: where a rule comes from is the point of it,
// since no toolbar has to be told. What the rule draws — a small button centred with its hover on its
// own shape, a cell of links keeping no room — is measured in a browser (`tests/browser/toolbar.test.ts`).

const components = new URL("../../app/components/", import.meta.url);
const bar = await Bun.file(new URL("ToolBar.vue", components)).text();

describe("a toolbar's buttons", () => {
  // The small size is the library's default inside the toolbar, set once, so a toolbar written later
  // stands its buttons small without being told.
  test("are the library's small ones by the toolbar's own default", () => {
    expect(bar).toContain('<UTheme :props="SMALL">');
    expect(bar).toContain('const SMALL = { button: { size: "sm" } } as const;');
  });

  // The toolbar never reshapes a button: no height, width, square or padding is laid on one.
  test("are never stretched, squared or padded by the toolbar", () => {
    expect(bar).not.toMatch(/\[&_[^\]]*button[^\]]*\]:(h|min-w|size|w|p|px|py)-/);
  });

  // A word in a button stays on one line, whether the button is drawn as a button or as a link.
  test("never break their word into two lines, told so once for all of them", () => {
    expect(bar).toContain("[&_:is(button,a)]:whitespace-nowrap");
  });

  // A toolbar too wide for its container flows sideways rather than shrinking what stands in it.
  test("are answered by the row flowing sideways when the width runs out", () => {
    expect(bar).toContain("overflow-x-auto");
    expect(bar).toContain("[&>*]:shrink-0");
  });
});

describe("a toolbar's cells", () => {
  // A library button is told by the slot name it carries as a button and as a link alike, never by
  // its element, so a cell of buttons given routes is a cell of buttons.
  test("tell a button by its being the library's, not by its element", () => {
    expect(bar).toContain(":is(button,a)[data-slot=base]");
    expect(bar).not.toContain(":has(>button)");
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
