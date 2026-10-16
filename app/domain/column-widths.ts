import type { Ref } from "vue";

// How a table's columns are widened and narrowed by hand. Until the first drag a table lays itself
// out; the first drag holds every column at the width it is drawn at, so the dragged one is the
// only one that moves. A new set of columns starts over at their natural widths.

// How narrow a column may be dragged, and how far one arrow press moves its edge.
export const MIN_COLUMN_PX = 48;
export const RESIZE_STEP_PX = 16;

export interface ColumnWidths {
  widths: Ref<Record<string, number>>;
  // Whether every column is held at a width, which is when the table lays out by them.
  fixed: Ref<boolean>;
  total: Ref<number>;
  startResize: (event: PointerEvent, name: string) => void;
  nudge: (name: string, by: number) => void;
}

// What a table's columns are called, in the order they stand, for anything that has to draw the
// head of a table without the table: a column with no name of its own keeps its place and stands
// blank.
export function tableHeaders(columns: readonly { header?: unknown }[]): string[] {
  return columns.map((column) => (typeof column.header === "string" ? column.header : ""));
}

export function setColumnWidth(widths: Record<string, number>, name: string, width: number): Record<string, number> {
  return { ...widths, [name]: Math.max(MIN_COLUMN_PX, Math.round(width)) };
}

// `names` are the columns in the order they stand; `head` is the header row they are drawn in, one
// cell to a column in the same order.
export function useColumnWidths(names: () => readonly string[], head: () => HTMLElement | null | undefined): ColumnWidths {
  const widths = ref<Record<string, number>>({});
  const fixed = computed(() => names().length > 0 && names().every((name) => widths.value[name] !== undefined));
  const total = computed(() => names().reduce((sum, name) => sum + (widths.value[name] ?? 0), 0));

  watch(
    () => JSON.stringify(names()),
    () => {
      widths.value = {};
    }
  );

  function hold(): void {
    const row = head();

    if (fixed.value || !row) {
      return;
    }

    const cells = [...row.children] as HTMLElement[];

    widths.value = Object.fromEntries(names().map((name, at) => [name, Math.round(cells[at]?.getBoundingClientRect().width ?? MIN_COLUMN_PX)]));
  }

  function nudge(name: string, by: number): void {
    hold();
    widths.value = setColumnWidth(widths.value, name, (widths.value[name] ?? MIN_COLUMN_PX) + by);
  }

  function startResize(event: PointerEvent, name: string): void {
    hold();

    const edge = event.currentTarget as HTMLElement;
    const from = event.clientX;
    const start = widths.value[name] ?? MIN_COLUMN_PX;
    const move = (moved: PointerEvent): void => {
      widths.value = setColumnWidth(widths.value, name, start + moved.clientX - from);
    };
    const end = (): void => {
      edge.removeEventListener("pointermove", move);
      edge.removeEventListener("pointerup", end);
      edge.removeEventListener("pointercancel", end);
    };

    edge.setPointerCapture(event.pointerId);
    edge.addEventListener("pointermove", move);
    edge.addEventListener("pointerup", end);
    edge.addEventListener("pointercancel", end);
  }

  return { widths, fixed, total, startResize, nudge };
}
