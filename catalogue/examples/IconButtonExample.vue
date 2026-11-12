<template>
  <IconButton :label="t('notes.action.download')" icon="i-material-symbols-download" @click="downloaded += 1" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const downloaded = ref(0);
</script>
