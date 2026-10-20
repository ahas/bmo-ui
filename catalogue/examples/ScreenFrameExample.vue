<template>
  <ScreenFrame>
    <header class="flex h-(--ui-header-height) shrink-0 items-center border-b border-default px-4">{{ t("notes.title.notes") }}</header>
    <main class="min-h-0 flex-1 overflow-y-auto p-4">
      <NuxtPage />
    </main>
  </ScreenFrame>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
