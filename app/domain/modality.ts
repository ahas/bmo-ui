// Which hand last moved the focus: the keyboard, or a press of the mouse or a finger. A text box
// holds the caret however it was focused, so the browser counts every focus of one as visible, and
// what draws only for the keyboard there reads this mark instead (`docs/design.md`, "Focus").

export type InputModality = "key" | "pointer";

export const MODALITY_ATTRIBUTE = "data-input";

// The keys that move the focus rather than type into what holds it.
const FOCUS_KEYS = new Set(["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape"]);

// What a key press says of the hand: a key that moves the focus is the keyboard's; any other, typed
// into a box already focused, changes nothing.
export function modalityOfKey(key: string): InputModality | null {
  return FOCUS_KEYS.has(key) ? "key" : null;
}

export function watchInputModality(page: Document): void {
  const root = page.documentElement;

  page.addEventListener(
    "keydown",
    (event) => {
      const modality = modalityOfKey(event.key);

      if (modality !== null) {
        root.setAttribute(MODALITY_ATTRIBUTE, modality);
      }
    },
    { capture: true }
  );
  page.addEventListener("pointerdown", () => root.setAttribute(MODALITY_ATTRIBUTE, "pointer"), { capture: true });
}
