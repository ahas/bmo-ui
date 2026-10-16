<template>
  <!-- Where a row matched when the match is in nothing the row shows: one line, naming what it
       matched in, with the hit marked. -->
  <p v-if="props.match?.hidden" class="flex min-w-0 items-baseline gap-1 text-sm text-muted">
    <UIcon name="i-material-symbols-search" class="size-4 shrink-0 self-center" />
    <span class="shrink-0 text-muted">{{ props.match.hidden.label }}</span>
    <SearchText class="min-w-0 truncate" :text="props.match.hidden.snippet" :query="props.query" />
  </p>
</template>

<script setup lang="ts">
import type { SearchMatch } from "../../shared/search";

interface Props {
  match: SearchMatch | null;
  query?: string | null;
}

const props = defineProps<Props>();
</script>
