<template>
  <!-- One setting of a section (`docs/components.md`, "Settings"): its name and, where the name
       needs it, one muted line under it at the left, and its control at the right. Where the two do
       not fit on one line the control goes under the name, still at the right. -->
  <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
    <div class="flex min-w-0 grow basis-40 flex-col">
      <span class="text-sm text-highlighted">{{ props.label }}</span>
      <slot name="description">
        <span v-if="props.description" class="text-sm text-muted">{{ props.description }}</span>
      </slot>
    </div>

    <div class="ms-auto flex shrink-0 items-center gap-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label: string;
  description?: string;
}

const props = withDefaults(defineProps<Props>(), { description: undefined });
</script>
