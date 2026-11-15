<template>
  <CardRow v-slot="{ item }" :title="t('notes.label.recent')" :items="items" all="/notes">
    <span class="flex w-40 flex-col gap-2">
      <ArtworkFrame :src="null" :shape="PORTRAIT" icon="i-material-symbols-description-outline" :name="item" class="rounded-md" />
      <span class="truncate text-base">{{ item }}</span>
    </span>
  </CardRow>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { PORTRAIT } from "../../app/domain/artwork";

const { t } = useI18n();
const items = ["Harbour", "Field", "Morning walk", "Bridge", "Station", "Market", "River", "Garden"];
</script>
