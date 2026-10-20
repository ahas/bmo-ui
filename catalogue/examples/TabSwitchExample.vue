<template>
  <TabSwitch v-model="view" :items="items" :label="t('notes.aria.view')" />
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import type { SwitchItem } from "../../app/domain/tabs";

type View = "list" | "grid";

const { t } = useI18n();
const view = ref<View>("list");
const items = computed<SwitchItem<View>[]>(() => [
  { value: "list", label: t("notes.label.list"), icon: "i-material-symbols-view-list-outline" },
  { value: "grid", label: t("notes.label.grid"), icon: "i-material-symbols-grid-view-outline" }
]);
</script>
