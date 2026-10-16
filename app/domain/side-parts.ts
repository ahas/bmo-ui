// How a side part of a screen stands: beside the body behind a splitter on a wide screen, and up
// from the bottom edge on a phone.

// The boundary a splitter draws between two parts: a hairline, and the room a hand aims at around
// it. The handle takes only the hairline's own pixel in the layout, so the parts on either side reach
// the line itself and leave no strip beside it; the grab room is drawn over their edges instead, a
// few pixels each way, so thinning what is seen does not thin what can be grabbed. Nothing is placed
// with a transform: a shifted line lands between device pixels and is drawn across two of them,
// which reads as a doubled edge.
export const SPLIT_HANDLE = [
  "before:absolute before:inset-0 before:bg-accented before:transition-colors after:absolute after:z-10",
  "data-[state=hover]:before:bg-primary data-[state=drag]:before:bg-primary",
  "data-[orientation=horizontal]:w-px data-[orientation=horizontal]:after:inset-y-0 data-[orientation=horizontal]:after:-inset-x-1",
  "data-[orientation=vertical]:h-px data-[orientation=vertical]:after:inset-x-0 data-[orientation=vertical]:after:-inset-y-1"
].join(" ");

// A side part risen from the bottom edge of a phone: the part reaches the sheet's edges and keeps its
// own padding, so its lists scroll at the sheet's edge as they do beside the body.
export const FULL_SHEET = {
  content: "h-[75dvh]",
  container: "min-h-0 flex-1 p-0 gap-0 overflow-hidden",
  header: "border-b border-default px-4 py-3",
  body: "flex min-h-0 flex-1 flex-col"
};
