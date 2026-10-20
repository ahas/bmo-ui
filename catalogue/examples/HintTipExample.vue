<template>
  <HintTip :text="t('notes.label.word_count', { n: 1472 })" cut>
    <span class="truncate">{{ t("notes.label.words_short", { n: "1.4k" }) }}</span>
  </HintTip>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
