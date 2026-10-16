import { computed, ref } from "vue";

import type { Ref } from "vue";

// What a preview beside a list of choices stands in while the list is open: the item under the
// pointer or the keyboard, and the chosen one otherwise (`docs/components.md`, "Settings"). The
// list moves its focus onto the item either one rests on, and each item carries its value on the
// attribute below, so the list's own element hears the focus move between its items; the library
// passes what it does not read on to that element.
export const PREVIEW_ITEM = "data-preview-item";

export interface ListPreview {
  // The value the preview stands in.
  shown: Readonly<Ref<string>>;
  // What the list's element is handed, to hear the focus move.
  list: Record<string, unknown>;
  // Told when the list opens or closes.
  onOpen: (open: boolean) => void;
}

// The value of the item a focus landed on, or null where it landed on none. Only an item is read:
// a closing list hands the focus to its own element on a touch screen, which holds every item, and
// reading the first of them there would leave the preview on an item nobody rests on.
function itemValue(target: EventTarget | null): string | null {
  const item = target instanceof Element ? target.closest('[role="option"]') : null;

  return item?.querySelector<HTMLElement>(`[${PREVIEW_ITEM}]`)?.getAttribute(PREVIEW_ITEM) ?? null;
}

export function useListPreview(chosen: Readonly<Ref<string>>): ListPreview {
  const open = ref(false);
  const highlighted = ref<string | null>(null);

  function onFocusin(event: FocusEvent): void {
    const value = itemValue(event.target);

    if (open.value && value !== null) {
      highlighted.value = value;
    }
  }

  return {
    shown: computed(() => highlighted.value ?? chosen.value),
    list: { onFocusin },
    onOpen: (now) => {
      open.value = now;

      if (!now) {
        highlighted.value = null;
      }
    }
  };
}
