<template>
  <!-- A button drawn as its icon alone, the library's own button named by one set of words: what a
       screen reader hears and what the shared tooltip shows (`docs/components.md`, "Actions and the
       toolbar" and "Tooltips"). A pointer names it on hover and the keyboard on focus; a tap presses
       it, so a finger held on it names it instead and lifting that finger presses nothing. Everything
       else it is handed is the library button's: its icon, size, colour, variant, a press, a route,
       and what a menu or a popover it opens puts on its trigger. -->
  <HintTip class="inline-flex" :text="props.label" press :keyboard-focus="props.keyboardFocus">
    <UButton ref="button" color="neutral" variant="ghost" square v-bind="$attrs" :aria-label="props.label" />
  </HintTip>
</template>

<script setup lang="ts">
import type { ButtonProps } from "@nuxt/ui";
import type { ComponentPublicInstance } from "vue";

interface Props extends /* @vue-ignore */ Omit<ButtonProps, "label" | "square"> {
  // Its name, heard and shown alike.
  label: string;
  // Whether a focus arriving on it is the keyboard's, where the browser's visible-focus tell cannot
  // say so for it.
  keyboardFocus?: (event: FocusEvent) => boolean;
}

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<Props>(), { keyboardFocus: undefined });

const button = useTemplateRef<ComponentPublicInstance>("button");

// The button's own element, for what is anchored on it: the tooltip's box stands around it.
function element(): HTMLElement | null {
  return (button.value?.$el as HTMLElement | undefined) ?? null;
}

defineExpose({ element });
</script>
