// How an item of a moving list comes and goes (`docs/design.md`, "Motion"): by its box alone, along
// the list's own axis, never by a fade. An item that comes unfolds from nothing where it lands, one
// that goes folds to nothing where it stood, and the items around it close up as it does. The hooks
// hand the item its sizes; the list's stylesheet names how long the change takes and how it eases,
// and the list waits for that transition to end, since each hook takes the element alone.
//
// A box keeps its padding and border under any height of its own, so folding means those too. In a
// column with a gap the item is also led or followed by that gap, so the side the gap stands on — the
// one before the item, unless nothing stands before it — takes it back in with a margin, and the
// items around it end where they would have stood without it. What the item shows stays laid out at
// its full size throughout, clipped by the box.

type Fold = Partial<Record<"height" | "paddingTop" | "paddingBottom" | "borderTopWidth" | "borderBottomWidth" | "marginTop" | "marginBottom", string>>;

const STANDING: Fold = { height: "", paddingTop: "", paddingBottom: "", borderTopWidth: "", borderBottomWidth: "", marginTop: "", marginBottom: "" };

// What an item stands at with nothing of it left.
function folded(item: HTMLElement): Fold {
  const parent = item.parentElement;
  const gap = parent === null ? 0 : Number.parseFloat(getComputedStyle(parent).rowGap) || 0;
  const flat: Fold = { height: "0px", paddingTop: "0px", paddingBottom: "0px", borderTopWidth: "0px", borderBottomWidth: "0px" };

  if (gap === 0) {
    return flat;
  }

  if (item.previousElementSibling !== null) {
    return { ...flat, marginTop: `-${gap}px` };
  }

  return item.nextElementSibling === null ? flat : { ...flat, marginBottom: `-${gap}px` };
}

// Called with the item just put in at its full size: it starts from nothing and grows back to that.
// It is put at nothing with no transition running, since a padding sent to nothing and straight back
// would only reverse a movement just begun, which the browser cuts as short as that movement had run.
export function unfoldItem(element: Element): void {
  const item = element as HTMLElement;
  const height = item.offsetHeight;

  item.style.transition = "none";
  Object.assign(item.style, folded(item));
  void item.offsetHeight;
  item.style.transition = "";
  Object.assign(item.style, STANDING);
  item.style.height = `${height}px`;
}

// Called once it has unfolded: it is left to its own size again.
export function settleItem(element: Element): void {
  Object.assign((element as HTMLElement).style, STANDING);
}

// Called with the item about to go: it shrinks to nothing from the size it stands at now.
export function foldItem(element: Element): void {
  const item = element as HTMLElement;

  item.style.height = `${item.offsetHeight}px`;
  void item.offsetHeight;
  Object.assign(item.style, folded(item));
}
