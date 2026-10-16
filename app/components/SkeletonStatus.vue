<!-- The busy status of a place kept inline, where ContentSkeleton's block and list would not fit: a
     figure beside a button, a block of names whose values are still coming. It says it is busy
     only once the browser has taken the page over, since nothing has been asked for before that,
     and its name is the only text it adds. What it keeps the place of is the slot. -->
<template>
  <component :is="as" :role="painted ? 'status' : undefined" :aria-busy="painted ? 'true' : undefined" :aria-label="painted ? label : undefined" class="pointer-events-none">
    <span v-if="painted" class="sr-only">{{ label }}</span>
    <slot />
  </component>
</template>
<script setup lang="ts">
import { usePainted } from "../domain/loading";

const painted = usePainted();

withDefaults(defineProps<{
  label: string;
  as?: "span" | "div";
}>(), { as: "span" });
</script>
