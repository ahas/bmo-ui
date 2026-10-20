<template>
  <SettingsGroup :title="t('notes.title.theme')">
    <div class="grid grid-cols-2 gap-3">
      <ThemePreview :theme="theme" scheme="light" />
      <ThemePreview :theme="theme" scheme="dark" />
    </div>
  </SettingsGroup>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { themeOf } from "../../shared/themes";

const { t } = useI18n();
const theme = themeOf("sea");
</script>
