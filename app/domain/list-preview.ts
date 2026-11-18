import { computed, ref } from "vue";

import type { Ref } from "vue";

// What a preview beside a list of choices stands in while the list is open: the item under the
// pointer or the keyboard, and the chosen one otherwise (`docs/components.md`, "Choosing a value").
// Each item carries its value on the attribute below. The one select highlights an item without
// moving the focus, and hands the item it highlights to whoever hears its highlight; a list that
// moves its focus onto the item one rests on is heard on its own element instead, as the focus
// moves between its items, the library passing what it does not read on to that element.
export const PREVIEW_ITEM = "data-preview-item";

export interface ListPreview {
  // The value the preview stands in.
  shown: Readonly<Ref<string>>;
  // What the list's element is handed, to hear the focus move.
  list: Record<string, unknown>;
  // Told of the item a select highlights without moving the focus.
  onHighlight: (highlighted: HighlightedItem | undefined) => void;
  // Told when the list opens or closes.
  onOpen: (open: boolean) => void;
}

// What a select says of the item it highlights: the item's element among what it says.
export interface HighlightedItem {
  ref?: Element | null;
}

// The value of the item a focus or a highlight landed on, or null where it landed on none. Only an
// item is read: a closing list hands the focus to its own element on a touch screen, which holds
// every item, and reading the first of them there would leave the preview on an item nobody rests on.
function itemValue(target: EventTarget | null): string | null {
  const item = target instanceof Element ? target.closest('[role="option"]') : null;

  return item?.querySelector<HTMLElement>(`[${PREVIEW_ITEM}]`)?.getAttribute(PREVIEW_ITEM) ?? null;
}

export function useListPreview(chosen: Readonly<Ref<string>>): ListPreview {
  const open = ref(false);
  const highlighted = ref<string | null>(null);

  function rest(on: EventTarget | null | undefined): void {
    const value = itemValue(on ?? null);

    if (open.value && value !== null) {
      highlighted.value = value;
    }
  }

  return {
    shown: computed(() => highlighted.value ?? chosen.value),
    list: { onFocusin: (event: FocusEvent) => rest(event.target) },
    onHighlight: (item) => rest(item?.ref),
    onOpen: (now) => {
      open.value = now;

      if (!now) {
        highlighted.value = null;
      }
    }
  };
}
