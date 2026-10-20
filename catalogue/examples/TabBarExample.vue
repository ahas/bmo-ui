<template>
  <TabBar v-model:active="active" :tabs="tabs" :label="t('notes.aria.open_notes')" :actions="actions" @close="close" @move="move" @pin="pin" />
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import { fileTabLabel, moveTab, pinTab } from "../../app/domain/tabs";

import type { BarAction, BarTab } from "../../app/domain/tabs";

const { t } = useI18n();
const open = ref([
  { id: "notes/plan.md", pinned: true },
  { id: "drafts/plan.md", pinned: false }
]);
const active = ref<string | null>("drafts/plan.md");

const tabs = computed<BarTab[]>(() =>
  open.value.map((tab) => ({
    id: tab.id,
    label: fileTabLabel(
      open.value.map((one) => one.id),
      tab.id
    ),
    title: tab.id,
    icon: "i-material-symbols-description-outline",
    pinned: tab.pinned
  }))
);
const actions = computed<BarAction[]>(() => [{ id: "save", label: t("common.action.save"), icon: "i-material-symbols-save-outline", onSelect: () => undefined }]);

function close(ids: string[]): void {
  open.value = open.value.filter((tab) => !ids.includes(tab.id));
}

function move(from: number, to: number): void {
  open.value = moveTab(open.value, from, to, (tab) => tab.pinned);
}

function pin(id: string, on: boolean): void {
  open.value = pinTab(
    open.value,
    open.value.findIndex((tab) => tab.id === id),
    on
  );
}
</script>
