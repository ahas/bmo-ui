<template>
  <FilesConflictDialog v-model:open="asking" :names="taken" @answer="settle" />
</template>

<script setup lang="ts">
import { ref } from "vue";

const asking = ref(true);
const taken = ["plan.md", "report.pdf"];

function settle(choice: "replace" | "rename" | "skip" | null): void {
  if (choice === null) return;

  console.info(`moving with ${choice}`);
}
</script>
