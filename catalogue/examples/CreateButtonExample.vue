<template>
  <div class="flex flex-col">
    <ToolBar :label="t('notes.aria.list_tools')">
      <div>
        <span>{{ t("notes.label.notes") }}</span>
      </div>
      <CreateButton class="ms-auto" :label="t('notes.action.new')" @click="created += 1" />
    </ToolBar>
    <ul class="pb-(--bmo-create-room)">
      <li v-for="index in created" :key="index">{{ index }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const created = ref(0);
</script>
