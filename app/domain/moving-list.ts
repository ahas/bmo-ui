// How an item of a moving list comes and goes (`docs/design.md`, "Motion"): by its box alone, along
// the list's own axis, never by a fade. An item that comes unfolds from nothing where it lands, one
// that goes folds to nothing where it stood, and the items around it close up as it does. The hooks
// hand the item its sizes; the list's stylesheet names how long the change takes and how it eases,
// and the list waits for that transition to end, since each hook takes the element alone.
//
// The axis is the list's own layout: a flex row lays its items out sideways, so they fold sideways;
// every other list is a column. A box keeps its padding and border under any size of its own, so
// folding means those too, on the axis's two sides. What stands between two items — the list's gap,
// or a margin an item carries, an overlap drawn as a negative one included — is taken back by the
// folding item's margins on the axis, so the items around it end where they would have stood
// without it. What the item shows stays laid out at its full size throughout, clipped by the box.

import type { TransitionGroupProps } from "vue";

type Side = "Top" | "Bottom" | "InlineStart" | "InlineEnd";

// One axis of a list: the size an item has along it, and its two sides in the order the list's
// items follow one another, the leading side being the one the item before it stands on.
interface Axis {
  size: "height" | "width";
  measure: (item: HTMLElement) => number;
  gap: (list: CSSStyleDeclaration) => string;
  leading: Side;
  trailing: Side;
}

type Fold = Record<string, string>;

const COLUMN: Axis = { size: "height", measure: (item) => item.offsetHeight, gap: (list) => list.rowGap, leading: "Top", trailing: "Bottom" };
const COLUMN_REVERSED: Axis = { ...COLUMN, leading: "Bottom", trailing: "Top" };
const ROW: Axis = { size: "width", measure: (item) => item.offsetWidth, gap: (list) => list.columnGap, leading: "InlineStart", trailing: "InlineEnd" };
const ROW_REVERSED: Axis = { ...ROW, leading: "InlineEnd", trailing: "InlineStart" };

function axisOf(list: Element | null): Axis {
  if (list === null) {
    return COLUMN;
  }

  const style = getComputedStyle(list);
  const flex = style.display === "flex" || style.display === "inline-flex";

  switch (flex ? style.flexDirection : "column") {
    case "row":
      return ROW;
    case "row-reverse":
      return ROW_REVERSED;
    case "column-reverse":
      return COLUMN_REVERSED;
    default:
      return COLUMN;
  }
}

// Everything a fold sets on an item: its size along the axis, and its padding, border and margin
// on the axis's two sides.
function folding(axis: Axis): { box: string[]; leadingMargin: string; trailingMargin: string } {
  const sides = [axis.leading, axis.trailing];

  return {
    box: [axis.size, ...sides.flatMap((side) => [`padding${side}`, `border${side}Width`])],
    leadingMargin: `margin${axis.leading}`,
    trailingMargin: `margin${axis.trailing}`
  };
}

// Every value a fold sets, handed back to the stylesheet.
function standing(axis: Axis): Fold {
  const { box, leadingMargin, trailingMargin } = folding(axis);

  return Object.fromEntries([...box, leadingMargin, trailingMargin].map((key) => [key, ""]));
}

function folded(axis: Axis, item: HTMLElement, gap: number): Fold {
  const { box, leadingMargin, trailingMargin } = folding(axis);
  const at = (leading: number, trailing: number): Fold => ({
    ...Object.fromEntries(box.map((key) => [key, "0px"])),
    [leadingMargin]: `${leading}px`,
    [trailingMargin]: `${trailing}px`
  });

  // With an item before it, the list keeps the space before the one after it, so the folding item
  // gives back the gap before it and sets its own margins aside.
  if (item.previousElementSibling !== null) {
    return at(-gap, 0);
  }

  const next = item.nextElementSibling;

  if (next === null) {
    return at(0, 0);
  }

  // Standing first, it gives back the space after it: the gap, and the leading margin of the item
  // after it, which that item sets aside once it stands first.
  const nextStyle = getComputedStyle(next) as unknown as Record<string, string>;
  const nextLeading = Number.parseFloat(nextStyle[leadingMargin] ?? "") || 0;

  return at(0, -(gap + nextLeading));
}

// What an item stands at with nothing of it left, along its list's axis.
function foldOf(item: HTMLElement): { axis: Axis; fold: Fold } {
  const list = item.parentElement;
  const axis = axisOf(list);
  const gap = list === null ? 0 : Number.parseFloat(axis.gap(getComputedStyle(list))) || 0;

  return { axis, fold: folded(axis, item, gap) };
}

// Called with the item just put in at its full size: it starts from nothing and grows back to that.
// It is put at nothing with no transition running, since a padding sent to nothing and straight back
// would only reverse a movement just begun, which the browser cuts as short as that movement had run.
export function unfoldItem(element: Element): void {
  const item = element as HTMLElement;
  const { axis, fold } = foldOf(item);
  const size = axis.measure(item);

  item.style.transition = "none";
  Object.assign(item.style, fold);
  void item.offsetHeight;
  item.style.transition = "";
  Object.assign(item.style, standing(axis));
  item.style[axis.size] = `${size}px`;
}

// Called once it has unfolded: it is left to its own size again, on either axis.
export function settleItem(element: Element): void {
  const item = element as HTMLElement;

  Object.assign(item.style, standing(COLUMN), standing(ROW));
}

// Called with the item about to go: it shrinks to nothing from the size it stands at now.
export function foldItem(element: Element): void {
  const item = element as HTMLElement;
  const { axis, fold } = foldOf(item);

  item.style[axis.size] = `${axis.measure(item)}px`;
  void item.offsetHeight;
  Object.assign(item.style, fold);
}

// What a transition group is handed to move as a moving list: the list's stylesheet name and the
// three hooks. `MovingList` hands it to its own group, and a list the component library draws itself
// is handed it where the library takes a transition group's props for its list.
export const MOVING_LIST = { name: "bmo-list", onEnter: unfoldItem, onAfterEnter: settleItem, onLeave: foldItem } as const satisfies TransitionGroupProps;

// What the same transition group is handed while its list is to change at once: a name no stylesheet
// moves, and no hooks, so its items come, go and change places with no movement while it stays drawn.
export const STANDING_LIST = { name: "bmo-list-standing" } as const satisfies TransitionGroupProps;
