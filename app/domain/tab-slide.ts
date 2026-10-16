import { onUpdated, ref, watch } from "vue";

import type { Ref } from "vue";

// Which way a tab's panel slides (`docs/design.md`, "Motion"): forward where the tab now shown
// stands after the one before it in the tab order, back where it stands before it, and nowhere
// where the panel changed with the tab standing where it was — the same tab read for another place
// is a different list, and stands at once.
export type SlideDirection = "forward" | "back";

export function slideDirection(now: number, was: number): SlideDirection | null {
  return now > was ? "forward" : now < was ? "back" : null;
}

// The direction for the component drawing the panel. It is read before that component draws again,
// so the panel the tab brings is drawn with it, and it is spent on that drawing, so a later change of
// panel with no change of tab moves nothing.
export function useSlideDirection(at: () => number): Ref<SlideDirection | null> {
  const direction = ref<SlideDirection | null>(null);

  watch(at, (now, was) => {
    direction.value = slideDirection(now, was);
  }, { flush: "pre" });

  onUpdated(() => {
    direction.value = null;
  });

  return direction;
}
