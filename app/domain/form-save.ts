import { computed, inject, onScopeDispose, provide, ref, shallowRef } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate } from "vue-router";

import { askQuestion } from "./question";

import type { ComputedRef, InjectionKey, Ref } from "vue";
import type { RouteLocationNormalized } from "vue-router";
import type { Translate } from "../../shared/wording";

// A form saves once, from its foot (`docs/components.md`, "Forms"). A form made of several blocks —
// each holding its own fields and knowing its own way of saving them — is one form all the same:
// the frame around them holds the one save and the guard on leaving, and each block hands it what
// only the block knows. A block that stands where no form holds it saves nothing through here and
// goes on as it was written for that place.

export interface FormPart {
  // Whether the block holds a change not yet saved: its fields read against what is saved.
  dirty: () => boolean;
  // Sends the block's changes at once, and once they went through takes what was saved as what it
  // holds, so it holds no change after; answers whether everything went through.
  save: () => Promise<boolean>;
  // Puts every field back to what is saved.
  discard: () => void;
}

export interface FormSave {
  dirty: ComputedRef<boolean>;
  saving: Ref<boolean>;
  // Saves block after block at once, stopping at the first refusal. Answers whether everything was
  // saved.
  save: () => Promise<boolean>;
  discard: () => void;
}

interface FormHold {
  add: (part: FormPart) => () => void;
}

const FORM: InjectionKey<FormHold> = Symbol("form-save");

// The question asked before the unsaved changes are thrown away, whichever way the reader is
// leaving: a dialog naming them, gone through only by discarding.
export function askDiscard(t: Translate, leaving = false): Promise<boolean> {
  return askQuestion({ title: t("common.title.discard_changes"), confirm: t("common.action.discard"), leaving });
}

// What floats a form over the screen — a dialog, a sheet — closes through here. While the form
// holds changes the floating thing is told not to close on its own, and every way it is asked to —
// its close button, Esc, a press outside, the back gesture, a drag away — asks first. A form with
// nothing changed, and a floating thing that is no form, close at once.
export function useCloseGuard(open: Ref<boolean>, dirty: () => boolean | undefined, t: Translate): { dismissible: ComputedRef<boolean>; leave: () => Promise<void> } {
  // One question at a time, since the back gesture may press Esc more than once while it stands.
  let asking = false;

  async function leave(): Promise<void> {
    if (asking) return;

    if (!dirty()) {
      open.value = false;
      return;
    }

    asking = true;

    try {
      if (await askDiscard(t)) open.value = false;
    } finally {
      asking = false;
    }
  }

  return { dismissible: computed(() => !dirty()), leave };
}

// The frame of a form: what its blocks hold, the one save over all of them, and throwing every
// change away.
export function useFormSave(t: Translate): FormSave {
  const parts = shallowRef<FormPart[]>([]);
  const saving = ref(false);

  provide(FORM, {
    add(part) {
      parts.value = [...parts.value, part];

      return () => {
        parts.value = parts.value.filter((one) => one !== part);
      };
    }
  });

  const dirty = computed(() => parts.value.some((part) => part.dirty()));

  async function save(): Promise<boolean> {
    const changed = parts.value.filter((part) => part.dirty());

    if (changed.length === 0 || saving.value) return false;

    saving.value = true;

    try {
      for (const part of changed) {
        if (!(await part.save())) return false;
      }

      return true;
    } finally {
      saving.value = false;
    }
  }

  function discard(): void {
    for (const part of parts.value) part.discard();
  }

  return { dirty, saving, save, discard };
}

// A block of a form. Answers whether a form holds it: where none does, the block saves as it was
// written to on its own.
export function useFormPart(part: FormPart): boolean {
  const hold = inject(FORM, null);

  if (hold === null) return false;

  onScopeDispose(hold.add(part));

  return true;
}

// A page or a tab holding a form asks before the reader leaves it with changes, whether to another
// page or to another tab of the same page. One press may set off more than one move — a tab is
// chosen as it takes the focus and again as it is clicked — and every move waiting meanwhile has the
// one question's answer. The focus handed back once the question is answered chooses that tab
// again with no press of the reader's, so a move just refused is refused again without asking until
// the reader presses something.
export function useLeaveGuard(dirty: Readonly<Ref<boolean>>, t: Translate): void {
  let asking: Promise<boolean> | null = null;
  let refused: string | null = null;

  const pressed = (): void => {
    refused = null;
  };

  const guard = (to: RouteLocationNormalized): boolean | Promise<boolean> => {
    if (!dirty.value) return true;
    if (refused === to.fullPath) return false;

    asking ??= askDiscard(t, true).then((taken) => {
      refused = taken ? null : to.fullPath;
      if (!taken) {
        window.addEventListener("pointerdown", pressed, { capture: true, once: true });
        window.addEventListener("keydown", pressed, { capture: true, once: true });
      }

      return taken;
    }).finally(() => {
      asking = null;
    });

    return asking;
  };

  onBeforeRouteLeave(guard);
  onBeforeRouteUpdate(guard);
}
