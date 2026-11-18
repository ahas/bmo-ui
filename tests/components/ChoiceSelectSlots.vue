<template>
  <!-- The library's slots as a screen fills them through the one select (`docs/components.md`,
       "Choosing a value"), read by the typecheck alone: each slot the select hands on keeps the type
       the library's own gives it, so a screen reads a choice's fields and the select's parts there
       as it would on the library's select menu. -->
  <ChoiceSelect v-model="shade" :items="SHADES" value-key="value">
    <template #default="{ ui }">
      <span :class="ui.placeholder()">{{ shade }}</span>
    </template>

    <template #item-leading="{ item }">
      <span :data-value="item.value">{{ item.label }}</span>
    </template>
  </ChoiceSelect>
</template>

<script setup lang="ts">
import ChoiceSelect from "../../app/components/ChoiceSelect.vue";

const SHADES = [
  { label: "Almond", value: "almond" },
  { label: "Azure", value: "azure" }
];

const shade = ref("almond");
</script>
