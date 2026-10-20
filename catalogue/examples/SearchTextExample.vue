<template>
  <UInput v-model="query" icon="i-material-symbols-search" :placeholder="t('notes.placeholder.search')" />
  <ul>
    <li v-for="name in shown" :key="name"><SearchText :text="name" :query="query" /></li>
  </ul>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import { countLocale } from "../../app/domain/numbers";
import { filterRecords } from "../../shared/search";

const { t } = useI18n();
const query = ref("");
const names = ["plan.md", "notes.md", "report.pdf"];
const shown = computed(() => filterRecords(names, (name) => [{ label: "name", text: name, shown: true }], query.value, countLocale()));
</script>
