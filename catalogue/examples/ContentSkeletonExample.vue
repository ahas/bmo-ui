<template>
  <ContentSkeleton v-if="loading" :rows="4" list-class="flex flex-col gap-2" :label="t('notes.status.loading_notes')">
    <div class="flex items-center gap-3 p-3">
      <SkeletonBar class="size-8 rounded-full" />
      <SkeletonText :lines="2" size="sm" />
    </div>
  </ContentSkeleton>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const loading = ref(true);
</script>
