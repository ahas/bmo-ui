<template>
  <SortableList :items="items" :item-key="(item) => item.id" :item-label="(item) => item.name" @move="move">
    <template #item="{ item }">
      <p class="px-2 py-2 text-sm">{{ item.name }}</p>
    </template>
  </SortableList>
</template>

<script setup lang="ts">
import { ref } from "vue";

const items = ref([
  { id: 1, name: "Draft" },
  { id: 2, name: "Review" },
  { id: 3, name: "Publish" }
]);

function move(from: number, to: number): void {
  const [item] = items.value.splice(from, 1);

  if (item) items.value.splice(to, 0, item);
}
</script>
