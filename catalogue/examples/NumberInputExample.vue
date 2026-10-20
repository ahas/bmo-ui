<template>
  <NumberInput v-model="minutes" :digits="3" :min="1" :max="600" :unit="t('notes.label.minutes_unit')" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const minutes = ref(30);
</script>
