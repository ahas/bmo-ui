<template>
  <!-- An upload under way, above the list's foot: how many files of how many have arrived and how
       much of all their bytes, with a bar of the same share. -->
  <div v-if="props.progress !== null" class="flex h-9 shrink-0 items-center gap-3 border-t border-default px-4 text-sm tabular-nums text-muted" role="status" :aria-label="$t('files.status.uploading')">
    <UIcon name="i-material-symbols-progress-activity" class="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
    <span class="shrink-0">{{ $t("files.label.progress", { done: countText(props.progress.done), all: countText(props.progress.all), percent: percent }) }}</span>
    <UProgress :model-value="percent" size="sm" class="min-w-0 flex-1" />
  </div>
</template>

<script setup lang="ts">
import { countText } from "../domain/numbers";

/** How far an upload has come: files arrived of all of them, and bytes sent of all theirs. */
export interface FilesUploading {
  done: number;
  all: number;
  sent: number;
  bytes: number;
}

const props = defineProps<{ progress: FilesUploading | null }>();

const percent = computed(() => {
  const progress = props.progress;

  if (progress === null) return 0;

  return progress.bytes === 0 ? Math.round((progress.done / Math.max(1, progress.all)) * 100) : Math.min(100, Math.round((progress.sent / progress.bytes) * 100));
});
</script>
