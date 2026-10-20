<template>
  <TabSwitch v-model="view" :items="items" :label="t('notes.aria.view')" />
  <TabSlide :at="items.findIndex((item) => item.value === view)">
    <ul v-if="view === 'recent'" key="recent">
      <li>plan.md</li>
    </ul>
    <ul v-else key="pinned">
      <li>notes.md</li>
    </ul>
  </TabSlide>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import type { SwitchItem } from "../../app/domain/tabs";

type View = "recent" | "pinned";

const { t } = useI18n();
const view = ref<View>("recent");
const items = computed<SwitchItem<View>[]>(() => [
  { value: "recent", label: t("notes.label.recent") },
  { value: "pinned", label: t("notes.label.pinned") }
]);
</script>
