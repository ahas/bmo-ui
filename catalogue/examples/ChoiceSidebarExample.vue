<template>
  <div class="flex h-96 min-h-0 flex-col">
    <ChoiceSidebar :label="t('teams.label.list')" :entries="entries" :chosen="chosen" save-id="teams-list" @choose="chosen = $event">
      <template #actions>
        <IconButton size="sm" icon="i-material-symbols-add" :label="t('teams.action.add')" />
      </template>

      <p class="p-4 text-sm">{{ chosen }}</p>
    </ChoiceSidebar>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

import type { SideEntry } from "../../app/domain/side-parts";

const { t } = useI18n();
const chosen = ref<string | number>("north");
const entries: SideEntry[] = [
  { type: "label", label: "Northwind" },
  { value: "north", label: "Northwind" },
  { value: "sales", label: "Sales", depth: 1 },
  { value: "field", label: "Field sales", depth: 2, line: "Northwind / Sales" },
  { type: "label", label: "Projects" },
  { value: "launch", label: "Launch" }
];
</script>
