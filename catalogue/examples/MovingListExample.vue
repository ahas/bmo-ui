<template>
  <MovingList class="flex flex-col">
    <li v-for="item in items" :key="item.id" class="px-3 py-2">{{ item.name }}</li>
  </MovingList>
</template>

<script setup lang="ts">
import { ref } from "vue";

const items = ref([
  { id: 3, name: "report.pdf" },
  { id: 1, name: "plan.md" }
]);
</script>
