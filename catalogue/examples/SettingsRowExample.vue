<template>
  <SettingsRow :label="t('notes.label.sync')" :description="t('notes.message.sync_hint')">
    <USwitch v-model="sync" />
  </SettingsRow>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const sync = ref(true);
</script>
