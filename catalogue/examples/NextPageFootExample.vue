<template>
  <div class="flex flex-col">
    <ul class="flex flex-col">
      <li v-for="item in items" :key="item.id" class="px-3 py-2">{{ item.name }}</li>
    </ul>
    <NextPageFoot :more="more" :next="next" failed-words="The next page could not be read." inset="px-3" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const items = ref([
  { id: 1, name: "plan.md" },
  { id: 2, name: "report.pdf" }
]);
const more = ref(true);

async function next(): Promise<void> {
  items.value.push({ id: items.value.length + 1, name: `notes-${items.value.length + 1}.md` });
  more.value = items.value.length < 6;
}
</script>
