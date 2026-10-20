import { describe, expect, test } from "bun:test";

// The shared table in parts, read from the file that ships. What order the parts and rows stand in
// and which row is which are the domain's (`tests/domain/table-sections.test.ts`); what is checked
// here is that the table draws them the way the screens are promised: one header, one set of
// columns, a heading row across the whole table, and a screen's own cell never handed a heading.

const table = await Bun.file(new URL("../../app/components/DataTable.vue", import.meta.url)).text();

describe("a table in parts", () => {
  test("is drawn only where the screen names both the parts and each row's part", () => {
    expect(table).toContain("const sectioned = computed(() => props.sections !== undefined && props.sectionOf !== undefined);");
    // A table with no parts is handed its rows and columns as the screen gave them.
    expect(table).toContain("sectioned.value ? sectionedRows(props.data, props.sections!, props.sectionOf!) : props.data");
    expect(table).toContain("if (!sectioned.value) return shownColumns.value as TableColumn<Drawn>[];");
    expect(table).toContain("sectioned.value ? (item: T, index: number) => sectionedRowId<T>(item, index, props.sectionOf!, props.rowKey) : undefined");
  });

  test("keeps one header and one set of column widths, sticky and scrolling as before", () => {
    expect(table.match(/<UTable/g)).toHaveLength(1);
    expect(table).toContain("sticky");
    expect(table).toContain("useColumnWidths(");
    // The parts are built over the widths the columns are held at, not beside them.
    expect(table).toContain("return shownColumns.value.map((column, index) => {");
  });

  test("draws a heading as one cell across every column, the first column's, with the others out of it", () => {
    expect(table).toContain("const span = String(props.columns.length);");
    expect(table).toContain('index === 0 ? "" : "hidden"');
    expect(table).toContain("colspan: { td:");
  });

  // A line landing on the edge of a header is not drawn.
  test("draws no line on either edge of a heading row", () => {
    expect(table).toContain('if (headingOf(row.original) !== null) return "border-b-0 bg-elevated/50";');
    expect(table).toContain('return headingOf(drawnRows.value[row.index + 1]) === null ? "" : "border-b-0";');
  });

  test("centres the heading's words on its row, like any section's title row", () => {
    expect(table).toMatch(/data-section-heading class="flex [^"]*items-center/);
    // Never below the table's own text size.
    expect(table).toMatch(/data-section-heading class="[^"]*text-sm/);
    expect(table).not.toContain("text-xs");
  });

  test("never hands a screen's own cell, slot or accessor a heading", () => {
    expect(table).toContain('<slot v-if="!headingCell(name, scope)" :name="name" v-bind="scope" :held="fixed" />');
    expect(table).toContain("headingOf(context.row.original) === null ? cell(context) : null");
    expect(table).toContain("headingOf(row) === null ? accessorFn(row as T, at) : undefined");
  });

  test("is not a row to press, and a pressed row is handed back with its place among the screen's rows", () => {
    expect(table).toContain("if (headingOf(row.original) !== null) return;");
    expect(table).toContain("sectioned.value ? props.data.indexOf(original) : row.index");
  });
});

describe("a table whose columns are held by hand", () => {
  // A hand-narrowed column cuts its cells; the cut line ends in an ellipsis, which is how the shared
  // tooltip layer finds a line cut to fit its box (the cut-lines module).
  test("cuts a cell with an ellipsis, so the shared tooltip finds it", () => {
    expect(table).toContain('fixed.value ? "truncate" : ""');
    expect(table).not.toContain('fixed.value ? "overflow-hidden" : ""');
  });

  // The box, the head cell and the row heights are stated once for the table and its placeholder.
  test("takes its box, head and row height from the table-layout module", () => {
    expect(table).toContain("TABLE_BOX[props.layout]");
    expect(table).toContain("TABLE_HEAD[dense");
    expect(table).toContain("TABLE_ROW_HEIGHT.own");
    expect(table).toContain("TABLE_ROW_HEIGHT.dense");
  });
});

describe("a table of rows to press or widen", () => {
  // A row pressed as a whole shows it can be, in every layout: a hand, and a step of background on
  // hover and on press that its resting row does not have.
  test("marks a row to press in every layout, not the dense grid alone", () => {
    const marks = table.match(/data-\[selectable=true\]:cursor-pointer data-\[selectable=true\]:hover:bg-elevated\/50/g) ?? [];

    expect(marks.length).toBe(2);
    expect(table.match(/data-\[selectable=true\]:active:bg-accented\/50/g)?.length).toBe(2);
  });

  // A cell of the screen's own with a ceiling of its own gives it up once the widths are held, so a
  // column dragged wider shows more of its words; the cell is told which it is.
  test("tells every cell slot of the screen's own whether the widths are held", () => {
    // The slots of every column but a table in parts' first are read with the heading guard above.
    expect(table).toContain(':name="`${firstId}-cell`" v-bind="scope" :held="fixed" />');
  });
});
