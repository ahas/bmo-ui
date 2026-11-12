<template>
  <!-- The close of a modal or a side sheet, in the component library's own place and look, an icon
       button named like every other — on hover, by a finger held on it, and by the keyboard when it
       reaches here — never by the focus a dialog takes up on it as it opens, and ringed only where a
       key moved the focus (`docs/components.md`, "Actions and the toolbar" and "Tooltips"). -->
  <IconButton
    :label="$t('common.action.close')"
    :icon="appConfig.ui.icons.close"
    :keyboard-focus="keyboardFocus"
    :data-pressed-focus="pressedFocus || undefined"
    @click="emit('close')"
    @focus="onFocused"
    @focusout="pressedFocus = false"
  />
</template>

<script setup lang="ts">
import { MODALITY_ATTRIBUTE } from "../domain/modality";

// What a dialog or a sheet stands as to assistive technology, and so to this button.
const DIALOG_SELECTOR = "[role=dialog], [role=alertdialog]";

const emit = defineEmits<{ close: [] }>();
const appConfig = useAppConfig();
// Whether the focus standing here came with no key moving it, where the browser may still ring it.
const pressedFocus = ref(false);

// The focus a dialog takes up on this button as it opens is the dialog's, whichever hand opened it,
// and a name then standing over the dialog takes the first Esc for itself. The browser's
// visible-focus tell cannot say so: it carries over from whatever the page last showed focused, so a
// press on a control the keyboard had reached hands it on to the arrival. A focus is the keyboard's
// here only where the page's modality mark (`docs/design.md`, "Focus") names the keyboard and the
// focus came from a control of the same dialog, and the shared tooltip is told so in place of that
// tell. The same carried tell rings the button after a press, so a focus no key moved draws no ring
// here until it leaves; a dialog a key opened keeps its ring.
function keyboardFocus(event: FocusEvent): boolean {
  return event.target instanceof HTMLElement && keyboardArrival(event.target, event.relatedTarget);
}

function onFocused(event: FocusEvent): void {
  if (!keyboardFocus(event)) pressedFocus.value = !keyMoved();
}

function keyMoved(): boolean {
  return document.documentElement.getAttribute(MODALITY_ATTRIBUTE) === "key";
}

function keyboardArrival(target: HTMLElement, from: EventTarget | null): boolean {
  if (!keyMoved()) return false;

  const dialog = target.closest(DIALOG_SELECTOR);

  return dialog === null || (from instanceof Node && dialog.contains(from));
}
</script>
