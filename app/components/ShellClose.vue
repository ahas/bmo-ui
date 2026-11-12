<template>
  <!-- The close of a modal or a side sheet, in the component library's own place and look, named
       on hover like every icon button and by the keyboard when it reaches here — never by the
       focus a dialog takes up on it as it opens (`docs/components.md`, "Tab bar and toolbar" and
       "Tooltips"). -->
  <UTooltip :text="$t('common.action.close')" :ignore-non-keyboard-focus="TOOLTIP_PROVIDER.ignoreNonKeyboardFocus">
    <UButton ref="close" color="neutral" variant="ghost" :icon="appConfig.ui.icons.close" :aria-label="$t('common.action.close')" @click="emit('close')" />
  </UTooltip>
</template>

<script setup lang="ts">
import { MODALITY_ATTRIBUTE } from "../domain/modality";
import { TOOLTIP_PROVIDER } from "../domain/tooltip";

import type { ComponentPublicInstance } from "vue";

const emit = defineEmits<{ close: [] }>();
const appConfig = useAppConfig();
const close = useTemplateRef<ComponentPublicInstance>("close");

// What a browser makes of a dialog's autofocus is its own: after a press opened the dialog it can
// hold the arrival on this button for one the keyboard brought, and the name then standing over the
// dialog takes the first Esc for itself. The page's modality mark is the layer's record of the hand
// that last moved the focus (`docs/design.md`, "Focus"), and a focus that record does not name the
// keyboard's is stopped before the tooltip's own listener sees it.
function onFocused(event: FocusEvent): void {
  const target = button();

  if (target === null || event.target !== target) return;
  if (document.documentElement.getAttribute(MODALITY_ATTRIBUTE) === "key") return;

  event.stopPropagation();
}

function button(): HTMLElement | null {
  return (close.value?.$el as HTMLElement | undefined) ?? null;
}

onMounted(() => document.addEventListener("focus", onFocused, true));
onBeforeUnmount(() => document.removeEventListener("focus", onFocused, true));
</script>
