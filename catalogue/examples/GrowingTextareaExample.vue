<template>
  <UFormField :label="t('notes.label.body')">
    <GrowingTextarea v-model="body" :rows="3" :maxlength="2000" />
  </UFormField>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const body = ref<string | undefined>("");
</script>
