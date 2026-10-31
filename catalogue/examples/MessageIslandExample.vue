<template>
  <UApp>
    <NuxtPage />
    <MessageIsland />
  </UApp>
  <UButton :label="t('notes.action.save')" @click="save" />
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { useIsland } from "../../app/domain/island";

const { t } = useI18n();
const island = useIsland(t);

function save(): void {
  island.say({ tone: "success", title: t("notes.message.saved") });
}
</script>
