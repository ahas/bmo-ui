<template>
  <!-- The close of a modal or a side sheet, in the component library's own place and look, named
       on hover like every icon button (`docs/components.md`, "Tab bar and toolbar"). -->
  <UTooltip :text="$t('common.action.close')">
    <UButton color="neutral" variant="ghost" :icon="appConfig.ui.icons.close" :aria-label="$t('common.action.close')" @click="emit('close')" />
  </UTooltip>
</template>

<script setup lang="ts">
const emit = defineEmits<{ close: [] }>();
const appConfig = useAppConfig();
</script>
