<template>
  <p>
    {{ t("notes.label.size") }}:
    <SkeletonStatus v-if="size === null" :label="t('notes.status.measuring')">
      <SkeletonLine width="w-12" />
    </SkeletonStatus>
    <span v-else>{{ size }}</span>
  </p>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const size = ref<string | null>(null);
</script>
