<template>
  <SettingsRow :label="t('notes.label.sort_by')">
    <SettingsSegment v-model="sort" :items="items" :label="t('notes.label.sort_by')" />
  </SettingsRow>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const sort = ref("name");
const items = computed(() => [
  { label: t("notes.label.name"), value: "name" },
  { label: t("notes.label.changed"), value: "changed" }
]);
</script>
