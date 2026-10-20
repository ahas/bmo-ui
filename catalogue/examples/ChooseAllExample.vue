<template>
  <ChooseAll :keys="shown" :selected="selected" @choose="choose" />
</template>

<script setup lang="ts">
import { ref } from "vue";

const shown = ["plan.md", "notes.md", "report.pdf"];
const selected = ref<ReadonlySet<string>>(new Set(["notes.md"]));

function choose(all: boolean): void {
  selected.value = new Set(all ? shown : []);
}
</script>
