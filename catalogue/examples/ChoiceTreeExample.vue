<template>
  <div class="flex h-96 min-h-0 flex-col">
    <ChoiceTree :label="t('teams.label.tree')" :nodes="nodes" :chosen="chosen" save-id="teams-tree" @choose="chosen = $event">
      <p class="p-4 text-sm">{{ chosen }}</p>
    </ChoiceTree>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

import type { SideNode } from "../../app/domain/side-parts";

const { t } = useI18n();
const chosen = ref<string | number>("field");
const nodes: SideNode[] = [
  {
    key: "north",
    label: "Northwind",
    icon: "i-material-symbols-domain",
    children: [
      { key: "sales", label: "Sales", children: [{ key: "field", label: "Field sales" }] },
      { key: "support", label: "Support" }
    ]
  },
  { key: "atlas", label: "Atlas", icon: "i-material-symbols-domain" }
];
</script>
