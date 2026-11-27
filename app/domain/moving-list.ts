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

// Whether an item came as part of the list filling or lengthening: every item after it came with it,
// as the first page read into an empty list and the next page put at its end do, an item on its way out
// counting for none. The items coming in one change all carry the group's enter class, or the mark the
// hook left on the ones it already let stand, by the time each of them is handed here.
export function cameWithTheRest(item: Element): boolean {
  for (let after = item.nextElementSibling; after !== null; after = after.nextElementSibling) {
    if (!cameNow(after) && !leaving(after)) return false;
  }

  return true;
}

// The mark an item that came with the rest keeps until the next frame: the group hands the items of one change to
// its hook one by one, the last first, and a sibling already let stand still counts as coming with it.
const CAME = "bmo-list-came";

// Whether an item comes in this very change: still carrying the group's enter class, or already let stand or set
// fading in by the hook a moment before.
function cameNow(item: Element): boolean {
  return item.classList.contains("bmo-list-enter-active") || item.classList.contains(CAME) || item.classList.contains("bmo-list-arrive");
}

// Whether an item is on its way out of the list: it stands in it only while it folds, so an item coming beside it
// is judged as though it were gone, as a list read afresh in place of what it held is a first page.
function leaving(item: Element): boolean {
  return item.classList.contains("bmo-list-leave-active");
}

// Called with the item just put in at its full size: it starts from nothing and grows back to that.
// It is put at nothing with no transition running, since a padding sent to nothing and straight back
// would only reverse a movement just begun, which the browser cuts as short as that movement had run.
// It takes one argument alone: a hook naming a second would have Vue wait on that callback rather than on the
// stylesheet's own transition ending.
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

// The most steps the first page's items wait one after another before the rest fade in together.
const ARRIVE_STEPS = 8;

// Whether an item is the first page read into a list that held none: every item before it fades in as part
// of the same page, or is still coming with it. Where the steps count from is its place among them.
function arrivalStep(item: Element): number | null {
  let step = 0;

  for (let before = item.previousElementSibling; before !== null; before = before.previousElementSibling) {
    if (leaving(before)) continue;

    if (!cameNow(before)) return null;

    step += 1;
  }

  return step;
}

// Called with the item just put in a list read a page at a time (docs/design.md, "Motion"): one that came
// with the rest, as a page filling or lengthening the list, stands where it lands with no movement, the first
// page read into an empty list fading in from its top item down, and any other unfolds. A standing item is left
// at its own size and stops reading as coming at once, so a change right after it judges it as standing.
export function standOrUnfoldItem(element: Element): void {
  if (cameWithTheRest(element)) {
    const step = arrivalStep(element);

    element.classList.remove("bmo-list-enter-from", "bmo-list-enter-active", "bmo-list-enter-to");
    element.classList.add(CAME);
    requestAnimationFrame(() => element.classList.remove(CAME));

    if (step !== null) {
      const item = element as HTMLElement;

      item.style.setProperty("--bmo-list-arrive-step", String(Math.min(step, ARRIVE_STEPS)));
      item.classList.add("bmo-list-arrive");
      item.addEventListener(
        "animationend",
        () => {
          item.classList.remove("bmo-list-arrive");
          item.style.removeProperty("--bmo-list-arrive-step");
        },
        { once: true }
      );
    }

    return;
  }

  unfoldItem(element);
}

// Where each item of a list stands within the list's own box, so a list the page moves as a whole moves none of
// its items.
function placesIn(list: Element): Map<Element, { x: number; y: number }> {
  const box = list.getBoundingClientRect();

  return new Map(
    Array.from(list.children).map((item) => {
      const at = item.getBoundingClientRect();

      return [item, { x: at.left - box.left, y: at.top - box.top }];
    })
  );
}

// An item that stayed slid from where it stood in its list to where it stands now: it is put back where it
// was with no transition running, then let go under the list's move class.
function slide(item: HTMLElement, dx: number, dy: number): void {
  item.style.transition = "none";
  item.style.transform = `translate(${dx}px, ${dy}px)`;
  void item.offsetHeight;
  item.style.transition = "";
  item.classList.add("bmo-list-move");
  item.style.transform = "";

  const done = (event: TransitionEvent): void => {
    if (event.target !== item || event.propertyName !== "transform") return;

    item.removeEventListener("transitionend", done);
    item.classList.remove("bmo-list-move");
  };

  item.addEventListener("transitionend", done);
}

/**
 * The slides of a moving list's items, judged by where each stands within the list rather than on the page
 * (docs/design.md, "Motion"): read where they stand before a change with `before`, and slide the ones that stayed
 * and changed place with `after`. An item coming or going is the enter and leave hooks' and slides here never.
 */
export function listSlides(list: () => Element | null): { before: () => void; after: () => void } {
  let places = new Map<Element, { x: number; y: number }>();

  return {
    before: () => {
      const element = list();

      places = element === null ? new Map() : placesIn(element);
    },
    after: () => {
      const element = list();

      if (element === null) return;

      for (const [item, now] of placesIn(element)) {
        const was = places.get(item);
        const moving = item.classList.contains("bmo-list-enter-active") || item.classList.contains("bmo-list-leave-active");

        if (was === undefined || moving) continue;

        const dx = was.x - now.x;
        const dy = was.y - now.y;

        if (dx !== 0 || dy !== 0) slide(item as HTMLElement, dx, dy);
      }
    }
  };
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

// What a transition group is handed to move as a moving list read a page at a time: the list's
// stylesheet name and the three hooks, a page filling or lengthening it standing at once. `MovingList`
// hands it to its own group by default, and a list the component library draws itself is handed it
// where the library takes a transition group's props for its list.
export const MOVING_LIST = { name: "bmo-list", onEnter: standOrUnfoldItem, onAfterEnter: settleItem, onLeave: foldItem } as const satisfies TransitionGroupProps;

// The move class `MovingList` hands its group in place of the list's own, one no stylesheet moves, so the group
// slides nothing by where its items stand on the page and `listSlides` slides them by where they stand in the list.
export const NO_PAGE_MOVES = "bmo-list-unmoved";

// What the same transition group is handed to move a list whose every item is an arrival of its own:
// every item that comes unfolds, one put at its end included.
export const UNFOLDING_LIST = { ...MOVING_LIST, onEnter: unfoldItem } as const satisfies TransitionGroupProps;

// What the same transition group is handed while its list is to change at once: a name no stylesheet
// moves, and no hooks, so its items come, go and change places with no movement while it stays drawn.
export const STANDING_LIST = { name: "bmo-list-standing" } as const satisfies TransitionGroupProps;
