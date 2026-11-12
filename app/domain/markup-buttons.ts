// A button a host writes as markup rather than through the layer's icon button: a fenced block's
// copy button, a diagram's zoom buttons (`docs/boundary.md`, "Classes and keyframes"). It carries its
// name in `data-tooltip` beside its `aria-label`, and the markup button layer names it in the shared
// tooltip (`docs/components.md`, "Tooltips").

// What such a button is, as a selector.
export const MARKUP_BUTTON = "button[data-tooltip]";

// The markup button a pointer or a finger is on, itself or something inside it.
export function markupButtonAt(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(MARKUP_BUTTON) : null;
}

// The markup button a keyboard focus landing here names: the focused element alone, since a button
// holds no other control.
export function markupButtonIn(focused: Element): HTMLElement | null {
  return focused instanceof HTMLElement && focused.matches(MARKUP_BUTTON) ? focused : null;
}

export function markupButtonWords(button: HTMLElement): string {
  return button.dataset.tooltip?.trim() ?? "";
}
