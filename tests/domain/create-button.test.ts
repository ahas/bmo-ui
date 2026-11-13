import { describe, expect, test } from "bun:test";
import { shallowRef } from "vue";

import { menuContent } from "~/domain/create-button";

import type { CreateButtonHandle } from "~/domain/create-button";

// The settings a menu wrapped round the create button takes for its content: an anchor reading the
// button wherever it stands as the menu places itself, made before any button is drawn.

function drawn(element: HTMLElement | null): CreateButtonHandle {
  return { element: () => element };
}

describe("a menu's settings round the create button", () => {
  test("stand before any button is drawn, with an empty box and no element", () => {
    const content = menuContent(shallowRef<CreateButtonHandle | null>(null));

    expect(content.reference.getBoundingClientRect()).toMatchObject({ width: 0, height: 0 });
    expect(content.reference.contextElement).toBeUndefined();
  });

  test("follow the button the create button draws now, not the one drawn as they were made", () => {
    const wide = document.createElement("button");
    const floating = document.createElement("button");
    const button = shallowRef<CreateButtonHandle | null>(drawn(wide));
    const content = menuContent(button);

    button.value = drawn(floating);
    document.body.append(floating);
    const closed = new Event("focus.autoFocusOnUnmount", { cancelable: true });

    content.onCloseAutoFocus(closed);

    expect(content.reference.contextElement).toBe(floating);
    expect(document.activeElement).toBe(floating);
    expect(closed.defaultPrevented).toBe(true);

    floating.remove();
  });

  test("leave a focus the reader moved out of the menu where it went", () => {
    const button = document.createElement("button");
    const field = document.createElement("input");
    const content = menuContent(shallowRef<CreateButtonHandle | null>(drawn(button)));

    document.body.append(button, field);
    field.focus();
    content.onCloseAutoFocus(new Event("focus.autoFocusOnUnmount", { cancelable: true }));

    expect(document.activeElement).toBe(field);

    button.remove();
    field.remove();
  });
});
