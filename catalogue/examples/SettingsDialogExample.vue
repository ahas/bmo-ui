<template>
  <SettingsDialog v-model:open="open" :title="t('notes.title.rename_folder')" :dirty="name !== saved">
    <UFormField :label="t('notes.label.name')">
      <UInput v-model="name" class="w-full" />
    </UFormField>

    <template #footer="{ close }">
      <UButton color="neutral" variant="ghost" :label="t('common.action.cancel')" @click="close" />
      <UButton :label="t('common.action.save')" @click="(saved = name), (open = false)" />
    </template>
  </SettingsDialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const open = ref(true);
const saved = ref("drafts");
const name = ref(saved.value);
</script>
