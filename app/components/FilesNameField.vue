<template>
  <!-- An entry's name as a field while it is renamed in place: chosen up to its ending, as a file
       explorer does, so typing replaces the name and keeps its type. Enter or leaving the field
       keeps what was typed; Escape gives it up. -->
  <UInput
    ref="field"
    v-model="draft"
    size="sm"
    class="w-full select-text"
    :aria-label="$t('files.aria.name_field')"
    @keydown.enter.prevent.stop="commit"
    @keydown.esc.prevent.stop="cancel"
    @keydown.stop
    @blur="commit"
    @click.stop
    @dblclick.stop
    @pointerdown.stop
  />
</template>

<script setup lang="ts">
interface Props {
  name: string;
  folder: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{ rename: [name: string]; cancel: [] }>();

const draft = ref(props.name);
const field = useTemplateRef<{ inputRef?: HTMLInputElement }>("field");
let settled = false;

onMounted(async () => {
  await nextTick();

  const input = field.value?.inputRef;
  const dot = props.folder ? -1 : props.name.lastIndexOf(".");

  input?.focus();
  input?.setSelectionRange(0, dot > 0 ? dot : props.name.length);
});

function commit(): void {
  if (settled) return;

  settled = true;
  emit("rename", draft.value.trim());
}

function cancel(): void {
  if (settled) return;

  settled = true;
  emit("cancel");
}
</script>
