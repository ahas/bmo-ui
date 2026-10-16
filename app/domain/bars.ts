// What a segmented bar wears. There is more than one of them — how long a piece of work took, what
// a whole divided into — and they are the same picture: one track cut into shares, with the parts
// named under it. What that picture looks like is said here once and read from here by each place
// that draws one, because a look written out again in every component is a look that drifts the
// first time one of them is touched, and two bars on two screens that nearly match read as two
// different things rather than one.

// The colours a segment may wear. They are the theme's own names and nothing else: a name the
// theme does not carry is not refused, it is taken for a CSS colour and painted on, so a
// misspelling comes out as a shade nobody chose rather than as a complaint. Naming the set here
// is what makes the compiler answer for that.
export type BarColor = "primary" | "secondary" | "success" | "info" | "warning" | "error" | "neutral";

// How thick the track stands. Thin: the figures are in the legend under it, and the track is
// there to answer how much of the whole a part is at a glance rather than to be read for a
// number.
export const BAR_SIZE = "sm" as const;

// The legend as a column, one part to a row with its figure pushed to the far end. This is the
// shape a block standing under a paragraph wants — the rows line up under one another and the
// figures line up with them — and it is the theme's own shape, tightened to the size the text
// around such a block reads at.
export const STACKED_LEGEND = {
  root: "gap-1",
  list: "text-sm gap-1",
  itemTrailing: "tabular-nums"
};

// The legend laid across the line, for a place that has one line to spare rather than one row
// per part. The parts run along and wrap when they run out of room, and each figure stands next
// to the word it belongs to: pushing a figure to the far end is what makes a column of rows
// readable, and it is exactly what ruins a row of parts, where the far end belongs to somebody
// else's word.
export const INLINE_LEGEND = {
  root: "gap-1",
  list: "flex-row flex-wrap gap-2 text-sm",
  itemTrailing: "ms-0 tabular-nums"
};

// The same legend where the line it stands on is a row of a list rather than a block of its own,
// and a phone's width leaves that row a hundred-odd pixels. Four parts laid across that wrap to
// four lines, which turns every row of a list into a paragraph; below the small breakpoint, the
// track stands alone. Nothing is lost by it — the track is the picture, which is what a glance down
// a list is for, and a screen that folds it keeps the figures behind it within one press.
export const FOLDED_LEGEND = {
  ...INLINE_LEGEND,
  list: `hidden sm:flex ${INLINE_LEGEND.list}`
};
