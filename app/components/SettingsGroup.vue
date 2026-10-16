<template>
  <!-- A group of a section's settings under its small heading, its rows parted by hairlines
       (`docs/components.md`, "Settings"). What stands beside the heading — a preview's mode — is
       centred on it at its right. -->
  <section class="flex flex-col">
    <div v-if="props.title || $slots.aside" class="flex min-h-8 items-center justify-between gap-4">
      <h3 class="text-sm font-semibold text-highlighted">{{ props.title }}</h3>
      <slot name="aside" />
    </div>

    <div class="flex flex-col divide-y divide-default">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
}

const props = withDefaults(defineProps<Props>(), { title: undefined });
</script>
