<template>
  <div class="flex flex-col">
    <ToolBar :label="t('notes.aria.list_tools')">
      <div>
        <span>{{ t("notes.label.notes") }}</span>
      </div>
      <UDropdownMenu :items="kinds" :content="createMenu">
        <CreateButton ref="create" class="ms-auto" :label="t('notes.action.new')" />
      </UDropdownMenu>
    </ToolBar>
    <ul class="pb-(--bmo-create-room)">
      <li v-for="(kind, index) in created" :key="index">{{ kind }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import { menuContent } from "../../app/domain/create-button";

import type { DropdownMenuItem } from "@nuxt/ui";
import type { CreateButtonHandle } from "../../app/domain/create-button";

const { t } = useI18n();
const created = ref<string[]>([]);

// The menu stands on the button wherever it is drawn, from settings made once as the screen is set up.
const create = useTemplateRef<CreateButtonHandle>("create");
const createMenu = menuContent(create);

const kinds = computed((): DropdownMenuItem[][] => [
  [
    { label: t("notes.action.new_note"), onSelect: () => created.value.push(t("notes.label.note")) },
    { label: t("notes.action.new_folder"), onSelect: () => created.value.push(t("notes.label.folder")) }
  ]
]);
</script>
