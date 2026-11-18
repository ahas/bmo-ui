import { computed, getCurrentScope, inject, nextTick, onScopeDispose, provide, ref, shallowRef, toRaw, toValue, watch } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate } from "vue-router";

import { askQuestion } from "./question";

import type { ComputedRef, InjectionKey, MaybeRefOrGetter, Ref } from "vue";
import type { RouteLocationNormalized } from "vue-router";
import type { Translate } from "../../shared/wording";

// A form saves once, from its foot (`docs/components.md`, "Forms"). A form made of several blocks —
// each holding its own fields and knowing its own way of saving them — is one form all the same:
// the frame around them holds the one save and the guard on leaving, and each block hands it what
// only the block knows. A block that stands where no form holds it saves nothing through here and
// goes on as it was written for that place.

// What a form opened with, read against what it holds now: the one reading of whether a form holds
// changes. The screen hands the form's values; the snapshot is taken of them once the form stands
// open with its data in it, and is taken again after a save.
export interface OpenedWith {
  // Whether the values differ from the snapshot; never before one is taken.
  dirty: ComputedRef<boolean>;
  // Takes the snapshot again from the values as they stand once what is under way has been drawn,
  // as after a save that went through; nothing while the form is closed or its data not yet in it.
  take: () => Promise<void>;
}

export interface OpenedWithOptions {
  // Whether what floats the form stands open; left out, the form is open for as long as it stands.
  open?: Readonly<Ref<boolean>>;
  // Whether the form's data is in it; left out, it is the moment the form opens.
  ready?: MaybeRefOrGetter<boolean>;
}

// What tells whether a form or a block holds a change: its opened-with snapshot, or, for one with no
// values to hand, a check of its own.
type Changes = OpenedWith | (() => boolean | undefined);

interface ChangesRead {
  holds: () => boolean;
  // Takes the snapshot again where there is one.
  retake: () => Promise<void>;
}

function readChanges(changes: Changes): ChangesRead {
  if (typeof changes === "function") return { holds: () => changes() === true, retake: async () => undefined };

  return { holds: () => changes.dirty.value, retake: changes.take };
}

// A value as the form's inputs leave it, so two values the reader would call the same compare alike:
// text trimmed, a number as the text an input writes for it, a date or a time as the text it gives
// for itself, every kind of nothing one empty, a record without its empty keys, a list item by item,
// and any other object itself. What is built holds no reactive proxy and shares nothing that can
// change with the values it was read from, so it keeps as a snapshot.
const EMPTY = Symbol("empty");

function settled(value: unknown): unknown {
  const raw: unknown = toRaw(value);

  if (raw === null || raw === undefined) return EMPTY;

  switch (typeof raw) {
    case "string": {
      const text = raw.trim();

      return text === "" ? EMPTY : text;
    }
    case "number":
      return Number.isNaN(raw) ? EMPTY : String(raw);
    case "bigint":
      return String(raw);
    case "object":
      break;
    default:
      return raw;
  }

  // The reactive value itself is walked rather than the raw one, so a read of the settled values
  // follows every field they hold.
  const source = value as Record<string, unknown>;

  if (Array.isArray(raw)) return raw.length === 0 ? EMPTY : (source as unknown as unknown[]).map(settled);

  const prototype: unknown = Object.getPrototypeOf(raw);

  if (prototype === Object.prototype || prototype === null) {
    const kept: Record<string, unknown> = {};

    for (const key of Object.keys(source)) {
      const one = settled(source[key]);

      if (one !== EMPTY) kept[key] = one;
    }

    return Object.keys(kept).length === 0 ? EMPTY : kept;
  }

  return ownText(raw as object) ?? raw;
}

// The text an object gives for itself, as a date gives its ISO text, or nothing where it gives none
// of its own.
function ownText(raw: object): unknown {
  const written = raw as { toJSON?: () => unknown; toString: () => string };

  if (typeof written.toJSON === "function") {
    const json = written.toJSON();

    return json === raw ? undefined : settled(json);
  }

  // A text that only names the object's kind, as every object without one of its own gives, is none.
  const text = String(raw);

  return /^\[object [^\]]*\]$/.test(text) ? undefined : settled(text);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;

  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function alike(first: unknown, second: unknown): boolean {
  if (first === second) return true;

  if (Array.isArray(first) && Array.isArray(second)) return first.length === second.length && first.every((one, at) => alike(one, second[at]));

  if (isRecord(first) && isRecord(second)) {
    const keys = Object.keys(first);

    return keys.length === Object.keys(second).length && keys.every((key) => key in second && alike(first[key], second[key]));
  }

  return false;
}

// What the reader does that ends a form being filled: a press, a key or a word typed anywhere on the
// page.
const PRESSES = ["pointerdown", "keydown", "input"] as const;

// The opened-with snapshot of a form (`docs/components.md`, "Forms"). It is taken when the form
// opens and is ready, once what the opening set off has been drawn; until the reader then first
// presses or types anywhere on the page, a change of the values is the form being filled and the
// snapshot follows it. Closing drops it. A page drawn on the server holds no change and keeps nothing
// to follow, since no reader stands at it.
export function useOpenedWith(values: () => unknown, options: OpenedWithOptions = {}): OpenedWith {
  if (import.meta.server) return { dirty: computed(() => false), take: async () => undefined };

  const taken = shallowRef<{ values: unknown } | null>(null);
  const now = computed(() => settled(values()));
  const isOpen = (): boolean => options.open?.value ?? true;
  const standing = computed(() => isOpen() && toValue(options.ready ?? true));
  // Ends the form being filled: set while the snapshot follows the values.
  let filled: (() => void) | null = null;
  // Whether the scope holding the snapshot has ended, so a snapshot due after that is never taken.
  let gone = false;

  function follow(): void {
    // Every change is caught as it is made, so the form never reads as changed while it is filled.
    const stop = watch(now, (values) => {
      taken.value = { values };
    }, { flush: "sync" });
    const pressed = (): void => filled?.();

    filled = () => {
      stop();
      filled = null;
      for (const kind of PRESSES) document.removeEventListener(kind, pressed, { capture: true });
    };
    for (const kind of PRESSES) document.addEventListener(kind, pressed, { capture: true });
  }

  function drop(): void {
    taken.value = null;
    filled?.();
  }

  // Only a form that stands is taken again: a snapshot set while it is closed or not yet ready would
  // stand in for the one its standing takes, which then neither takes its own nor follows the form
  // being filled.
  async function take(): Promise<void> {
    await nextTick();

    if (gone || !standing.value) return;

    taken.value = { values: now.value };
  }

  watch(
    standing,
    (stands) => {
      if (!stands) {
        if (!isOpen()) drop();

        return;
      }

      if (taken.value !== null) return;

      void nextTick(() => {
        if (gone || !standing.value || taken.value !== null) return;

        taken.value = { values: now.value };
        follow();
      });
    },
    { immediate: true, flush: "post" }
  );

  if (getCurrentScope() !== undefined) {
    onScopeDispose(() => {
      gone = true;
      drop();
    });
  }

  return { dirty: computed(() => taken.value !== null && !alike(taken.value.values, now.value)), take };
}

export interface FormPart {
  // Whether the block holds a change not yet saved: its values' opened-with snapshot, or for a block
  // with no values to hand, its fields read against what is saved.
  dirty: Changes;
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

// What floats a form over the screen — a dialog, a sheet — closes through here. Every request to
// close reaches the guard through the floating thing's open state: its close button, Esc, a press
// outside, the back gesture and a drag away all ask first while the form holds changes, and a form
// with nothing changed, and a floating thing that is no form, close at once. The floating thing is
// left to dismiss itself, with the guard the one refusal, so an outside interaction it refuses on
// its own — a menu handing the focus back to its trigger — is no request to close and asks nothing.
// `dismissible` says whether the form holds no change, for a host that binds it to its own floating
// thing; one that does so and answers the component library's refused close by leaving asks at such
// a refused focus too, since the library reports every outside interaction it holds off. The form
// says what it holds through its opened-with snapshot, or, with no values to hand, through a check
// of its own.
export function useCloseGuard(open: Ref<boolean>, changes: Changes, t: Translate): { dismissible: ComputedRef<boolean>; leave: () => Promise<void> } {
  const read = readChanges(changes);
  // One question at a time, since the back gesture may press Esc more than once while it stands.
  let asking = false;

  // A floating thing already closed is left alone: one press may ask it to close twice — its close
  // button and the component library's own close around it — and once the first has closed it the
  // screen may clear its form, which must not read as a change.
  async function leave(): Promise<void> {
    if (asking || !open.value) return;

    if (!read.holds()) {
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

  return { dismissible: computed(() => !read.holds()), leave };
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

  const dirty = computed(() => parts.value.some((part) => readChanges(part.dirty).holds()));

  async function save(): Promise<boolean> {
    const changed = parts.value.filter((part) => readChanges(part.dirty).holds());

    if (changed.length === 0 || saving.value) return false;

    saving.value = true;

    try {
      for (const part of changed) {
        if (!(await part.save())) return false;

        await readChanges(part.dirty).retake();
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
