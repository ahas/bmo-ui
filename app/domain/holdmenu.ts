import { followSurface, useLongPress } from "./longpress";

// A context menu a held finger opens through the one long press (`docs/components.md`, "A held
// finger"), on a surface that is the menu's trigger or stands inside it. The menu component times
// a finger of its own, and the browser reads a long press into a menu event of its own as well;
// either would open the menu on a press the shared one has already given up for a scroll. So both
// are kept away here, and the shared hold, once it fires, asks for the menu at the finger the way a
// right press does.
//
// A finger's press on the surface also selects no words: a phone reads a long press on text as the
// start of a selection, which would take the hold before the menu could. The words stay selectable
// to a mouse, so they are turned away for the finger alone, from its press until a mouse or a pen
// presses there instead, and never in a field.

// What the surface turns off once a finger has pressed on it: the selection, under both of the
// names browsers read it by, and the phone's own menu over a link or a picture.
const SELECTION_PROPERTIES = ["user-select", "-webkit-user-select", "-webkit-touch-callout"];

export interface HoldMenu {
  surface: () => HTMLElement | null;
  // Whether a hold opens the menu now; nothing said, it always does.
  open?: () => boolean;
}

// What a finger pressing on it is left to do on its own: a field takes its caret and its words.
function editable(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']") !== null;
}

export function useHoldMenu(menu: HoldMenu): void {
  // Whether the press now under way came from a finger.
  let touched = false;
  // Whether the surface now selects no words.
  let wordsOff = false;

  function turnWordsOff(surface: HTMLElement, off: boolean): void {
    if (off === wordsOff) {
      return;
    }

    for (const property of SELECTION_PROPERTIES) {
      if (off) {
        surface.style.setProperty(property, "none");
      } else {
        surface.style.removeProperty(property);
      }
    }

    wordsOff = off;
  }

  // A finger's press is marked as handled, which is what keeps the menu component's own timer from
  // starting on it.
  function onPointerDown(event: PointerEvent): void {
    touched = event.pointerType === "touch";

    const held = touched && !editable(event.target);

    if (event.currentTarget instanceof HTMLElement) {
      turnWordsOff(event.currentTarget, held);
    }

    if (held) {
      event.preventDefault();
    }
  }

  // The browser's own long press is turned away; the right press of a mouse, and the menu the hold
  // asks for, go through.
  function onContextMenu(event: MouseEvent): void {
    if (event.isTrusted && touched && !editable(event.target)) {
      event.preventDefault();
    }
  }

  followSurface(
    menu.surface,
    (surface) => {
      surface.addEventListener("pointerdown", onPointerDown, true);
      surface.addEventListener("contextmenu", onContextMenu, true);
    },
    (surface) => {
      turnWordsOff(surface, false);
      surface.removeEventListener("pointerdown", onPointerDown, true);
      surface.removeEventListener("contextmenu", onContextMenu, true);
    }
  );

  useLongPress({
    surface: menu.surface,
    press: (target, at) => {
      if (editable(target) || (menu.open !== undefined && !menu.open())) {
        return null;
      }

      return () => {
        target.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: at.x, clientY: at.y }));
      };
    }
  });
}
