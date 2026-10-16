<template>
  <!-- A switch among three or more ways of reading one thing — rendered, source, split
       (`docs/components.md`, "Tab bar and toolbar"). It stands inside a toolbar or the tab bar's
       action area, and its choices share its width evenly. -->
  <div
    role="tablist"
    :aria-label="props.label"
    class="grid h-full shrink-0 auto-cols-fr grid-flow-col items-stretch divide-x divide-default border-x border-default text-sm"
  >
    <button
      v-for="(item, index) in props.items"
      :key="item.value"
      ref="cells"
      type="button"
      role="tab"
      :tabindex="item.value === props.modelValue ? 0 : -1"
      :aria-selected="item.value === props.modelValue"
      :aria-label="item.label"
      :title="props.compact ? item.label : undefined"
      class="flex min-w-0 items-center justify-center gap-2 px-3 transition-colors focus-inset"
      :class="item.value === props.modelValue ? 'bg-default font-medium text-highlighted shadow-[inset_0_-1px_0_var(--ui-border)]' : 'text-muted hover:bg-default/50 hover:text-toned active:bg-default/70'"
      @click="emit('update:modelValue', item.value)"
      @keydown="onKey(index, $event)"
    >
      <UIcon v-if="item.icon" :name="item.icon" class="size-4 shrink-0" />
      <span v-if="!props.compact || !item.icon" class="truncate">{{ item.label }}</span>
    </button>
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

const cells = useTemplateRef<HTMLButtonElement[]>("cells");

function onKey(index: number, event: KeyboardEvent): void {
  const last = props.items.length - 1;
  const target = { ArrowLeft: index === 0 ? last : index - 1, ArrowRight: index === last ? 0 : index + 1, Home: 0, End: last }[event.key];
  const item = target === undefined ? undefined : props.items[target];

  if (item === undefined || target === undefined) {
    return;
  }

  event.preventDefault();
  emit("update:modelValue", item.value);
  cells.value?.[target]?.focus();
}
</script>
