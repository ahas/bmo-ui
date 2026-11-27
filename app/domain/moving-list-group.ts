// A moving list as a component, which `MovingList` is (`docs/design.md`, "Motion"): written here as a render
// function so the list reads its own items and judges every change to them where they stand in it.
import { TransitionGroup, defineComponent, h, onBeforeUpdate, onUpdated, ref } from "vue";

import { MOVING_LIST, NO_PAGE_MOVES, UNFOLDING_LIST, listSlides } from "./moving-list";

import type { ComponentPublicInstance, PropType, SlotsType, VNode } from "vue";

/** The moving list as a component (`MovingList`), its items sliding within the list and its first page fading in. */
export const MovingListGroup = defineComponent({
  name: "MovingList",
  props: {
    tag: { type: String, default: "ul" },
    // How items put at its end with nothing standing after them come: standing at once, as a page
    // read in does, or unfolding, as a list whose every item is an arrival of its own.
    filling: { type: String as PropType<"stands" | "unfolds">, default: "stands" }
  },
  // Its items, each keyed by its own lasting id.
  slots: Object as SlotsType<{ default?: () => VNode[] }>,
  setup(props, { slots }) {
    const group = ref<ComponentPublicInstance | null>(null);
    const slides = listSlides(() => (group.value?.$el as Element | undefined) ?? null);

    // The items are read in this component's own render, so every change to them updates it, and where they
    // stood is read before the change and judged after it.
    onBeforeUpdate(slides.before);
    onUpdated(slides.after);

    return () => {
      const items = slots.default?.();

      return h(
        TransitionGroup,
        { ref: group, tag: props.tag, ...(props.filling === "unfolds" ? UNFOLDING_LIST : MOVING_LIST), moveClass: NO_PAGE_MOVES },
        { default: () => items }
      );
    };
  }
});
