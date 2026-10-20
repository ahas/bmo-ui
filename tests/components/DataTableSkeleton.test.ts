import { describe, expect, test } from "bun:test";

// The shared table's placeholder, read from the files that ship. The shape it keeps is the table's
// own, stated once in the table-layout module and read by both, so a placeholder cannot drift from
// the table it stands for.

const skeleton = await Bun.file(new URL("../../app/components/DataTableSkeleton.vue", import.meta.url)).text();
const table = await Bun.file(new URL("../../app/components/DataTable.vue", import.meta.url)).text();

describe("the shared table's placeholder", () => {
  test("stands in the table's own box, so a narrow width scrolls rather than cutting a name", () => {
    expect(skeleton).toContain("TABLE_BOX");
    expect(skeleton).toContain(':class="box.root"');
    expect(skeleton).toContain('<table :class="box.base">');
    // Its columns are the table's own, never an equal share of the box.
    expect(skeleton).not.toContain("gridTemplateColumns");
    expect(skeleton).not.toContain("repeat(");
  });

  test("draws the table's own head and row height", () => {
    expect(skeleton).toContain("TABLE_HEAD");
    expect(skeleton).toContain("TABLE_ROW_HEIGHT");
    expect(skeleton).toContain(':class="head"');
    expect(skeleton).toContain(':class="cell"');
    // One statement for both, so the table cannot move without the place that keeps it.
    expect(table).toContain("TABLE_BOX");
    expect(table).toContain("TABLE_HEAD");
    expect(table).toContain("TABLE_ROW_HEIGHT");
  });

  test("takes the layout of the table it stands for", () => {
    expect(skeleton).toContain("layout?: TableLayout");
    expect(skeleton).toContain('layout: "own"');
    expect(skeleton).toContain("dense.value");
  });

  test("keeps the head's line box when a column's name is not known yet", () => {
    // A bar in a line box of the head's own line height, so an unnamed head is as tall as a named one.
    expect(skeleton).toContain('class="flex h-5 items-center"><SkeletonBar');
  });
});
