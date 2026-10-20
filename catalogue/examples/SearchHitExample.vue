<template>
  <UInput v-model="query" icon="i-material-symbols-search" :placeholder="t('notes.placeholder.search')" />
  <ul>
    <li v-for="row in rows" :key="row.note.id">
      <SearchText :text="row.note.title" :query="query" />
      <SearchHit :match="row.match" :query="query" />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import { countLocale } from "../../app/domain/numbers";
import { matchFields } from "../../shared/search";

const { t } = useI18n();
const query = ref("");
const notes = [
  { id: 1, title: "Plan for the week", body: "Read the report and answer the questions." },
  { id: 2, title: "Shopping", body: "Bread, tea and paper." }
];

const rows = computed(() =>
  notes.flatMap((note) => {
    const match = matchFields(
      [
        { label: t("notes.label.title"), text: note.title, shown: true },
        { label: t("notes.label.body"), text: note.body, shown: false }
      ],
      query.value,
      countLocale()
    );

    return query.value === "" || match !== null ? [{ note, match }] : [];
  })
);
</script>
