<template>
  <USlideover v-model:open="open" :title="t('notes.title.details')" :close="false">
    <template #actions>
      <ShellClose @close="open = false" />
    </template>
    <template #body>
      <p>{{ t("notes.message.no_details") }}</p>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const open = ref(true);
</script>
