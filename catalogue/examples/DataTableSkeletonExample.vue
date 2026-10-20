<template>
  <DataTableSkeleton v-if="loading" :headers="headers" :rows="8" :label="t('notes.status.loading_files')" />
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const loading = ref(true);
const headers = computed(() => [t("notes.label.name"), t("notes.label.size"), t("notes.label.changed")]);
</script>
