import { describe, expect, test } from "bun:test";

// The edge of a column's name, read from the file that ships. What the keyboard reaches is ringed by
// the one shared style (docs/design.md, "Focus"); the edge draws no ring of its own.

const handle = await Bun.file(new URL("../../app/components/ColumnResizeHandle.vue", import.meta.url)).text();

describe("the column's edge", () => {
  test("takes the shared focus ring, drawn inside the table's clipping edge", () => {
    expect(handle).toContain("focus-inset");
    expect(handle).not.toContain("focus-visible:outline-none");
    expect(handle).not.toContain("focus-visible:after:");
  });

  test("still widens and colours its line under a pointer and a press", () => {
    expect(handle).toContain("hover:after:w-0.5");
    expect(handle).toContain("hover:after:bg-primary");
    expect(handle).toContain("active:after:bg-primary");
  });
});
