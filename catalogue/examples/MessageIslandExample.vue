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

async function save(): Promise<void> {
  if (!(await island.ask({ title: t("notes.message.overwrite_confirm"), confirm: t("notes.action.overwrite") }))) return;

  island.say({ tone: "success", title: t("notes.message.saved") });
}
</script>
