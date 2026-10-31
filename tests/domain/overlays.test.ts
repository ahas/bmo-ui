import { beforeEach, describe, expect, test } from "bun:test";

import { OFF_HISTORY, OVER_LAYERS, refuseHandedBackFocus, refuseStalePresses, standsAsLayer } from "~/domain/overlays";

// A press outside what floats closes it only while it is the press being handled.
//
// The component library cannot act on a touch press when it happens: a press and the tap it
// becomes are far apart on a touch screen, and a press may never become a tap at all. So it holds
// the press and waits, and a press that never got its tap is still waiting when the next one
// arrives — which is how a dialog comes to close on the very press meant to work it.
//
// Everything here is driven through the DOM the way the library drives it: a pointerdown, then
// the event the library raises on the pressed element naming the press it is acting on.

const OUTSIDE_PRESS = "dismissableLayer.pointerDownOutside";
const OUTSIDE_FOCUS = "dismissableLayer.focusOutside";
const HANDING_BACK = "focusScope.autoFocusOnUnmount";

let installed = false;

function press(): Event {
  const event = new Event("pointerdown", { bubbles: true, cancelable: true });

  document.body.dispatchEvent(event);

  return event;
}

// The library's own say: the layer is told a press landed outside it, and closes unless the event
// it was told with comes back refused.
function tellOutside(originalEvent: Event | null): boolean {
  const event = new CustomEvent(OUTSIDE_PRESS, { bubbles: false, cancelable: true, detail: { originalEvent } });

  document.body.dispatchEvent(event);

  return !event.defaultPrevented;
}

// A move of the focus, as the browser reports it where the focus lands.
function focusMove(): Event {
  const event = new Event("focusin", { bubbles: true });

  document.body.dispatchEvent(event);

  return event;
}

function turn(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// A layer going, as the library says so, and the focus handed back on its own later turn.
async function handBack(): Promise<Event> {
  const scope = document.createElement("div");

  document.body.append(scope);
  scope.dispatchEvent(new CustomEvent(HANDING_BACK, { bubbles: false, cancelable: true }));
  scope.remove();

  await turn();

  return focusMove();
}

// The library's own say on a layer the focus landed outside of: it closes unless refused.
function tellFocusOutside(originalEvent: Event): boolean {
  const event = new CustomEvent(OUTSIDE_FOCUS, { bubbles: false, cancelable: true, detail: { originalEvent } });

  document.body.dispatchEvent(event);

  return !event.defaultPrevented;
}

beforeEach(() => {
  if (!installed) {
    refuseStalePresses();
    refuseHandedBackFocus();
    installed = true;
  }
});

describe("the press being handled", () => {
  test("closes what it landed outside of", () => {
    expect(tellOutside(press())).toBe(true);
  });

  test("closes it however many presses came before it", () => {
    press();
    press();

    expect(tellOutside(press())).toBe(true);
  });
});

describe("a press that is not the one being handled", () => {
  test("closes nothing, which is the press left waiting by a finger that dragged away", () => {
    const dragged = press();

    press();

    expect(tellOutside(dragged)).toBe(false);
  });

  test("closes nothing when it names no press at all", () => {
    press();

    expect(tellOutside(null)).toBe(false);
  });

  test("stops being refused once the press it names is the one just made", () => {
    const dragged = press();

    press();
    expect(tellOutside(dragged)).toBe(false);

    const made = press();

    expect(tellOutside(made)).toBe(true);
  });
});

// A menu's choice that opens something else — a panel of details beside its button — has that
// something standing when the menu, going, hands the focus back to its own button, which is outside
// it.
describe("the focus a going layer hands back", () => {
  test("closes nothing it lands outside of, so what the choice opened stays open", async () => {
    expect(tellFocusOutside(await handBack())).toBe(false);
  });

  test("is only the move on the library's own turn: the reader's next move still closes", async () => {
    await handBack();
    await turn();
    await turn();

    expect(tellFocusOutside(focusMove())).toBe(true);
  });
});

// A region floats over every layer, the message pill over a dialog or a drawer among them: pressing
// or focusing what it offers is outside none of them.
describe("what floats over every layer", () => {
  function over(): HTMLElement {
    const region = document.createElement("div");
    const button = document.createElement("button");

    region.setAttribute(OVER_LAYERS, "");
    region.append(button);
    document.body.append(region);

    return button;
  }

  test("a press on it closes nothing, though it is the press being handled", () => {
    const button = over();
    const event = new Event("pointerdown", { bubbles: true, cancelable: true });

    button.dispatchEvent(event);

    expect(tellOutside(event)).toBe(false);
    button.parentElement?.remove();
  });

  test("a focus moved onto it closes nothing", () => {
    const button = over();
    const event = new Event("focusin", { bubbles: true });

    button.dispatchEvent(event);

    expect(tellFocusOutside(event)).toBe(false);
    button.parentElement?.remove();
  });
});

describe("a focus the reader moves", () => {
  test("closes what it moved out of", () => {
    expect(tellFocusOutside(focusMove())).toBe(true);
  });
});

// What floats while the page is being left holds that navigation, and an entry pushed for it would
// move with the navigation's own move of the history (`docs/components.md`, "Floating things").
describe("which floating things stand as layers of the back gesture", () => {
  function floated(state: string, marked: "none" | "itself" | "around" = "none"): Element {
    const around = document.createElement("div");
    const layer = document.createElement("div");

    layer.setAttribute("data-dismissable-layer", "");
    layer.setAttribute("data-state", state);
    if (marked === "itself") layer.setAttribute(OFF_HISTORY, "");
    if (marked === "around") around.setAttribute(OFF_HISTORY, "");
    around.append(layer);
    document.body.append(around);

    return layer;
  }

  test("an open one does, and a closed one or one taken off the page does not", () => {
    const open = floated("open");
    const closed = floated("closed");

    expect(standsAsLayer(open)).toBe(true);
    expect(standsAsLayer(closed)).toBe(false);

    open.parentElement?.remove();
    closed.parentElement?.remove();

    expect(standsAsLayer(open)).toBe(false);
  });

  test("one standing while the page is left does not, the mark on it or around it", () => {
    const itself = floated("open", "itself");
    const around = floated("open", "around");

    expect(standsAsLayer(itself)).toBe(false);
    expect(standsAsLayer(around)).toBe(false);

    itself.parentElement?.remove();
    around.parentElement?.remove();
  });
});
