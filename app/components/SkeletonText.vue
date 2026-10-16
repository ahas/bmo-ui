<!-- A passage of text that has not arrived: lines at the text's own size and line spacing, with
     only the last one short. It draws the lines alone and no frame, so it stands wherever the real
     passage would, inside whatever already holds it. -->
<template>
  <div class="min-w-0">
    <SkeletonLine v-for="n in lines" :key="n" :size="size" :width="n === lines ? lastWidth : 'w-full'" />
  </div>
</template>
<script setup lang="ts">
withDefaults(defineProps<{
  lines?: number;
  size?: 'sm' | 'base' | 'lg';
  // Where the last line ends, which for a paragraph is short of the full width.
  lastWidth?: string;
}>(), { lines: 3, size: 'base', lastWidth: 'w-3/5' });
</script>
