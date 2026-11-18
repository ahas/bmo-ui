import { onScopeDispose, ref, watchPostEffect } from "vue";

import type { Ref } from "vue";

// The size a box is held to, taken off what it holds (`docs/components.md`, "A box that follows
// what it holds"). A box told to be as big as its content cannot be animated between two contents —
// there is no number for the browser to move along — so the content is laid inside the box at its
// own size and measured, and the box is given that number.
export interface HeldSize {
  width: number;
  height: number;
  // Whether the content's size is moving of its own: a part of it folding or unfolding, as a
  // moving list's item does. The last size such a movement reaches counts as part of it too, since
  // the movement has ended by the time the box is told that size.
  following: boolean;
}

// The properties a part of the content changes its size by while it folds or unfolds.
const SIZE_PROPERTY = /^(width|height|min-width|min-height|max-width|max-height|inline-size|block-size|flex-basis|padding|margin|border-.*width)/;

// Whether a part of the content is changing its own size by a transition now. A turning mark, a
// colour or a slide changes no size and is not counted.
export function isResizing(content: Element): boolean {
  return content
    .getAnimations({ subtree: true })
    .some((animation) => animation instanceof CSSTransition && SIZE_PROPERTY.test(animation.transitionProperty));
}

// The border box the content lays itself out at, which is the size the box is held to. The content
// stands at that size whatever the box is doing around it: narrower while it unfolds, or still at the
// last content's size while it moves to this one.
export function useHeldSize(content: Readonly<Ref<HTMLElement | null | undefined>>): Readonly<Ref<HeldSize | null>> {
  const size = ref<HeldSize | null>(null);

  if (!import.meta.client) {
    return size;
  }

  // Whether a movement of the content's own size has been seen and has not yet ended. A frame
  // finishes a transition before it lays the page out and tells the observer the size it ends at, so
  // the movement is taken as over only once the frame after its end begins.
  let moving = false;

  const watching = new ResizeObserver(([entry]) => {
    if (entry === undefined) {
      return;
    }

    const box = entry.borderBoxSize?.[0];
    const held = entry.target as HTMLElement;

    moving ||= isResizing(held);

    const following = moving;

    size.value =
      box === undefined
        ? { width: held.offsetWidth, height: held.offsetHeight, following }
        : { width: Math.ceil(box.inlineSize), height: Math.ceil(box.blockSize), following };
  });

  watchPostEffect((onCleanup) => {
    const held = content.value;

    if (held === null || held === undefined) {
      size.value = null;

      return;
    }

    const ended = (): void => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          moving &&= isResizing(held);
        })
      );
    };

    watching.observe(held);
    held.addEventListener("transitionend", ended);
    held.addEventListener("transitioncancel", ended);
    onCleanup(() => {
      watching.unobserve(held);
      held.removeEventListener("transitionend", ended);
      held.removeEventListener("transitioncancel", ended);
    });
  });

  onScopeDispose(() => watching.disconnect());

  return size;
}
