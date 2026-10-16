<!-- One line of text that has not arrived. It takes the whole of the line box the real text stands
     in, and draws the bar inside it, so a run of these is exactly as tall as the same run of real
     lines and nothing moves when the words land. -->
<template>
  <div class="flex min-w-0 items-center" :class="HEIGHT[size]"><SkeletonBar class="h-4" :class="width" /></div>
</template>
<script setup lang="ts">
withDefaults(defineProps<{
  // The size the real text stands at, which is what decides the line's height.
  size?: 'sm' | 'base' | 'lg';
  // How far along the line the words reach.
  width?: string;
}>(), { size: 'sm', width: 'w-full' });

// text-sm reads on a 20px line, text-base on 24px and text-lg on 28px.
const HEIGHT = { sm: 'h-5', base: 'h-6', lg: 'h-7' };
</script>
