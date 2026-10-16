import type { Ref } from "vue";

import { HOLD_MS, followSurface, useLongPress } from "./longpress";

// Choosing rows of a list by a held finger: a long press picks the row under it, and a finger that
// goes on to move picks every row between that one and the one it is over now. Moving back gives
// the passed rows up again, since the range is worked out afresh from what was chosen before the
// finger went down.

// What is chosen while the finger stands over `current`: what was chosen before, and the run of rows
// from the anchor to it, either way up. A row the list does not hold adds nothing.
export function draggedSelection(
  keys: readonly string[],
  before: ReadonlySet<string>,
  anchor: string,
  current: string
): Set<string> {
  const chosen = new Set(before);
  const from = keys.indexOf(anchor);
  const to = keys.indexOf(current);

  if (from === -1 || to === -1) {
    return chosen;
  }

  for (const key of keys.slice(Math.min(from, to), Math.max(from, to) + 1)) {
    chosen.add(key);
  }

  return chosen;
}

// How far the list scrolls in one frame while the finger stands near its top or bottom edge: nothing
// outside the band, and faster the deeper into it.
export function edgeScroll(y: number, top: number, bottom: number, band: number, fastest: number): number {
  if (y < top + band) {
    return -Math.ceil((fastest * Math.min(band, top + band - y)) / band);
  }

  if (y > bottom - band) {
    return Math.ceil((fastest * Math.min(band, y - (bottom - band))) / band);
  }

  return 0;
}

// The whole of that gesture, for any list that chooses more than one row. It is one mechanism and
// not one per screen: a list with a multiple choice is dragged through the same way wherever it
// stands, and a screen that wrote its own would drift from the others in what a drag chooses and
// whether the list follows the finger at its edge. When a finger is holding at all is the one long
// press of the longpress module, which menus share with lists.
//
// Choosing is not one drag. A list already choosing is held again wherever the finger comes down:
// that row is chosen, everything chosen before it stays, and the drag carries on from there. So a
// selection is built in as many holds as the reader needs, scrolling between them, rather than in
// the single sweep the first hold began.
//
// What the screen keeps for itself is its policy: which rows may be held at all, and what a hold
// means there — a list not yet choosing enters choosing, one already choosing adds the row. The
// drag and the edge are here.

// The band at the top and bottom of the list the finger drags the list along in, and how far it
// carries it in one frame at the deepest.
const EDGE_BAND_PX = 64;
const EDGE_SPEED_PX = 18;
// The click a lifted finger may still send after a hold belongs to the hold, not to the row. It is
// the click of that one touch or none: a hold the finger lifts where it held sends one, a hold that
// went on to drag sends none, and either way the next finger to land is a press of its own. So the
// window closes when the next touch starts as well as when this runs out — a window left standing
// over the next touch would swallow its tap, and a row a drag gave back would take two presses.
const AFTER_HOLD_MS = 600;

// What a press on a row is: the list's to read as a hold, the browser's own — a hold on the words
// of a row already chosen, which selects them — or nothing at all.
export type PressKind = "hold" | "browser" | "none";

export interface DragSelectList {
  // Where the touches are listened for, and the element those rows scroll in. They are often not
  // the same element: a list scrolls in its container and its rows stand in a box inside it.
  surface: () => HTMLElement | null;
  scroller: () => HTMLElement | null;
  // The attribute a row carries its key in, and the attribute that marks a row as one that may be
  // chosen at all. A list where every row may be chosen names no second attribute.
  rowMark: string;
  choosableMark?: string;
  // The keys of the rows now standing, in the order they stand in.
  keys: () => readonly string[];
  // What is chosen. The drag reads it and writes it.
  selected: Ref<Set<string>>;
  // Whether this row's press is a hold of the list's. Nothing said, every row may be held.
  press?: (key: string) => PressKind;
  // The row was held. The screen enters choosing and leaves chosen what was chosen with this row
  // added; what it hands back is awaited, so a screen that moves the rows to make room for the
  // marks can put the held row back under the finger before the drag reads a height.
  hold: (key: string) => void | Promise<void>;
}

export function useDragSelect(list: DragSelectList): void {
  // When a finger landed on a row whose hold is the browser's own.
  let wordsHeldFrom: number | null = null;
  let drag: { anchor: string; before: Set<string>; y: number } | null = null;
  let edgeFrame = 0;
  let heldUntil = 0;

  const rowSelector = list.choosableMark === undefined ? `[${list.rowMark}]` : `[${list.rowMark}][${list.choosableMark}]`;

  function rowAt(target: EventTarget | null): HTMLElement | null {
    return target instanceof Element ? target.closest<HTMLElement>(rowSelector) : null;
  }

  function keyOf(row: HTMLElement): string {
    return row.getAttribute(list.rowMark) ?? "";
  }

  function kindOf(row: HTMLElement): PressKind {
    return list.press === undefined ? "hold" : list.press(keyOf(row));
  }

  // The row standing at a height of the screen, read by height alone: a finger between two rows,
  // or over whatever stands at the foot of the list, is still over the one above.
  function rowAtHeight(y: number): string | null {
    let found: string | null = null;

    for (const row of list.scroller()?.querySelectorAll<HTMLElement>(rowSelector) ?? []) {
      if (row.getBoundingClientRect().top > y) {
        break;
      }

      found = keyOf(row);
    }

    return found;
  }

  function chooseUnderFinger(): void {
    if (drag === null) {
      return;
    }

    const key = rowAtHeight(drag.y);

    if (key !== null) {
      list.selected.value = draggedSelection(list.keys(), drag.before, drag.anchor, key);
    }
  }

  function scrollAtEdge(): void {
    const element = list.scroller();

    if (drag === null || element === null) {
      edgeFrame = 0;

      return;
    }

    const box = element.getBoundingClientRect();
    const step = edgeScroll(drag.y, box.top, box.bottom, EDGE_BAND_PX, EDGE_SPEED_PX);

    if (step !== 0) {
      element.scrollTop += step;
      chooseUnderFinger();
    }

    edgeFrame = requestAnimationFrame(scrollAtEdge);
  }

  async function fire(key: string, y: number): Promise<void> {
    heldUntil = Date.now() + AFTER_HOLD_MS;

    // What the drag builds on: what was chosen before the finger went down, together with the row
    // held — which is what the screen's answer to the hold leaves chosen. It is worked out here
    // rather than read back from the screen afterwards, because a list whose selection travels to
    // it as a property does not hold the answer yet on the turn the hold is given.
    drag = { anchor: key, before: new Set([...list.selected.value, key]), y };

    await list.hold(key);
  }

  // A row the list reads a hold on is held where the finger landed once the long press fires.
  useLongPress({
    surface: list.surface,
    press: (target, at) => {
      const row = rowAt(target);

      if (row === null || kindOf(row) !== "hold") {
        return null;
      }

      const key = keyOf(row);

      return () => void fire(key, at.y);
    }
  });

  function onTouchStart(event: TouchEvent): void {
    wordsHeldFrom = null;
    heldUntil = 0;

    const row = rowAt(event.target);

    if (event.touches.length === 1 && row !== null && kindOf(row) === "browser") {
      wordsHeldFrom = Date.now();
    }
  }

  function onTouchMove(event: TouchEvent): void {
    const touch = event.touches[0];

    if (touch === undefined || drag === null) {
      return;
    }

    event.preventDefault();
    drag.y = touch.clientY;
    chooseUnderFinger();

    if (edgeFrame === 0) {
      edgeFrame = requestAnimationFrame(scrollAtEdge);
    }
  }

  function onTouchEnd(): void {
    // A hold on the words of a chosen row was the browser's selection, and the click it may still
    // send is not a tap on the row.
    if (wordsHeldFrom !== null && Date.now() - wordsHeldFrom >= HOLD_MS) {
      heldUntil = Date.now() + AFTER_HOLD_MS;
    }

    wordsHeldFrom = null;

    if (drag !== null) {
      drag = null;
      heldUntil = Date.now() + AFTER_HOLD_MS;
    }

    cancelAnimationFrame(edgeFrame);
    edgeFrame = 0;
  }

  function onClickAfterHold(event: MouseEvent): void {
    if (Date.now() < heldUntil) {
      event.preventDefault();
      event.stopPropagation();
      heldUntil = 0;
    }
  }

  followSurface(
    list.surface,
    (surface) => {
      surface.addEventListener("touchstart", onTouchStart, { passive: true });
      surface.addEventListener("touchmove", onTouchMove, { passive: false });
      surface.addEventListener("touchend", onTouchEnd);
      surface.addEventListener("touchcancel", onTouchEnd);
      surface.addEventListener("click", onClickAfterHold, true);
    },
    (surface) => {
      surface.removeEventListener("touchstart", onTouchStart);
      surface.removeEventListener("touchmove", onTouchMove);
      surface.removeEventListener("touchend", onTouchEnd);
      surface.removeEventListener("touchcancel", onTouchEnd);
      surface.removeEventListener("click", onClickAfterHold, true);
      onTouchEnd();
    }
  );
}
