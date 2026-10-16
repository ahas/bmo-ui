<template>
  <!-- The details of one file or document: a name to a line, the value beside it, or under it on
       a phone (`docs/components.md`, "Name and value lists"). -->
  <div class="flex flex-col gap-3">
    <p v-if="props.title" class="text-base font-semibold break-words text-highlighted">{{ props.title }}</p>

    <dl class="pair-list gap-x-4 gap-y-2 text-sm">
      <template v-for="row in props.rows" :key="row.label">
        <dt class="text-muted">{{ row.label }}</dt>
        <dd class="break-words text-default" :class="row.mono ? 'font-mono break-all' : ''">{{ row.value }}</dd>
      </template>
    </dl>
  </div>
</template>

<script setup lang="ts">
import type { BarProperty } from "../domain/tabs";

interface Props {
  rows: readonly BarProperty[];
  title?: string | null;
}

const props = defineProps<Props>();
</script>
