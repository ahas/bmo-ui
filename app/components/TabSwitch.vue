<template>
  <!-- A switch among a fixed few ways of reading one thing — rendered, source, split
       (`docs/components.md`, "Tab bar and toolbar"). It stands inside a toolbar or the tab bar's
       action area, and its choices share its width evenly. Each choice is the library's small
       button, the standing one outlined on the page's own ground and the rest ghost, so a hover and
       a press fill only the choice's own rounded shape and never the row the switch stands in. Short
       of room each choice shows its icon alone and is named on hover.

       The even share is a grid of equal columns, which the switch holds against the toolbar laying
       each of its cells out as a row: a row would give each choice the width of its word. -->
  <div role="tablist" :aria-label="props.label" class="grid! shrink-0 auto-cols-fr grid-flow-col items-center gap-1">
    <template v-for="(item, index) in props.items" :key="item.value">
      <UTooltip :text="item.label" :disabled="!shortened(item)">
        <UButton
          :ref="(button) => keep(index, button)"
          role="tab"
          size="sm"
          color="neutral"
          :variant="item.value === props.modelValue ? 'outline' : 'ghost'"
          :icon="item.icon"
          :label="shortened(item) ? undefined : item.label"
          :square="shortened(item)"
          :tabindex="item.value === props.modelValue ? 0 : -1"
          :aria-selected="item.value === props.modelValue"
          :aria-label="item.label"
          class="min-w-0 justify-center"
          @click="emit('update:modelValue', item.value)"
          @keydown="onKey(index, $event)"
        />
      </UTooltip>
    </template>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
import type { SwitchItem } from "../domain/tabs";

// A view switch's choices are few and fixed, so each takes an equal share of the switch rather than
// the width of its word.

const props = defineProps<{
  items: readonly SwitchItem<T>[];
  modelValue: T;
  label: string;
  // Each choice by its icon alone, named on hover, where the row is short of room.
  compact?: boolean;
}>();

const emit = defineEmits<{ "update:modelValue": [value: T] }>();

// The choices' elements, by place, so a key moves the focus with the choice.
const cells: (HTMLElement | undefined)[] = [];

function keep(index: number, button: unknown): void {
  cells[index] = (button as { $el?: HTMLElement } | null)?.$el;
}

// A choice stands by its icon alone where the switch is short of room and the choice has one.
function shortened(item: SwitchItem<T>): boolean {
  return props.compact === true && item.icon !== undefined;
}

function onKey(index: number, event: KeyboardEvent): void {
  const last = props.items.length - 1;
  const target = { ArrowLeft: index === 0 ? last : index - 1, ArrowRight: index === last ? 0 : index + 1, Home: 0, End: last }[event.key];
  const item = target === undefined ? undefined : props.items[target];

  if (item === undefined || target === undefined) {
    return;
  }

  event.preventDefault();
  emit("update:modelValue", item.value);
  cells[target]?.focus();
}
</script>
