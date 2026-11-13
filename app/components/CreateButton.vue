<template>
  <!-- The one button a screen creates from (`docs/components.md`, "Creating"). On a wide screen it is
       the layer's icon button, neutral and ghost with the add mark, standing as a cell of its own in
       the row the screen's actions stand in, its tooltip naming what it creates and the key that
       presses it. On a phone the same button floats instead, primary and solid at the library's
       largest size, its fill at the darker step a coloured badge takes so its white mark reads, at
       the screen's bottom right above the device's inset, marked as the screen's foot so what a
       console floats stands above it, and nothing is left of it in the row.

       Where it stands is the host's: a class or a style it is handed lands on its cell. What it does
       is the host's too: a press, or the menu or popover the host wraps round it, lands on the
       button, and such a menu stands against the button through the content settings the create
       button module makes from what this exposes. Its colour, variant, size and mark are its own and
       nothing handed to it changes them. -->
  <div v-if="!narrow" :class="['flex shrink-0 items-center', $attrs.class]" :style="$attrs.style as StyleValue">
    <IconButton
      ref="button"
      v-bind="forButton()"
      :label="props.label"
      :kbds="kbds"
      :icon="ADD_ICON"
      color="neutral"
      variant="ghost"
      :disabled="props.disabled"
      :aria-keyshortcuts="key ?? undefined"
    />
  </div>
  <Teleport v-else to="body">
    <div data-screen-foot class="badge-ink fixed end-4 bottom-[calc(1rem+var(--bmo-safe-bottom))]">
      <IconButton
        ref="button"
        v-bind="forButton()"
        :label="props.label"
        :icon="ADD_ICON"
        color="primary"
        variant="solid"
        size="xl"
        :disabled="props.disabled"
        :aria-keyshortcuts="key ?? undefined"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { defineShortcuts } from "@nuxt/ui/composables/defineShortcuts";

import { layerCount } from "../domain/layers";
import { useNarrow } from "../domain/screen";

import type { StyleValue } from "vue";
import type { CreateButtonHandle } from "../domain/create-button";

interface Props {
  // What it creates, in the host's words: its name, heard and shown alike.
  label: string;
  // The key that presses it; null for none.
  shortcut?: string | null;
  disabled?: boolean;
}

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<Props>(), { shortcut: "n", disabled: false });

const ADD_ICON = "i-material-symbols-add";

const attrs = useAttrs();
const narrow = useNarrow();
const button = useTemplateRef<CreateButtonHandle>("button");

// The key is named once, as the button is set up.
const key = props.shortcut;
const kbds = key === null ? undefined : [key];

// What is handed to it for the button: everything but where its cell stands.
function forButton(): Record<string, unknown> {
  const { class: _class, style: _style, ...rest } = attrs;

  return rest;
}

function element(): HTMLElement | null {
  return button.value?.element() ?? null;
}

// The key does what a press does, and only where a press could land: the button enabled and nothing
// floating over the screen. The library's shortcuts already pass over a key typed into a field.
function pressByKey(): void {
  if (props.disabled || layerCount() > 0) return;

  element()?.click();
}

if (key !== null) defineShortcuts({ [key]: pressByKey });

defineExpose<CreateButtonHandle>({ element });
</script>
