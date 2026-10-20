<template>
  <table>
    <thead>
      <tr ref="head">
        <th v-for="name in names" :key="name" class="relative" :style="{ width: `${widths[name] ?? 0}px` }">
          {{ name }}
          <ColumnResizeHandle :label="name" :width="widths[name]" @start="startResize($event, name)" @nudge="nudge(name, $event)" />
        </th>
      </tr>
    </thead>
  </table>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";

import { useColumnWidths } from "../../app/domain/column-widths";

const names = ["name", "size", "changed"];
const head = useTemplateRef<HTMLElement>("head");
const { widths, startResize, nudge } = useColumnWidths(
  () => names,
  () => head.value
);
</script>
