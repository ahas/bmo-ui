import { describe, expect, test } from "bun:test";

import { MIN_COLUMN_PX, setColumnWidth, tableHeaders } from "~/domain/column-widths";

describe("a column's width", () => {
  test("never goes below the narrowest a column may be, and is whole pixels", () => {
    expect(setColumnWidth({ a: 100 }, "a", 10)).toEqual({ a: MIN_COLUMN_PX });
    expect(setColumnWidth({ a: 100, b: 80 }, "b", 120.6)).toEqual({ a: 100, b: 121 });
  });
});

describe("what a table's columns are called", () => {
  test("a column with a name of its own gives it, and one without keeps its place blank", () => {
    expect(tableHeaders([{ header: "Name" }, {}, { header: () => null }, { header: "Count" }]))
      .toEqual(["Name", "", "", "Count"]);
  });
});
