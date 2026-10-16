import { describe, expect, test } from "bun:test";

import { headingOf, sectionHeading, sectionedRowId, sectionedRows } from "~/domain/table-sections";

interface Row {
  key: string;
  part: string | null;
}

const sections = [
  { key: "pre", label: "Before" },
  { key: "post", label: "After" },
  { key: "apart", label: "Outside" },
];

const partOf = (row: Row): string | null => row.part;
const keyOf = (row: Row): string => row.key;

// What a drawn table reads as: a heading as its label in brackets, a row as its key.
const read = (drawn: unknown[]): string[] =>
  drawn.map((item) => {
    const heading = headingOf(item);

    return heading === null ? (item as Row).key : `[${heading.label}]`;
  });

describe("a table in parts", () => {
  test("stands each part under its heading, in the order the parts are named", () => {
    const rows: Row[] = [
      { key: "review", part: "post" },
      { key: "summary", part: "pre" },
      { key: "cleaner", part: "pre" },
      { key: "cleaner", part: "post" },
      { key: "convert", part: "apart" },
    ];

    expect(read(sectionedRows(rows, sections, partOf))).toEqual([
      "[Before]", "summary", "cleaner",
      "[After]", "review", "cleaner",
      "[Outside]", "convert",
    ]);
  });

  test("gives a part with no row no heading", () => {
    expect(read(sectionedRows([{ key: "convert", part: "apart" }], sections, partOf))).toEqual(["[Outside]", "convert"]);
  });

  test("puts a row of no named part after every part, under no heading, rather than dropping it", () => {
    const rows: Row[] = [
      { key: "stray", part: "elsewhere" },
      { key: "unplaced", part: null },
      { key: "review", part: "post" },
    ];

    expect(read(sectionedRows(rows, sections, partOf))).toEqual(["[After]", "review", "stray", "unplaced"]);
  });

  test("hands back the screen's own rows untouched", () => {
    const row: Row = { key: "cleaner", part: "pre" };

    expect(sectionedRows([row], sections, partOf)[1]).toBe(row);
    expect(headingOf(row)).toBeNull();
  });
});

describe("which row a drawn row is", () => {
  test("keeps the same row in two parts apart", () => {
    const pre = sectionedRowId<Row>({ key: "cleaner", part: "pre" }, 2, partOf, keyOf);
    const post = sectionedRowId<Row>({ key: "cleaner", part: "post" }, 5, partOf, keyOf);

    expect(pre).toBe("row:pre:cleaner");
    expect(post).toBe("row:post:cleaner");
  });

  test("names a heading by its part, apart from every row", () => {
    expect(sectionedRowId<Row>(sectionHeading(sections[0]!), 0, partOf, keyOf)).toBe("section:pre");
  });

  test("falls back to the row's place where the screen names no key", () => {
    expect(sectionedRowId<Row>({ key: "cleaner", part: null }, 7, partOf)).toBe("row::7");
  });

  test("every id of a drawn table is its own", () => {
    const drawn = sectionedRows<Row>(
      [
        { key: "cleaner", part: "pre" },
        { key: "cleaner", part: "post" },
        { key: "review", part: "post" },
      ],
      sections,
      partOf,
    );
    const ids = drawn.map((item, index) => sectionedRowId(item, index, partOf, keyOf));

    expect(new Set(ids).size).toBe(ids.length);
  });
});
