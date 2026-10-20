<template>
  <USelect v-model="chosen" :items="items" value-key="value">
    <template #item-leading="{ item }">
      <ThemeSwatch :theme="themeOf(item.value)" scheme="dark" />
    </template>
  </USelect>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import { DEFAULT_THEME, THEMES, themeOf } from "../../shared/themes";

const { t } = useI18n();
const chosen = ref(DEFAULT_THEME.id);
const items = computed(() => THEMES.map((theme) => ({ value: theme.id, label: t(theme.label) })));
</script>
