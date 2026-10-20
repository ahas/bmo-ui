<template>
  <ToolBar :label="t('notes.aria.editor_tools')">
    <UTooltip :text="t('notes.action.bold')">
      <UButton icon="i-material-symbols-format-bold" color="neutral" variant="ghost" :aria-label="t('notes.action.bold')" />
    </UTooltip>
    <UTooltip :text="t('notes.action.italic')">
      <UButton icon="i-material-symbols-format-italic" color="neutral" variant="ghost" :aria-label="t('notes.action.italic')" />
    </UTooltip>
    <UButton class="ms-auto" color="neutral" variant="ghost" :label="t('common.action.save')" />
  </ToolBar>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
