// How the shared table stands, stated once for the table and for the place it keeps while its rows
// are read. The box, the head's cell and the height of a row are the same in both, so the
// placeholder takes the table's shape and nothing moves when the rows land.

export type TableLayout = "fill" | "own" | "dense";

// The box the rows scroll in, and the table's own width inside it. The table is never narrower than
// a readable width, so at a phone's width the box scrolls sideways instead of squeezing a column
// until its name is cut.
export const TABLE_BOX: Record<TableLayout, { root: string; base: string }> = {
  fill: { root: "min-h-0 min-w-0 flex-1 overflow-auto", base: "w-full min-w-[36rem]" },
  own: { root: "min-w-0 overflow-x-auto", base: "w-full min-w-[36rem]" },
  dense: { root: "min-h-0 overflow-auto", base: "min-w-full" }
};

// A column's name. The dense grid packs its names into one line and cuts a long one; the other two
// layouts keep every name whole and let the box scroll.
export const TABLE_HEAD: Record<"own" | "dense", string> = {
  own: "relative px-2 py-2 text-start text-sm font-medium whitespace-nowrap text-highlighted first:ps-4 last:pe-4",
  dense: "relative truncate py-1 ps-2 pe-4 text-start text-sm font-medium whitespace-nowrap text-highlighted"
};

// A row's own height, before a cell with more to say grows past it.
export const TABLE_ROW_HEIGHT: Record<"own" | "dense", string> = { own: "h-12", dense: "h-7" };
