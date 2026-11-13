import type { Ref } from "vue";

// A menu or popover wrapped round the create button (`docs/components.md`, "Creating"). The library
// takes its trigger's element for the place the menu stands and for the focus it hands back as it
// closes. The create button's own element is neither of those: on a wide screen it is the button's
// cell, which takes no focus, and on a phone the button floats elsewhere in the page and nothing of it
// stands in the menu's own place. So the menu is handed the button itself, read through what the
// create button exposes, wherever the button stands at the moment the menu places itself.
//
// The settings are made once, as the screen is set up, and handed to the menu's content from its first
// drawing on: the library passes on to the content only the settings present as the content is first
// set up, and an anchor added later never reaches it.

// What the create button exposes: the button itself, or null while none is drawn.
export interface CreateButtonHandle {
  element: () => HTMLElement | null;
}

// The place a menu stands against: the button's box, and the button as the element whose scrolling
// ancestors move it.
export interface CreateAnchor {
  getBoundingClientRect: () => DOMRect;
  readonly contextElement: HTMLElement | undefined;
}

// What a menu or popover wrapped round the create button takes for its content. It stands at the
// button's end edge, since the button stands at the right end of its row and at a phone's bottom right.
export interface CreateMenuContent {
  align: "end";
  reference: CreateAnchor;
  onCloseAutoFocus: (event: Event) => void;
}

// Whether the focus stands in the closing menu or nowhere, so handing it back moves nothing the
// reader chose.
function heldBy(menu: EventTarget | null): boolean {
  const focused = document.activeElement;

  return focused === null || focused === document.body || (menu instanceof Node && menu.contains(focused));
}

export function menuContent(button: Readonly<Ref<CreateButtonHandle | null>>): CreateMenuContent {
  const element = (): HTMLElement | null => button.value?.element() ?? null;

  return {
    align: "end",
    reference: {
      getBoundingClientRect: () => element()?.getBoundingClientRect() ?? new DOMRect(),
      get contextElement() {
        return element() ?? undefined;
      }
    },
    // The focus the menu held goes back to the button, not to what the library took for the trigger;
    // a focus the reader already moved elsewhere, a press on a field outside the menu, stays there.
    onCloseAutoFocus: (event) => {
      event.preventDefault();

      if (heldBy(event.target)) element()?.focus();
    }
  };
}
