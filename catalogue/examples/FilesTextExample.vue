<template>
  <div class="flex h-96 flex-col">
    <FilesText :text="text" name="plan.md" />
  </div>
</template>

<script setup lang="ts">
const text = "# Plan\n\n- Read the report\n- Answer the questions\n";
</script>
