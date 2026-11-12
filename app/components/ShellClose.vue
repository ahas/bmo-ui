<template>
  <!-- The close of a modal or a side sheet, in the component library's own place and look, named
       on hover like every icon button and by the keyboard when it reaches here — never by the
       focus a dialog takes up on it as it opens, and ringed only where a key moved the focus
       (`docs/components.md`, "Tab bar and toolbar" and "Tooltips"). -->
  <UTooltip :text="$t('common.action.close')" :ignore-non-keyboard-focus="TOOLTIP_PROVIDER.ignoreNonKeyboardFocus">
    <UButton
      ref="close"
      :data-pressed-focus="pressedFocus || undefined"
      color="neutral"
      variant="ghost"
      :icon="appConfig.ui.icons.close"
      :aria-label="$t('common.action.close')"
      @click="emit('close')"
      @focusout="pressedFocus = false"
    />
  </UTooltip>
</template>

<script setup lang="ts">
import { MODALITY_ATTRIBUTE } from "../domain/modality";
import { TOOLTIP_PROVIDER } from "../domain/tooltip";

import type { ComponentPublicInstance } from "vue";

// What a dialog or a sheet stands as to assistive technology, and so to this button.
const DIALOG_SELECTOR = "[role=dialog], [role=alertdialog]";

const emit = defineEmits<{ close: [] }>();
const appConfig = useAppConfig();
const close = useTemplateRef<ComponentPublicInstance>("close");
// Whether the focus standing here came with no key moving it, where the browser may still ring it.
const pressedFocus = ref(false);

// The focus a dialog takes up on this button as it opens is the dialog's, whichever hand opened it,
// and a name then standing over the dialog takes the first Esc for itself. The browser's
// visible-focus tell cannot say so: it carries over from whatever the page last showed focused, so a
// press on a control the keyboard had reached hands it on to the arrival. A focus is the keyboard's
// here only where the page's modality mark (`docs/design.md`, "Focus") names the keyboard and the
// focus came from a control of the same dialog; any other is stopped before the tooltip's own
// listener sees it. The same carried tell rings the button after a press, so a focus no key moved
// draws no ring here until it leaves; a dialog a key opened keeps its ring.
function onFocused(event: FocusEvent): void {
  const target = button();

  if (target === null || event.target !== target) return;
  if (keyboardArrival(target, event.relatedTarget)) return;

  event.stopPropagation();
  pressedFocus.value = !keyMoved();
}

function keyMoved(): boolean {
  return document.documentElement.getAttribute(MODALITY_ATTRIBUTE) === "key";
}

function keyboardArrival(target: HTMLElement, from: EventTarget | null): boolean {
  if (!keyMoved()) return false;

  const dialog = target.closest(DIALOG_SELECTOR);

  return dialog === null || (from instanceof Node && dialog.contains(from));
}

function button(): HTMLElement | null {
  return (close.value?.$el as HTMLElement | undefined) ?? null;
}

onMounted(() => document.addEventListener("focus", onFocused, true));
onBeforeUnmount(() => document.removeEventListener("focus", onFocused, true));
</script>
