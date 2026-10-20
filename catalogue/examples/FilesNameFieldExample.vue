<template>
  <FilesNameField v-if="renaming" :name="name" :folder="false" @rename="rename" @cancel="renaming = false" />
  <span v-else>{{ name }}</span>
</template>

<script setup lang="ts">
import { ref } from "vue";

const name = ref("plan.md");
const renaming = ref(true);

function rename(next: string): void {
  name.value = next;
  renaming.value = false;
}
</script>
