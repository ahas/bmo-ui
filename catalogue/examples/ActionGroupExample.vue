<template>
  <ActionGroup :actions="actions" :properties="properties" :properties-title="t('notes.title.details')" :label="t('notes.aria.note_actions')" />
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import type { BarAction, BarProperty } from "../../app/domain/tabs";

const { t } = useI18n();
const wrapped = ref(false);

const actions = computed<BarAction[]>(() => [
  { id: "wrap", label: t("notes.action.wrap_lines"), icon: "i-material-symbols-wrap-text", pressed: wrapped.value, onSelect: () => (wrapped.value = !wrapped.value) },
  { id: "download", label: t("notes.action.download"), icon: "i-material-symbols-download", onSelect: () => undefined }
]);

const properties = computed<BarProperty[]>(() => [
  { label: t("notes.label.path"), value: "notes/plan.md", mono: true },
  { label: t("notes.label.size"), value: "4 KB" }
]);
</script>
