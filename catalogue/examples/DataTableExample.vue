<template>
  <DataTable :data="files" :columns="columns" layout="fill" selectable @select="open">
    <template #name-cell="{ row }">
      <span class="flex min-w-0 items-center gap-2">
        <UIcon :name="fileIcon(row.original.name)" class="size-4 shrink-0" />
        <span class="truncate">{{ row.original.name }}</span>
      </span>
    </template>
  </DataTable>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { fileIcon } from "../../app/domain/file-icons";

import type { TableColumn } from "@nuxt/ui";

interface FileRow {
  name: string;
  size: string;
}

const { t } = useI18n();
const files: FileRow[] = [
  { name: "plan.md", size: "4 KB" },
  { name: "report.pdf", size: "1.2 MB" }
];
const columns = computed<TableColumn<FileRow>[]>(() => [
  { accessorKey: "name", header: t("notes.label.name") },
  { accessorKey: "size", header: t("notes.label.size") }
]);

function open(row: FileRow): void {
  console.info(`opening ${row.name}`);
}
</script>
