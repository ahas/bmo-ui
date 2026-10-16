<!-- The place a table keeps while its rows are being read. Which columns the table has and what
     they are called is settled by the screen and not by the answer, so the head stands at once and
     only the cells under it wait; the placeholder rows are the table's own rows, at the table's own
     height, so the head does not move when they land. -->
<template>
  <ContentSkeleton class="min-w-0" :label="label">
    <div class="min-w-0">
      <div class="grid border-b border-default px-4 py-3" :style="template">
        <template v-for="(name, at) in standing" :key="at">
          <span v-if="name !== ''" class="truncate text-sm font-medium text-highlighted">{{ name }}</span>
          <SkeletonBar v-else class="h-4 w-2/3" />
        </template>
      </div>
      <div v-for="n in rows" :key="n" class="grid items-center border-b border-default px-4 py-3 last:border-b-0" :style="template">
        <SkeletonBar v-for="at in standing.length" :key="at" class="h-4 w-4/5" />
      </div>
    </div>
  </ContentSkeleton>
</template>
<script setup lang="ts">
const props = withDefaults(defineProps<{
  // What the table's columns are called, in the order they stand, so the head reads the same
  // before the rows arrive as after.
  headers: string[];
  rows?: number;
  label?: string;
}>(), { rows: 6 });

// The columns the place stood up with are the ones it keeps until the rows land: a head that
// learnt its names while it waited would change shape under the reader, and a placeholder turns
// into its content once. The next place a table keeps is drawn afresh, with what is known then.
const standing = props.headers.slice();
const template = { gridTemplateColumns: `repeat(${Math.max(standing.length, 1)}, minmax(0, 1fr))` };
</script>
