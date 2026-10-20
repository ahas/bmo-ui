<template>
  <PropertyList :rows="rows" :title="t('notes.title.details')" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { BarProperty } from "../../app/domain/tabs";

const { t } = useI18n();
const rows = computed<BarProperty[]>(() => [
  { label: t("notes.label.path"), value: "notes/plan.md", mono: true },
  { label: t("notes.label.kind"), value: "Markdown" },
  { label: t("notes.label.size"), value: "4 KB" }
]);
</script>
