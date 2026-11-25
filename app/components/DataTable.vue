<template>
  <!-- The one table every screen draws rows in. It scrolls sideways inside its own box so no cell
       is cut, holds its column names overhead while the rows scroll, and lets every column be
       widened or narrowed from the right edge of its name. What goes in a cell is the screen's own,
       through the same slots Nuxt UI's table takes. A screen that names parts gets a heading row
       across the whole table before each part's first row, under the same header and the same
       columns. A cell slot is also told whether the widths are held by hand, which is when a cell
       with a ceiling of its own gives it up and takes its column's width. -->
  <UTable
    ref="table"
    :data="drawnRows as T[]"
    :columns="drawnColumns as TableColumn<T>[]"
    :ui="tableUi"
    :meta="rowMeta"
    :get-row-id="rowId"
    :style="fixed ? { '--data-table-width': `${total}px` } : undefined"
    :on-select="props.selectable ? select : undefined"
    sticky
    @keydown.enter="enter"
  >
    <template v-for="column in props.columns" :key="idOf(column)" #[`${idOf(column)}-header`]="scope">
      <slot :name="`${idOf(column)}-header`" v-bind="scope">{{ headerOf(column) }}</slot>
      <ColumnResizeHandle :label="headerOf(column) || idOf(column)" :width="widths[idOf(column)]" @start="startResize($event, idOf(column))" @nudge="nudge(idOf(column), $event)" />
    </template>

    <template v-if="sectioned" #[`${firstId}-cell`]="scope">
      <div v-if="headingOf(scope.row.original)" data-section-heading class="flex min-h-8 items-center px-4 py-1 text-sm font-semibold text-muted">
        {{ headingOf(scope.row.original)?.label }}
      </div>
      <slot v-else-if="slots[`${firstId}-cell`]" :name="`${firstId}-cell`" v-bind="scope" :held="fixed" />
      <CellContent v-else :scope="scope" />
    </template>

    <template v-for="name in passedSlots" :key="name" #[name]="scope">
      <slot v-if="!headingCell(name, scope)" :name="name" v-bind="scope" :held="fixed" />
    </template>
  </UTable>
</template>

<script setup lang="ts" generic="T">
import { useColumnWidths } from "../domain/column-widths";
import { TABLE_BOX, TABLE_HEAD, TABLE_HEAD_LINE, TABLE_ROW_HEIGHT } from "../domain/table-layout";
import { headingOf, sectionedRowId, sectionedRows } from "../domain/table-sections";

import type { TableColumn, TableRow } from "@nuxt/ui";
import type { CellContext } from "@tanstack/vue-table";
import type { SectionHeading, TableSection } from "../domain/table-sections";

interface Props {
  data: T[];
  // Every column carries an id, or a plain accessor key that serves as one.
  columns: TableColumn<T>[];
  // How the table stands: the whole of its section, only its own height among other content, or
  // the dense grid of a record browser.
  layout?: "fill" | "own" | "dense";
  // Whether a row is pressed as a whole, by pointer or by Enter.
  selectable?: boolean;
  // The parts the rows stand in, in the order they stand, and which part a row belongs to. With
  // both given the rows are drawn part by part, each under its heading (the table-sections module).
  sections?: TableSection[];
  sectionOf?: (row: T) => string | null | undefined;
  // What tells one row from another within its part, where the same row may stand in two parts.
  rowKey?: (row: T) => string;
  // A row's own classes, for a screen that marks a row — the one chosen — among the rest.
  rowClass?: (row: T) => string;
}

type Drawn = T | SectionHeading;

const props = withDefaults(defineProps<Props>(), { layout: "own", selectable: false });

const emit = defineEmits<{ select: [row: T, index: number] }>();

const slots = useSlots();
const table = useTemplateRef<{ $el?: HTMLElement }>("table");

function idOf(column: TableColumn<T>): string {
  const held = column as { id?: string; accessorKey?: unknown };

  return held.id ?? String(held.accessorKey);
}

function headerOf(column: TableColumn<T>): string {
  return typeof column.header === "string" ? column.header : "";
}

const names = computed(() => props.columns.map(idOf));
const { widths, fixed, total, startResize, nudge } = useColumnWidths(() => names.value, () => table.value?.$el?.querySelector<HTMLElement>("thead > tr") ?? null);

// A held width stands on the column's name cell, which is what a fixed table lays out by.
const shownColumns = computed<TableColumn<T>[]>(() =>
  props.columns.map((column) => {
    const width = widths.value[idOf(column)];

    if (!fixed.value || width === undefined) return column;

    const meta = column.meta ?? {};

    return { ...column, meta: { ...meta, style: { ...meta.style, th: { width: `${width}px` } } } } as TableColumn<T>;
  })
);

const sectioned = computed(() => props.sections !== undefined && props.sectionOf !== undefined);
const firstId = computed(() => names.value[0] ?? "");

const drawnRows = computed<Drawn[]>(() =>
  sectioned.value ? sectionedRows(props.data, props.sections!, props.sectionOf!) : props.data
);

const rowId = computed(() =>
  sectioned.value ? (item: T, index: number) => sectionedRowId<T>(item, index, props.sectionOf!, props.rowKey) : undefined
);

// A heading row takes a step of background, so a part reads as starting there. The parts are told
// apart by their headings alone: no line is drawn on either edge of a heading row, neither its own
// nor the one under the row before it.
function rowClass(row: TableRow<T>): string {
  if (headingOf(row.original) !== null) return "border-b-0 bg-elevated/50";

  return headingOf(drawnRows.value[row.index + 1]) === null ? "" : "border-b-0";
}

const rowMeta = computed(() => {
  if (sectioned.value) return { class: { tr: rowClass } };

  const own = props.rowClass;

  return own === undefined ? undefined : { class: { tr: (row: TableRow<T>) => own(row.original as T) } };
});

// In a table of parts a heading row is one cell across every column: the first column's cell spans
// them and the others stand out of it. A cell of the screen's own is never handed a heading.
const drawnColumns = computed<TableColumn<Drawn>[]>(() => {
  if (!sectioned.value) return shownColumns.value as TableColumn<Drawn>[];

  const span = String(props.columns.length);

  return shownColumns.value.map((column, index) => {
    const meta = column.meta ?? {};
    const td = meta.class?.td;
    const own = (cell: Parameters<Exclude<typeof td, string | undefined>>[0]): string => (typeof td === "function" ? td(cell) : (td ?? ""));
    const held = column as { cell?: unknown; accessorFn?: (row: T, index: number) => unknown };
    const cell = held.cell;
    const accessorFn = held.accessorFn;

    return {
      ...column,
      ...(typeof cell === "function" ? { cell: (context: CellContext<T, unknown>) => (headingOf(context.row.original) === null ? cell(context) : null) } : {}),
      ...(accessorFn === undefined ? {} : { accessorFn: (row: Drawn, at: number) => (headingOf(row) === null ? accessorFn(row as T, at) : undefined) }),
      meta: {
        ...meta,
        class: {
          ...meta.class,
          td: (at: Parameters<typeof own>[0]) => (headingOf(at.row.original) === null ? own(at) : index === 0 ? "" : "hidden")
        },
        ...(index === 0
          ? { colspan: { td: (at: Parameters<typeof own>[0]) => (headingOf(at.row.original) === null ? resolved(meta.colspan?.td, at) : span) } }
          : {})
      }
    } as TableColumn<Drawn>;
  });
});

function resolved<A>(value: string | ((arg: A) => string) | undefined, arg: A): string {
  return typeof value === "function" ? value(arg) : (value ?? "");
}

// A cell of the first column with no slot of the screen's own draws what the column says it holds.
function CellContent(scopeProps: { scope: CellContext<T, unknown> }): unknown {
  const cell = scopeProps.scope.column.columnDef.cell;

  return typeof cell === "function" ? cell(scopeProps.scope) : cell;
}

// Every slot the screen gave, except the column names this table draws itself and, in a table of
// parts, the first column's cells, which it draws around the headings.
const passedSlots = computed(() =>
  Object.keys(slots).filter((name) =>
    !names.value.some((id) => name === `${id}-header`) && !(sectioned.value && name === `${firstId.value}-cell`)
  )
);

// Whether a slot is being asked for a heading row's cell, which the screen never draws.
function headingCell(name: string, scope: unknown): boolean {
  if (!sectioned.value || !name.endsWith("-cell")) return false;

  return headingOf((scope as { row?: { original?: unknown } } | undefined)?.row?.original) !== null;
}

const tableUi = computed(() => {
  const layout = TABLE_BOX[props.layout];
  const dense = props.layout === "dense";

  return {
    root: layout.root,
    base: fixed.value ? "table-fixed w-(--data-table-width)" : layout.base,
    // The head row draws no line of its own: the table already draws the separator under the head.
    thead: "bg-elevated [&>tr]:border-b-0",
    th: TABLE_HEAD[dense ? "dense" : "own"],
    separator: TABLE_HEAD_LINE,
    // The last row of data draws no line under it, a list's foot standing after it included (NextPageFoot).
    // A cell of a column held by hand is cut with an ellipsis, so the line is one the shared tooltip
    // layer finds and shows whole; until then the box scrolls sideways and cuts nothing.
    td: dense
      ? [`${TABLE_ROW_HEIGHT.dense} truncate px-2 py-1 align-top text-sm`, fixed.value ? "" : "max-w-64"].join(" ")
      : [`${TABLE_ROW_HEIGHT.own} p-0 align-top text-sm whitespace-nowrap`, fixed.value ? "truncate" : ""].join(" "),
    tr: dense
      ? "border-b border-default/60 [&:not(:has(~tr:not([data-next-page-foot])))]:border-b-0 data-[selectable=true]:cursor-pointer data-[selectable=true]:hover:bg-elevated/50 data-[selectable=true]:active:bg-accented/50 focus-inset"
      : "border-b border-default [&:not(:has(~tr:not([data-next-page-foot])))]:border-b-0 data-[selectable=true]:cursor-pointer data-[selectable=true]:hover:bg-elevated/50 data-[selectable=true]:active:bg-accented/50 focus-inset"
  };
});

// A heading is not a row to press; the screen is handed its own row and where it stands in its data.
function select(_event: Event, row: TableRow<T>): void {
  if (headingOf(row.original) !== null) return;

  const original = row.original as T;

  emit("select", original, sectioned.value ? props.data.indexOf(original) : row.index);
}

// A row that has focus is pressed with Enter as well as with a pointer.
function enter(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;

  if (props.selectable && target?.matches('tbody tr[role="button"]')) {
    event.preventDefault();
    target.click();
  }
}
</script>
