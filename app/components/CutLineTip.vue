<template>
  <!-- The one layer over the whole page that shows a cut line whole (`docs/components.md`,
       "Tooltips"). It finds the line itself, under a pointer, a keyboard focus or a held finger,
       and brings up the shared tooltip over it, so no screen writes anything for its cut lines. -->
  <UTooltip
    v-model:open="shown"
    :text="words"
    :reference="line ?? undefined"
    :disabled="line === null"
    disable-hoverable-content
    disable-closing-trigger
    :ui="ui"
  />
</template>

<script setup lang="ts">
import { cutLineAt, cutLineIn, lineWords } from "../domain/cut-lines";
import { pressTravelled, useLongPress } from "../domain/longpress";
import { TOOLTIP_UI } from "../domain/tooltip";

import type { TouchPoint } from "../domain/longpress";

// The component library's own wait before a tooltip answers a pointer, and how soon after one goes
// the next answers at once.
const HOVER_WAIT_MS = 700;
const SKIP_WAIT_MS = 300;
// What a held line stops while the finger is on it: the phone's own selection and its menu over the
// words, which would otherwise take the hold.
const SELECTION_PROPERTIES = ["user-select", "-webkit-user-select", "-webkit-touch-callout"];
// This layer is mounted with the app, before any dialog or notice opens, so it is put in front
// of them all by its stacking order rather than its place in the page: the line it names is always
// the one in front, a notice's included.
const ui = { ...TOOLTIP_UI, content: `${TOOLTIP_UI.content} z-[110]` };

const line = shallowRef<HTMLElement | null>(null);
const words = ref("");
const open = ref(false);
// How the tooltip now standing was brought up, which says what puts it away.
let by: "pointer" | "focus" | "finger" = "pointer";
let waiting: ReturnType<typeof setTimeout> | undefined;
let closedAt = 0;
// The finger's hold that brought it up, until that finger lifts.
let held: TouchPoint | null = null;
// The click a lifting finger ends its hold in, which presses nothing.
let liftPending = false;
// The line a finger now rests on, with its selection turned off.
let resting: HTMLElement | null = null;

const shown = computed({
  get: () => open.value,
  set: (value: boolean) => (value ? (open.value = true) : close())
});

function show(found: HTMLElement, how: typeof by): void {
  clearTimeout(waiting);
  line.value = found;
  words.value = lineWords(found);
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

  // A line taken off the screen while its tooltip stood leaves nothing for it to stand over.
  if (open.value && line.value?.isConnected === false) close();

  const found = cutLineAt(event.target);

  if (found === null || (open.value && found === line.value)) return;

  clearTimeout(waiting);

  if (open.value || Date.now() - closedAt < SKIP_WAIT_MS) {
    show(found, "pointer");
  } else {
    // Whether it is still cut is measured again as the wait ends, so a box widened meanwhile opens
    // nothing.
    waiting = setTimeout(() => {
      if (cutLineAt(found) === found) show(found, "pointer");
    }, HOVER_WAIT_MS);
  }
}

// Leaving the line for something outside it puts the tooltip away, and so does a wait that has not
// yet brought it up.
function onPointerOut(event: PointerEvent): void {
  if (event.pointerType !== "mouse") return;

  const to = event.relatedTarget;
  const from = event.target;

  clearTimeout(waiting);

  if (by === "pointer" && line.value !== null && from instanceof Node && line.value.contains(from) && !(to instanceof Node && line.value.contains(to))) {
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
  if (by !== "pointer" || line.value === null) return;

  const scroller = event.target;

  if (scroller === document || (scroller instanceof Node && scroller.contains(line.value))) close();
}

function onFocusIn(event: FocusEvent): void {
  const target = event.target;

  if (!(target instanceof Element) || !target.matches(":focus-visible")) return;

  const found = cutLineIn(target);

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

// The phone's own long press over a held line, a menu of its own for a link or a picture, is
// turned away; a menu a row's hold asks for is no long press of the phone's and goes through.
function onContextMenu(event: MouseEvent): void {
  if (event.isTrusted && resting !== null && event.target instanceof Node && resting.contains(event.target)) event.preventDefault();
}

// A finger holding a cut line brings it up by the layer's one held finger, beside whatever the
// row's own hold does.
useLongPress({
  surface: () => (typeof document === "undefined" ? null : document.body),
  press: (target, at) => {
    const found = cutLineAt(target);

    if (found === null) return null;

    stillResting(false);
    resting = found;
    stillResting(true);

    return () => {
      if (cutLineAt(found) !== found) return;

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
</script>
