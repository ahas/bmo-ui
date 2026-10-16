<!-- A figure that keeps one width whatever it reads (`docs/design.md`, "Fonts"): what
     it holds stands over an unseen copy of the widest it realistically reaches, which its owner
     names, so its box is the wider of the two and a reading that gains or loses a place moves
     neither its column nor what stands beside it. Its figures are tabular, so a reading of as many
     places as the widest fills the same width. -->
<template>
  <span class="inline-grid tabular-nums *:col-start-1 *:row-start-1" :class="align === 'end' ? 'justify-items-end' : 'justify-items-start'">
    <span><slot /></span>
    <span class="invisible" aria-hidden="true">{{ widest }}</span>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ widest: string; align?: "start" | "end" }>(), { align: "end" });
</script>
