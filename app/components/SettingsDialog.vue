<template>
  <!-- A small dialog of its own — a form, a confirmation, a search: in the middle of the screen at
       every width, since it is no part of the page lifted out. The body is the form; the actions
       stand at the right of the foot. A form's dialog says whether it holds changes, and every way
       of closing it — the foot's cancel among them, through the close the foot is handed — then
       asks first whether to throw them away (`docs/components.md`, "Forms"). -->
  <UModal
    v-model:open="open"
    :title="props.title"
    :description="props.description"
    :dismissible="guard.dismissible.value"
    :ui="{ content: props.wide ? 'sm:max-w-4xl' : 'sm:max-w-xl' }"
    @close:prevent="void guard.leave()"
  >
    <template #close="{ ui }">
      <ShellClose :class="ui.close()" @close="void guard.leave()" />
    </template>

    <template #body>
      <div class="flex min-w-0 flex-col gap-4">
        <slot />
      </div>
    </template>

    <template v-if="$slots.footer" #footer>
      <div class="flex w-full flex-wrap items-center justify-end gap-2">
        <slot name="footer" :close="() => void guard.leave()" />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { useCloseGuard } from "../domain/form-save";

interface Props {
  title: string;
  description?: string;
  // Room for a settings table's row across its columns rather than a form's one field.
  wide?: boolean;
  // Whether the form it holds has changes not yet saved; left out, it is no form and closes at once.
  dirty?: boolean;
}

const props = withDefaults(defineProps<Props>(), { description: undefined, dirty: undefined });
const open = defineModel<boolean>("open", { default: false });
const { t } = useI18n();

const guard = useCloseGuard(open, () => props.dirty, t);
</script>
