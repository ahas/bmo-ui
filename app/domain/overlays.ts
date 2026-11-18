import { closeLayer, listenForBack, openLayer } from "./layers";

// Everything the component library floats over the page — a dialog, a sheet, a drawer, a popover,
// a dropdown or select list, a context menu — is a layer of the back gesture, and none of them
// says so for itself. They are found on the page instead: the library marks every one of them as
// a dismissable layer and says on the same element whether it stands open, so watching the page
// for those marks finds each one the moment it opens and the moment it closes, whichever screen
// drew it and whether or not that screen was written knowing about the gesture. A screen added
// later cannot be the one that forgot.
//
// A tooltip carries the same mark but never stands "open": its states say how it was brought up
// instead, and it answers the pointer rather than a press, so it is not a layer.
//
// What closes a layer here is the Esc key, which every one of them answers and which the library
// hands only to the top one — the same way a keyboard closes it.

const LAYER = "[data-dismissable-layer]";

// The event the library raises on a layer when a press landed outside it, cancellable, and the
// only say anything here has in whether that press closes anything. It is dispatched on the
// pressed element and does not bubble, so it is caught on the way down instead.
const OUTSIDE_PRESS = "dismissableLayer.pointerDownOutside";

// What floats over every layer rather than standing in one carries this attribute: a region whose
// words stand over whatever dialog or drawer is open, the message pill among them
// (`docs/components.md`, "Floating things"). A press or a focus there is outside no layer, so
// pressing it never puts away what stands under it.
export const OVER_LAYERS = "data-over-layers";

// What floats while the page is being left carries this attribute, on the element the library
// marks as a layer or around it: it is holding a navigation, and an entry pushed for it would be
// moved at the same moment the navigation moves the history itself, leaving the address and the
// page saying different things. It is no layer of the back gesture; Esc and a press outside, the
// library's own, still close it.
export const OFF_HISTORY = "data-off-history";

// What floats beside the page rather than over it carries this attribute, on the element the library
// marks as a layer or around it: a sheet the page stays in use under (`docs/components.md`, "A window
// beside the page"). It is a layer of the back gesture and Esc as any other, but a finger's tap away
// from it is no tap away: the page under it is meant to be pressed while it stands.
export const BESIDE_PAGE = "data-beside-page";

function besidePage(element: Element): boolean {
  return element.closest(`[${BESIDE_PAGE}]`) !== null;
}

function overLayers(target: EventTarget | null | undefined): boolean {
  return target instanceof Element && target.closest(`[${OVER_LAYERS}]`) !== null;
}

// How many times a layer is asked before it is taken to refuse. A tooltip standing over it takes
// the first Esc for itself, and none stands higher than that; one that has been asked stops
// answering the keyboard as it goes (the patch under `patches/`), so the next ask is the layer's.
const ESCAPE_TRIES = 2;

// What stands, in the order it opened, and the layer each was registered as.
const standing = new Map<Element, number>();

let escaping = false;

// Whether the Esc being handled is this module closing a layer for the back gesture rather than a
// key pressed. A shortcut of a screen's own that answers Esc lets such a one pass, since the press
// it stands for was meant for the layer alone.
export function isBackEscape(): boolean {
  return escaping;
}

function isOpen(element: Element): boolean {
  return element.isConnected && element.getAttribute("data-state") === "open";
}

// Whether a floating thing the library marks stands as a layer of the back gesture: it is open, and
// it is not standing while the page is being left.
export function standsAsLayer(element: Element): boolean {
  return isOpen(element) && element.closest(`[${OFF_HISTORY}]`) === null;
}

function escape(): void {
  escaping = true;

  try {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
  } finally {
    escaping = false;
  }
}

// A turn for the close to reach the page: the screen's own update, then whatever the library
// schedules after it.
function settle(): Promise<void> {
  return nextTick().then(() => new Promise((resolve) => setTimeout(resolve, 0)));
}

// Whether a floating thing that has closed is still on the page, drawing its leaving. The library hands the key
// to it for as long as it is there, so what stands under it is not asked at all.
function leaving(): boolean {
  return Array.from(document.querySelectorAll(LAYER)).some((element) => element.getAttribute("data-state") === "closed");
}

// Resolves once nothing is drawing its leaving any more, looked at a frame at a time.
function left(): Promise<void> {
  return new Promise((resolve) => {
    const look = (): void => {
      if (leaving()) {
        requestAnimationFrame(look);
      } else {
        resolve();
      }
    };

    look();
  });
}

function openLayers(): Element[] {
  return Array.from(document.querySelectorAll(LAYER)).filter(isOpen);
}

// Resolves once none of the given layers stands open any more, looked at a frame at a time.
function answered(layers: Element[]): Promise<void> {
  return new Promise((resolve) => {
    const look = (): void => {
      if (layers.some(isOpen)) {
        requestAnimationFrame(look);
      } else {
        resolve();
      }
    };

    look();
  });
}

// Asks a layer to close until it has, or until it answered by opening something over itself — the
// question a form's dialog asks before its changes are thrown away. Such a one has taken the press,
// and the next Esc would be the question's, closing it unanswered.
async function ask(element: Element, raised: () => Element[]): Promise<void> {
  for (let tried = 0; tried < ESCAPE_TRIES && isOpen(element) && raised().length === 0; tried += 1) {
    escape();
    await settle();
  }
}

// The layers a node put on the page holds, itself among them.
function layersIn(node: Node): Element[] {
  if (!(node instanceof Element)) {
    return [];
  }

  const inside = Array.from(node.querySelectorAll(LAYER));

  return node.matches(LAYER) ? [node, ...inside] : inside;
}

// The layers that come open from the moment it is called, other than those standing then, each kept
// once it has stood open whatever it does after: a question the reader put away before anything here
// looked is still the answer the press was given. Read through the observer's own records, so a layer
// that opened and closed between two looks is never missed; held for one press and let go after it.
function watchRaised(): { raised: () => Element[]; stop: () => void } {
  const before = new Set(openLayers());
  const found = new Set<Element>();

  const note = (layer: Element, wasOpen: boolean): void => {
    if (!before.has(layer) && (wasOpen || isOpen(layer))) {
      found.add(layer);
    }
  };

  const read = (records: MutationRecord[]): void => {
    for (const record of records) {
      if (record.type === "attributes" && record.target instanceof Element && record.target.matches(LAYER)) {
        note(record.target, record.oldValue === "open");
      }

      for (const node of Array.from(record.addedNodes)) {
        for (const layer of layersIn(node)) {
          note(layer, false);
        }
      }
    }
  };

  const observer = new MutationObserver(read);

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-state"],
    attributeOldValue: true
  });

  return {
    raised: () => {
      read(observer.takeRecords());

      return Array.from(found);
    },
    stop: () => observer.disconnect()
  };
}

// Whether the press asking a layer to close took the layer's entry with it: back lands on the entry
// below and takes it, a tap away leaves it standing.
type EntryAfterPress = "taken" | "kept";

async function dismiss(element: Element, entry: EntryAfterPress): Promise<void> {
  const watch = watchRaised();
  let asked: Element[];

  try {
    await ask(element, watch.raised);

    // A press that follows another's close at once finds the thing just closed still leaving, and it took the
    // key. The press is this layer's all the same, so it is asked again once that one has gone; one the press
    // raised itself is its answer instead, however soon it went.
    if (isOpen(element) && watch.raised().length === 0 && leaving()) {
      await left();
      await ask(element, watch.raised);
    }

    asked = watch.raised();
  } finally {
    watch.stop();
  }

  // What it opened over itself stands as a layer of its own and takes the next press; the layer
  // waits for it to be answered, since a discard closes the layer too.
  if (isOpen(element) && asked.length > 0) {
    await answered(asked);
    await settle();
  }

  // One that refuses to close, or stays once its question is answered, stands on. Where the press took
  // its entry it stands as a layer again with an entry of its own, so the press that was spent on it is
  // not the reader's last; where the press left the entry, the layer it stood as still holds it.
  if (isOpen(element) && entry === "taken") {
    standing.delete(element);
    sweep();
  }
}

function sweep(): void {
  const found = Array.from(document.querySelectorAll(LAYER)).filter(standsAsLayer);

  // Those gone first, the top one first, so each takes its own entry back rather than burying it.
  for (const [element, id] of Array.from(standing).reverse()) {
    if (!found.includes(element)) {
      standing.delete(element);
      closeLayer(id);
    }
  }

  for (const element of found) {
    if (!standing.has(element)) {
      standing.set(element, openLayer(() => void dismiss(element, "taken")));
    }
  }
}

function topLayer(): Element | null {
  const all = Array.from(standing.keys()).filter(isOpen);

  return all.at(-1) ?? null;
}

// A press outside a layer closes it only while it is the press being handled.
//
// On a touch screen the library cannot act on the press itself: the browser raises the press and
// the tap it becomes far apart, and a press may never become a tap at all — the finger drags off
// instead, or the tap is the one the rule below spends on closing the top layer and stops going
// any further. So the library holds the press and waits for a tap to arrive, and a press that
// never got one is still waiting when the next tap comes. That next tap is then read as the old
// press landing, wherever it fell: a button inside the dialog does what it was pressed for and
// the dialog goes in the same moment, which is how a dialog comes to close on the very press
// meant to work it.
//
// What settles it is that a press outside is one press: the one the reader has just made. A
// press being told about that is not the last one made is not landing now and closes nothing, and
// neither is one on what floats over every layer.
export function refuseStalePresses(): void {
  let pressed: Event | null = null;

  window.addEventListener("pointerdown", (event) => { pressed = event; }, true);

  window.addEventListener(
    OUTSIDE_PRESS,
    (event) => {
      const said = (event as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent ?? null;

      if (said !== pressed || overLayers(said?.target)) {
        event.preventDefault();
      }
    },
    true
  );
}

// The event the library raises where the focus has just landed, when it landed outside a layer;
// cancellable, and the only say anything here has in whether that move closes anything. Like the
// press above, it is dispatched there and does not bubble.
const OUTSIDE_FOCUS = "dismissableLayer.focusOutside";

// The event the library raises on a layer's focus scope as the layer goes. A turn after it, the
// scope hands the focus back to wherever it stood when the layer opened.
const HANDING_BACK = "focusScope.autoFocusOnUnmount";

// The event the library raises on a layer's focus scope as the layer opens. The scope then moves the
// focus into the layer on its own, at once or, as a list does onto its chosen row, once it stands.
const OPENING = "focusScope.autoFocusOnMount";

// The moves of the focus a going layer made, each as it landed: the target's own focus event and the
// focusin that follows it, so whoever reads either one is told.
const handedBack = new WeakSet<Event>();
let handing = 0;
// The same, for the moves an opening layer made into itself.
const takenOnOpen = new WeakSet<Event>();
// The layers opened since the reader's last key or press, every move into which is the layer's own.
let opening: Element[] = [];
let telling = false;

function tellLayerFocus(): void {
  if (telling) {
    return;
  }

  telling = true;
  window.addEventListener(
    HANDING_BACK,
    () => {
      handing += 1;
      // The library's own turn is queued only after this event has been dispatched, so it runs
      // after this one's first turn and before its second.
      setTimeout(() => setTimeout(() => { handing -= 1; }, 0), 0);
    },
    true
  );

  window.addEventListener(
    OPENING,
    (event) => {
      if (event.target instanceof Element) {
        opening.push(event.target);
      }
    },
    true
  );

  // The reader's next key or press is theirs, a Tab or an arrow moving the focus on among them, and
  // is caught before the browser moves anything for it.
  for (const type of ["keydown", "pointerdown"]) {
    window.addEventListener(type, () => { opening = []; }, true);
  }

  // Caught on the way down, so the mark stands before anything where the focus landed reads it.
  for (const type of ["focus", "focusin"]) {
    window.addEventListener(
      type,
      (event) => {
        if (handing > 0) {
          handedBack.add(event);
        }

        const target = event.target;

        if (target instanceof Node && opening.some((layer) => layer.isConnected && layer.contains(target))) {
          takenOnOpen.add(event);
        }
      },
      true
    );
  }
}

// Whether a move of the focus is a going layer handing it back to wherever it stood when the layer
// opened, rather than the reader moving it (`docs/components.md`, "Tooltips"). The browser's
// visible-focus tell cannot say so: once a key closed the layer it names the move the keyboard's.
// Told only once the overlays are watched; before that no move is taken for one.
export function focusHandedBack(event: Event): boolean {
  return handedBack.has(event);
}

// Whether a move of the focus is an opening layer taking it up on its own, before the reader's next
// key or press: onto its first control, its close, its own box or its list's chosen row
// (`docs/components.md`, "Tooltips"). The browser's visible-focus tell names it the keyboard's once
// a key opened the layer. Told only once the overlays are watched, as `focusHandedBack` is.
export function focusTakenOnOpen(event: Event): boolean {
  return takenOnOpen.has(event);
}

// The focus a going layer hands back moves out of nothing the reader is in.
//
// A menu gives the focus back to its own button as it goes. When the reader's choice in it opened
// something else — a choice opening a panel of details beside the button — that something already
// stands by the time the focus arrives at the button, and the button is outside it. Told of that
// move, it closes the moment it opened. The move is the library putting its own things in order
// rather than the reader going anywhere, so a focus outside told of it closes nothing, whichever
// floating thing the choice opened and whichever screen drew it. A press outside, Esc and back
// still close it.
export function refuseHandedBackFocus(): void {
  tellLayerFocus();

  window.addEventListener(
    OUTSIDE_FOCUS,
    (event) => {
      const said = (event as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent;

      if (said !== undefined && (focusHandedBack(said) || overLayers(said.target))) {
        event.preventDefault();
      }
    },
    true
  );
}

// A finger's press outside what stands on top only puts that away. On a touch screen the press
// that dismisses a menu is the same tap that would press what lies under it — another row, whose
// tap opens its own menu, a link, a button — and a person tapping away to close something has not
// yet looked at what is under their finger. So the click that press ends in goes nowhere, and the
// next tap is the one that acts. A mouse is left alone: it points before it presses. What floats
// over every layer is under no layer, so a tap on it acts, and a tap beside what floats beside the
// page acts too.
//
// The tap closes the layer that stood on top as the finger landed, and only that one. Between the
// finger landing and the click it ends in, the focus moves to where the finger fell, and a list that
// does not hold the focus captive closes itself on that move; the layer under it is then on top by
// the time the click comes, and closing whatever stands on top then would put that one away too.
function listenForTaps(): void {
  let away: Element | null = null;

  window.addEventListener(
    "pointerdown",
    (event) => {
      const top = topLayer();

      away =
        event.pointerType === "touch"
        && top !== null
        && !besidePage(top)
        && !(event.target instanceof Node && top.contains(event.target))
        && !overLayers(event.target)
          ? top
          : null;
    },
    true
  );

  window.addEventListener(
    "click",
    (event) => {
      if (away === null) {
        return;
      }

      const pressed = away;

      away = null;
      event.preventDefault();
      event.stopPropagation();

      if (isOpen(pressed)) {
        void dismiss(pressed, "kept");
      }
    },
    true
  );
}

let watching = false;

export function watchOverlays(): void {
  if (watching || import.meta.server) {
    return;
  }

  watching = true;
  listenForBack();
  listenForTaps();
  refuseStalePresses();
  tellLayerFocus();
  refuseHandedBackFocus();
  new MutationObserver(sweep).observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-state"]
  });
  sweep();
}
