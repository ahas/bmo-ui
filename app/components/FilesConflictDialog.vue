<template>
  <!-- A change that would land on names already taken, asked once for all of them
       (`docs/components.md`, "Code and files"): replace what stands there, keep both under a
       numbered name, skip the ones that collide, or give the change up. Closing it any other way
       gives it up. -->
  <UModal v-model:open="open" :title="$t('files.message.conflict')" :ui="{ footer: 'justify-end' }">
    <template #body>
      <ul class="flex max-h-64 flex-col gap-1 overflow-y-auto text-sm">
        <li v-for="name in props.names" :key="name" class="truncate text-highlighted">{{ name }}</li>
      </ul>
    </template>

    <template #footer>
      <UButton color="neutral" variant="ghost" :label="$t('common.action.cancel')" @click="answer(null)" />
      <UButton color="neutral" variant="outline" :label="$t('files.action.skip')" @click="answer('skip')" />
      <UButton color="neutral" variant="outline" :label="$t('files.action.keep_both')" @click="answer('rename')" />
      <UButton color="primary" :label="$t('files.action.replace')" @click="answer('replace')" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { FileConflict } from "#shared/files";

interface Props {
  names: readonly string[];
}

const props = defineProps<Props>();
const emit = defineEmits<{ answer: [choice: Exclude<FileConflict, "refuse"> | null] }>();
const open = defineModel<boolean>("open", { required: true });

let answered = false;

watch(open, (now) => {
  if (now) {
    answered = false;
  } else if (!answered) {
    emit("answer", null);
  }
});

function answer(choice: Exclude<FileConflict, "refuse"> | null): void {
  answered = true;
  open.value = false;
  emit("answer", choice);
}
</script>
