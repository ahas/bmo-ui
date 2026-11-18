import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";

import { pressTravelled, useLongPress } from "./longpress";
import { focusHandedBack } from "./overlays";
import { TOOLTIP_UI } from "./tooltip";

import type { TouchPoint } from "./longpress";
import type { ComputedRef, Ref, ShallowRef, WritableComputedRef } from "vue";

// The page tooltip (`docs/components.md`, "Tooltips"): one layer over the whole page that finds what
// it names itself, under a pointer, a keyboard focus or a held finger, and brings up the shared
// tooltip over it. A layer says what it finds and what its words are; how the tooltip answers each
// of the three is stated here once, for every layer alike.

// The component library's own wait before a tooltip answers a pointer, and how soon after one goes
// the next answers at once.
const HOVER_WAIT_MS = 700;
const SKIP_WAIT_MS = 300;
// What a held element stops while the finger is on it: the phone's own selection and its menu over
// the words, which would otherwise take the hold.
const SELECTION_PROPERTIES = ["user-select", "-webkit-user-select", "-webkit-touch-callout"];

// A layer is mounted with the app, before any dialog or notice opens, so its tooltip is put in front
// of them all by its stacking order rather than its place in the page: what it names is always the
// one in front, a notice's included.
export const PAGE_TIP_UI = { ...TOOLTIP_UI, content: `${TOOLTIP_UI.content} z-[110]` };

// How the tooltip now standing was brought up, which says what puts it away.
export type PageTipBy = "pointer" | "focus" | "finger";

// What one layer names.
export interface PageTipFinder {
  // What it names at or around what a pointer or a finger is on, or null where it names nothing
  // there. Asked again of what it found as a pointer's wait or a finger's hold ends, so what has
  // stopped being named meanwhile brings up nothing.
  at: (target: EventTarget | null) => HTMLElement | null;
  // What it names for a keyboard focus landing on this element.
  within: (focused: Element) => HTMLElement | null;
  // Its words; none brings up nothing.
  words: (found: HTMLElement) => string;
}

export interface PageTip {
  // Whether the tooltip stands, as the library's tooltip is bound to it.
  shown: WritableComputedRef<boolean>;
  // What it stands over.
  anchor: ShallowRef<HTMLElement | null>;
  words: Ref<string>;
  // What the library is told of the tooltip's own box: the name a screen reader hears, which the
  // library would otherwise read once, as it opens, and keep while the words change under it.
  content: ComputedRef<{ ariaLabel: string }>;
  // Brings it up over what the layer found, as the one who brought it up would.
  show: (found: HTMLElement, how: PageTipBy) => void;
  close: () => void;
}

export function usePageTip(finder: PageTipFinder): PageTip {
  const anchor = shallowRef<HTMLElement | null>(null);
  const words = ref("");
  const open = ref(false);
  let by: PageTipBy = "pointer";
  let waiting: ReturnType<typeof setTimeout> | undefined;
  let closedAt = 0;
  // The finger's hold that brought it up, until that finger lifts.
  let held: TouchPoint | null = null;
  // The click a lifting finger ends its hold in, which presses nothing.
  let liftPending = false;
  // What a finger now rests on, with its selection turned off.
  let resting: HTMLElement | null = null;

  const content = computed(() => ({ ariaLabel: words.value }));

  const shown = computed({
    get: () => open.value,
    set: (value: boolean) => (value ? (open.value = true) : close())
  });

  function show(found: HTMLElement, how: PageTipBy): void {
    clearTimeout(waiting);
    anchor.value = found;
    words.value = finder.words(found);
    by = how;
    open.value = words.value !== "";
  }

  function close(): void {
    clearTimeout(waiting);

    if (open.value) closedAt = Date.now();

    open.value = false;
    held = null;
  }

  function onPointerOver(event: PointerEvent): void {
    if (event.pointerType !== "mouse") return;

    // What was taken off the screen while its tooltip stood leaves nothing for it to stand over.
    if (open.value && anchor.value?.isConnected === false) close();

    const found = finder.at(event.target);

    if (found === null || (open.value && found === anchor.value)) return;

    clearTimeout(waiting);

    if (open.value || Date.now() - closedAt < SKIP_WAIT_MS) {
      show(found, "pointer");
    } else {
      waiting = setTimeout(() => {
        if (finder.at(found) === found) show(found, "pointer");
      }, HOVER_WAIT_MS);
    }
  }

  // Leaving what it names for something outside it puts the tooltip away, and so does a wait that
  // has not yet brought it up.
  function onPointerOut(event: PointerEvent): void {
    if (event.pointerType !== "mouse") return;

    const to = event.relatedTarget;
    const from = event.target;
    const over = anchor.value;

    clearTimeout(waiting);

    if (by === "pointer" && over !== null && from instanceof Node && over.contains(from) && !(to instanceof Node && over.contains(to))) {
      close();
    }
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.pointerType === "mouse") {
      close();
      return;
    }

    // The next touch anywhere puts away what a finger brought up, and it is no lift of the last hold.
    liftPending = false;

    if (by === "finger") close();
  }

  function onPointerMove(event: PointerEvent): void {
    if (held !== null && event.pointerType !== "mouse" && pressTravelled(held, { x: event.clientX, y: event.clientY })) {
      close();
    }
  }

  function onClick(event: MouseEvent): void {
    if (!liftPending) return;

    liftPending = false;
    event.preventDefault();
    event.stopPropagation();
  }

  function onScroll(event: Event): void {
    if (by !== "pointer" || anchor.value === null) return;

    const scroller = event.target;

    if (scroller === document || (scroller instanceof Node && scroller.contains(anchor.value))) close();
  }

  // A keyboard focus is one the browser shows as visible, which it also does for the focus a closing
  // layer hands back once a key closed it; that one is no keyboard focus.
  function onFocusIn(event: FocusEvent): void {
    const target = event.target;

    if (!(target instanceof Element) || focusHandedBack(event) || !target.matches(":focus-visible")) return;

    const found = finder.within(target);

    if (found !== null) {
      show(found, "focus");
    } else if (by === "focus") {
      close();
    }
  }

  function onFocusOut(): void {
    if (by === "focus") close();
  }

  function stillResting(off: boolean): void {
    if (resting === null) return;

    for (const property of SELECTION_PROPERTIES) {
      if (off) {
        resting.style.setProperty(property, "none");
      } else {
        resting.style.removeProperty(property);
      }
    }

    if (!off) resting = null;
  }

  function onTouchEnd(): void {
    stillResting(false);
  }

  // The phone's own long press over what a finger holds, a menu of its own for a link or a picture,
  // is turned away; a menu a row's hold asks for is no long press of the phone's and goes through.
  function onContextMenu(event: MouseEvent): void {
    if (event.isTrusted && resting !== null && event.target instanceof Node && resting.contains(event.target)) event.preventDefault();
  }

  // A finger holding what the layer names brings it up by the layer's one held finger, beside
  // whatever a row's own hold does.
  useLongPress({
    surface: () => (typeof document === "undefined" ? null : document.body),
    press: (target, at) => {
      const found = finder.at(target);

      if (found === null) return null;

      stillResting(false);
      resting = found;
      stillResting(true);

      return () => {
        if (finder.at(found) !== found) return;

        show(found, "finger");
        held = at;
        liftPending = true;
      };
    }
  });

  const LISTENERS: [string, (event: never) => void, AddEventListenerOptions][] = [
    ["pointerover", onPointerOver, { passive: true }],
    ["pointerout", onPointerOut, { passive: true }],
    ["pointerdown", onPointerDown, { capture: true, passive: true }],
    ["pointermove", onPointerMove, { passive: true }],
    ["click", onClick, { capture: true }],
    ["scroll", onScroll, { capture: true, passive: true }],
    ["focusin", onFocusIn, {}],
    ["focusout", onFocusOut, {}],
    ["contextmenu", onContextMenu, { capture: true }],
    ["touchend", onTouchEnd, { passive: true }],
    ["touchcancel", onTouchEnd, { passive: true }]
  ];

  onMounted(() => {
    for (const [name, listener, options] of LISTENERS) document.addEventListener(name, listener as EventListener, options);
  });

  onBeforeUnmount(() => {
    clearTimeout(waiting);
    stillResting(false);

    for (const [name, listener, options] of LISTENERS) document.removeEventListener(name, listener as EventListener, options);
  });

  return { shown, anchor, words, content, show, close };
}
