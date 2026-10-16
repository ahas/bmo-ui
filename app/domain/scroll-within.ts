// Bringing an element into view by moving the one scroller it stands in, and nothing around it.
//
// The browser's own scrollIntoView scrolls every ancestor that can be scrolled, a clipped one
// included. Inside a fixed frame that clips, that is the frame itself: an element the scroller
// cannot bring all the way to its top — a heading near the end of the text — is carried the rest
// of the way by scrolling the fixed frame, which pushes the bars off the top of the screen and
// leaves the layout standing crooked until the page is reloaded. So a part that scrolls on its own
// is moved by setting its own offset, and the frame is never touched.

type Block = "start" | "center";

// The nearest ancestor that scrolls vertically on its own. A clipped box is not one: it can be
// scrolled by a script but is never meant to be.
function scrollerOf(element: Element): HTMLElement | null {
  for (let at = element.parentElement; at !== null; at = at.parentElement) {
    const overflow = getComputedStyle(at).overflowY;

    if ((overflow === "auto" || overflow === "scroll") && at.scrollHeight > at.clientHeight) return at;
  }

  return null;
}

// The offset the scroller is to stand at for the element to sit where it was asked, capped by how
// far the scroller can go. The element's own scroll margin is kept, as the browser would keep it.
export function offsetFor(
  block: Block,
  element: { top: number; height: number; margin: number },
  scroller: { top: number; scrollTop: number; clientHeight: number; scrollHeight: number }
): number {
  const within = element.top - scroller.top + scroller.scrollTop;
  const wanted = block === "start" ? within - element.margin : within + element.height / 2 - scroller.clientHeight / 2;

  return Math.max(0, Math.min(wanted, scroller.scrollHeight - scroller.clientHeight));
}

export function scrollWithin(element: Element, block: Block, behavior: ScrollBehavior = "auto"): void {
  const scroller = scrollerOf(element);

  if (scroller === null) return;

  const box = element.getBoundingClientRect();
  const frame = scroller.getBoundingClientRect();
  const margin = Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
  const top = offsetFor(
    block,
    { top: box.top, height: box.height, margin },
    { top: frame.top + scroller.clientTop, scrollTop: scroller.scrollTop, clientHeight: scroller.clientHeight, scrollHeight: scroller.scrollHeight }
  );

  scroller.scrollTo({ top, behavior });
}
