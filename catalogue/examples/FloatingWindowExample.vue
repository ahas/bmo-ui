<template>
  <FloatingWindow v-model:open="open" name="notes" :label="t('notes.title.window')" :pill-label="t('notes.action.open_window')">
    <template #title>
      <span class="truncate font-semibold text-highlighted">{{ t("notes.title.window") }}</span>
    </template>

    <template #pill>
      <UIcon name="i-material-symbols-sticky-note-2-outline" class="size-5" />
    </template>

    <p class="p-4 text-sm">{{ t("notes.message.window_body") }}</p>
  </FloatingWindow>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const open = ref(true);
</script>
