<template>
  <!-- A small dialog of its own — a form, a search: in the middle of the screen at every width,
       since it is no part of the page lifted out. The body is the form; the actions stand at the
       right of the foot. A form's dialog is handed its form's opened-with snapshot (or, for a form
       with no values to hand, whether it holds changes), and every way of closing it
       — the foot's cancel among them, through the close the foot is handed — then asks first, in
       the question dialog over it, whether to throw them away (`docs/components.md`, "Forms"). The
       modal's own close, which the close in its corner sets off beside what the close says, is a
       request to leave like any other, so the open state is never bound both ways. -->
  <UModal
    :open="open"
    :title="props.title"
    :description="props.description"
    :dismissible="guard.dismissible.value"
    :ui="{ content: props.wide ? 'sm:max-w-4xl' : 'sm:max-w-xl' }"
    @update:open="(standing: boolean) => (standing ? (open = true) : void guard.leave())"
    @close:prevent="void guard.leave()"
  >
    <template #close="{ ui }">
      <!-- Pressed, it reaches the guard through the modal's own close alone, so it asks only once. -->
      <ShellClose :class="ui.close()" />
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

import type { OpenedWith } from "../domain/form-save";

interface Props {
  title: string;
  description?: string;
  // Room for a settings table's row across its columns rather than a form's one field.
  wide?: boolean;
  // The opened-with snapshot of the form it holds, or for a form with no values to hand whether it
  // has changes not yet saved; left out, it is no form and closes at once.
  dirty?: boolean | OpenedWith;
}

const props = withDefaults(defineProps<Props>(), { description: undefined, dirty: undefined });
const open = defineModel<boolean>("open", { default: false });
const { t } = useI18n();

const guard = useCloseGuard(open, () => (typeof props.dirty === "object" ? props.dirty.dirty.value : props.dirty), t);
</script>
