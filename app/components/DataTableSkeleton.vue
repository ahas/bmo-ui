<!-- The place a table keeps while its rows are being read. Which columns the table has and what
     they are called is settled by the screen and not by the answer, so the head stands at once, with
     the table's own line under it, and only the cells under it wait; the placeholder rows are the
     table's own rows, in the table's own box and at the table's own height, so the head does not move
     when they land. The box scrolls sideways at a narrow width exactly as the table's does, so no
     column name is cut. -->
<template>
  <ContentSkeleton :label="label" :class="box.root">
    <table :class="box.base">
      <thead class="relative bg-elevated">
        <tr>
          <th v-for="(name, at) in standing" :key="at" :class="head">
            <span v-if="name === ''" class="flex h-5 items-center"><SkeletonBar class="h-4 w-2/3" /></span>
            <template v-else>{{ name }}</template>
          </th>
        </tr>
        <tr :class="TABLE_HEAD_LINE" />
      </thead>
      <tbody class="divide-y divide-default">
        <tr v-for="n in rows" :key="n">
          <td v-for="at in standing.length" :key="at" :class="cell">
            <div :class="line"><SkeletonBar class="h-4 w-4/5" /></div>
          </td>
        </tr>
      </tbody>
    </table>
  </ContentSkeleton>
</template>
<script setup lang="ts">
import { TABLE_BOX, TABLE_HEAD, TABLE_HEAD_LINE, TABLE_ROW_HEIGHT } from "../domain/table-layout";

import type { TableLayout } from "../domain/table-layout";

const props = withDefaults(defineProps<{
  // What the table's columns are called, in the order they stand, so the head reads the same
  // before the rows arrive as after.
  headers: string[];
  // How the table it stands for stands, so the box and the rows are the same (the table-layout
  // module).
  layout?: TableLayout;
  rows?: number;
  label?: string;
}>(), { layout: "own", rows: 6 });

// The columns the place stood up with are the ones it keeps until the rows land: a head that
// learnt its names while it waited would change shape under the reader, and a placeholder turns
// into its content once. The next place a table keeps is drawn afresh, with what is known then.
const standing = props.headers.slice();
const dense = computed(() => props.layout === "dense");
const box = computed(() => TABLE_BOX[props.layout]);
const head = computed(() => TABLE_HEAD[dense.value ? "dense" : "own"]);
const cell = computed(() => (dense.value ? `${TABLE_ROW_HEIGHT.dense} px-2 py-1` : `${TABLE_ROW_HEIGHT.own} px-2 py-1 first:ps-4 last:pe-4`));
// The bar stands in the line box the real cell's words stand in, centred in the row's own height.
const line = computed(() => (dense.value ? "flex h-5 items-center" : "flex h-10 items-center"));
</script>
