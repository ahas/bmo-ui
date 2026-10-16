// What a press on a fenced block's copy button does. The host's renderer draws the button beside
// the block (`docs/boundary.md`, "Classes and keyframes"); the component that put the text on the
// screen hands every press on that text here. The block is taken as it was written — the lines
// inside the fence, without the blank lines around them — and the button says it was copied for a
// moment before going back.

import type { Translate } from "../../shared/wording";

// How long the button says it was copied.
const SHOWN_FOR_MS = 1500;

// The lines inside a fence, without the blank lines standing before them or the space after them.
// A leading indent is kept: it is part of the first line.
export function blockText(raw: string): string {
  return raw.replace(/^(?:[ \t]*\n)+/, "").replace(/\s+$/, "");
}

const shown = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

function mark(t: Translate, button: HTMLElement, copied: boolean): void {
  const label = copied ? t("common.status.copied") : t("common.action.copy");

  if (copied) button.dataset.copied = "";
  else delete button.dataset.copied;
  button.setAttribute("aria-label", label);
  button.dataset.tooltip = label;
}

// Whether the press was on a copy button, and so taken. A press anywhere else in the text is left
// alone for whatever else listens to it.
export function copyFromPress(
  t: Translate,
  event: Event,
  copy: (text: string) => Promise<boolean>,
  shownFor = SHOWN_FOR_MS
): boolean {
  const button = (event.target as Element | null)?.closest<HTMLElement>("button[data-copy]");

  if (button === null || button === undefined) return false;

  event.preventDefault();
  event.stopPropagation();

  const block = button.parentElement?.querySelector("pre");

  void copy(blockText(block?.textContent ?? "")).then((copied) => {
    if (!copied) return;

    clearTimeout(shown.get(button));
    mark(t, button, true);
    shown.set(button, setTimeout(() => mark(t, button, false), shownFor));
  });

  return true;
}
