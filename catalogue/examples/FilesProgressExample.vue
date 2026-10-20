<template>
  <FilesProgress :progress="uploading" />
</template>

<script setup lang="ts">
import { ref } from "vue";

import type { FilesUploading } from "../../app/components/FilesProgress.vue";

const uploading = ref<FilesUploading | null>({ done: 2, all: 5, sent: 3_200_000, bytes: 8_000_000 });
</script>
