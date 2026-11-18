<template>
  <!-- A button drawn as its icon alone, the library's own button named by one set of words: what a
       screen reader hears and what the shared tooltip shows (`docs/components.md`, "Actions and the
       toolbar" and "Tooltips"). A pointer names it on hover and the keyboard on focus; a tap presses
       it, so a finger held on it names it instead and lifting that finger presses nothing. Everything
       else it is handed is the library button's: its icon, size, colour, variant, a press, a route,
       and what a menu or a popover it opens puts on its trigger. The keys that press it, where
       it has any, stand in its tooltip after its name. A menu, a popover or a dialog it opens takes
       the tooltip's box round it for the trigger and hands the focus back there as it closes, so the
       box takes a focus handed to it and passes it straight on to the button. The box stands
       outside the keyboard's order. -->
  <HintTip class="inline-flex" tabindex="-1" :text="props.label" :kbds="props.kbds" press :keyboard-focus="props.keyboardFocus" :portal="props.portal" @focus="passFocus">
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
  // The keys that press it, shown in its tooltip after its name.
  kbds?: string[];
  // Where its tooltip is drawn, as the shared tooltip takes it.
  portal?: boolean | string | HTMLElement;
}

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<Props>(), { keyboardFocus: undefined, kbds: undefined, portal: true });

const button = useTemplateRef<ComponentPublicInstance>("button");

// The button's own element, for what is anchored on it: the tooltip's box stands around it.
function element(): HTMLElement | null {
  return (button.value?.$el as HTMLElement | undefined) ?? null;
}

// A focus the box itself takes, never one landing on the button inside it, goes on to the button.
function passFocus(): void {
  element()?.focus();
}

defineExpose({ element });
</script>
