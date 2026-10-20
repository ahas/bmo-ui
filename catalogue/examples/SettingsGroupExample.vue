<template>
  <SettingsGroup :title="t('notes.title.reading')">
    <SettingsRow :label="t('notes.label.wrap_lines')">
      <USwitch v-model="wrap" />
    </SettingsRow>
    <SettingsRow :label="t('notes.label.font_size')">
      <NumberInput v-model="size" :digits="2" :min="12" :max="24" unit="px" />
    </SettingsRow>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const wrap = ref(true);
const size = ref(16);
</script>
