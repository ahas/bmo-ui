import { useNarrow } from "./screen";

import type { ComputedRef } from "vue";

// Whose hand is on the keys. A screen keyboard has one key for a line break and it is Enter, so
// on a machine whose main pointer is a finger Enter breaks the line and sending is the button's
// alone. Width says nothing about the keyboard — a narrowed desktop window still has Shift, a
// tablet on its side is wide and still has only Enter — and a laptop with a touch screen keeps a
// trackpad as its main pointer, so it stays on the desktop side.
export const TOUCH_QUERY = "(pointer: coarse)";

// How long after a composition ended a second Enter still belongs to it. Some browsers follow the
// composing Enter with a plain one once the syllable is committed; that one is the same press.
const COMPOSED_ECHO_MS = 80;

// How long a send asked for mid-composition waits for the composition to end before it is let go.
const COMPOSED_WAIT_MS = 500;

export interface EnterKeys {
  keydown: (event: KeyboardEvent) => void;
  compositionend: () => void;
}

// What Enter does in a box that sends. Where Enter sends, a plain Enter sends at once — also when
// it is the key that commits a Hangul syllable: the commit is let finish and the text goes with
// the syllable in it, so the press never turns into a line break. Shift+Enter and Alt+Enter break
// the line. Where Enter does not send, the keys are the browser's and the prompt's own.
//
// The handlers stand in the capture phase and take a plain Enter away from the prompt, whose own
// handler would either send without the pending syllable or leave the line break behind. A box
// that carries something besides its words — a file — sends on Enter with no words at all.
export function enterKeys(
  send: () => void,
  submitsOnEnter: () => boolean,
  clock: () => number = Date.now,
  later: (run: () => void, ms: number) => unknown = setTimeout,
  holds: () => boolean = () => false
): EnterKeys {
  let queued = false;
  let queuedAt = 0;
  let composedAt = Number.NEGATIVE_INFINITY;
  let box: EventTarget | null = null;

  function sendIfWritten(box: EventTarget | null): void {
    const value = (box as HTMLTextAreaElement | null)?.value ?? "";

    if (value.trim() !== "" || holds()) {
      send();
    }
  }

  function keydown(event: KeyboardEvent): void {
    if (event.key !== "Enter" || !submitsOnEnter() || event.ctrlKey || event.metaKey) {
      return;
    }

    if (event.shiftKey) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.altKey) {
      breakLine(event.target);

      return;
    }

    if (event.isComposing || event.keyCode === 229) {
      queued = true;
      queuedAt = clock();
      box = event.target;

      return;
    }

    if (clock() - composedAt < COMPOSED_ECHO_MS) {
      return;
    }

    sendIfWritten(event.target);
  }

  function compositionend(): void {
    if (!queued) {
      return;
    }

    queued = false;

    if (clock() - queuedAt > COMPOSED_WAIT_MS) {
      return;
    }

    composedAt = clock();

    const target = box;

    // The committed syllable reaches the model on the box's own compositionend, which runs after
    // this one; the send waits for it.
    later(() => sendIfWritten(target), 0);
  }

  return { keydown, compositionend };
}

// A line break put where the caret is, the way a typed one would be: through the editing command
// where the browser still has it, so undo keeps it, and by hand with an input event otherwise.
function breakLine(target: EventTarget | null): void {
  const box = target as HTMLTextAreaElement | null;

  if (box === null || typeof box.setRangeText !== "function") {
    return;
  }

  if (typeof document !== "undefined" && document.execCommand?.("insertText", false, "\n")) {
    return;
  }

  box.setRangeText("\n", box.selectionStart, box.selectionEnd, "end");
  box.dispatchEvent(new Event("input", { bubbles: true }));
}

export interface PromptEnter {
  submitOnEnter: ComputedRef<boolean>;
  enter: EnterKeys;
}

// What Enter does in a prompt on this machine, for every prompt at once. A server render knows no
// pointer and answers as a desktop; the browser corrects it once it has the page.
export function usePromptEnter(send: () => void, holds: () => boolean = () => false): PromptEnter {
  const touch = useNarrow(TOUCH_QUERY);
  const submitOnEnter = computed<boolean>(() => !touch.value);

  return {
    submitOnEnter,
    enter: enterKeys(send, () => submitOnEnter.value, Date.now, setTimeout, holds)
  };
}

// How far a prompt grows with what is written in it: eight rows, and never past three tenths of
// the visible height, which is the smaller on a phone with its keyboard up. Past that the box
// scrolls inside, so a long text never pushes the column's foot off the screen.
export const PROMPT_MAX_ROWS = 8;
export const PROMPT_TEXTAREA_UI = { base: "max-h-[calc(var(--bmo-screen)*0.3)] overflow-y-auto overscroll-contain" };

// How the words break in a box being written in (`docs/design.md`, "Writing boxes"): each line
// filled before the next and never laid out again for what is typed after it, a Hangul word between
// its syllables rather than moved to the next line whole, and a run with no break in it anywhere.
// The words take no break rule from whatever holds the box.
export const PROMPT_WORDS_WRAP = "[word-break:normal] wrap-anywhere [text-wrap-style:stable]";
