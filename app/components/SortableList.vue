<template>
  <!-- A list a person puts in order by each item's drag handle (docs/components.md, 「Sortable lists」). The lifted
       item follows the pointer as a floating copy while its own place stays an empty gap of its height; the items
       the pointer passes slide by that height to make room; a drop settles the copy into the gap and answers the
       move, and a drop outside the list or Escape flies it back and answers nothing. -->
  <ul ref="listBox" class="flex flex-col" data-sortable-list>
    <li
      v-for="(item, index) in props.items"
      :key="props.itemKey(item)"
      :ref="(box) => keep(index, box)"
      class="relative"
      :class="{ 'opacity-0': carried?.from === index }"
      :style="slid(index)"
      :data-sortable-index="index"
      data-sortable-item
    >
      <div class="flex min-w-0 items-center gap-1">
        <button
          type="button"
          class="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted hover:text-highlighted focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing"
          :aria-label="$t('common.aria.move_named', { name: props.itemLabel(item) })"
          :aria-pressed="carried?.from === index && carried.by === 'keys'"
          data-sortable-handle
          @pointerdown="press($event, index)"
          @keydown="key($event, index)"
          @blur="carried?.by === 'keys' && putBack()"
        >
          <UIcon name="i-material-symbols-drag-indicator" class="size-4" />
        </button>
        <div class="min-w-0 flex-1">
          <slot name="item" :item="item" :index="index" />
        </div>
      </div>
    </li>
  </ul>

  <Teleport to="body">
    <div
      v-if="carried && carried.by === 'pointer' && floatItem !== undefined"
      class="pointer-events-none fixed z-50 rounded-md bg-default shadow-lg ring-1 ring-default"
      :style="floatStyle"
      data-sortable-floating
      @transitionend="landed"
    >
      <div class="flex min-w-0 items-center gap-1">
        <span class="flex size-8 shrink-0 items-center justify-center text-highlighted">
          <UIcon name="i-material-symbols-drag-indicator" class="size-4" />
        </span>
        <div class="min-w-0 flex-1">
          <slot name="item" :item="floatItem" :index="carried.from" />
        </div>
      </div>
    </div>
  </Teleport>

  <p class="sr-only" role="status" aria-live="assertive">{{ said ? $t(said.key, said.params) : "" }}</p>
</template>

<script setup lang="ts" generic="T">
import { computed, onBeforeUnmount, ref } from "vue";

const props = defineProps<{
  items: T[];
  itemKey: (item: T) => string | number;
  itemLabel: (item: T) => string;
}>();

const emit = defineEmits<{ move: [from: number, to: number] }>();

// How far a mouse or a pen press travels before it carries anything, how long a finger holds before it does, how
// near an edge a carry scrolls the list and how fast at most, and how long a slide and a landing take.
const START_PX = 6;
const HOLD_MS = 300;
const EDGE_PX = 48;
const SCROLL_MOST_PX = 18;
const SLIDE_MS = 180;

// The item carried now: where it came from, where it would land, how, and for the pointer the boxes it measured as
// it lifted, where the pointer holds it, and where the floating copy stands.
interface Carried {
  from: number;
  to: number;
  by: "pointer" | "keys";
  boxes: DOMRect[];
  grip: number;
  top: number;
  left: number;
  width: number;
  height: number;
  landing: "set" | "back" | null;
  scrolled: number;
}

const carried = ref<Carried | null>(null);
// What the list last said to a reader of the screen, as a wording key and its values.
const said = ref<{ key: string; params: Record<string, string | number> } | null>(null);
const listBox = ref<HTMLElement | null>(null);
const boxes: (HTMLElement | null)[] = [];
const still = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

let pending: { index: number; x: number; y: number; timer: number | null; pointer: number } | null = null;
let scrolling = 0;
let lastY = 0;

function keep(index: number, box: unknown): void {
  boxes[index] = box instanceof HTMLElement ? box : null;
}

const floatItem = computed(() => (carried.value ? props.items[carried.value.from] : undefined));

const floatStyle = computed(() => {
  const held = carried.value;

  if (!held) return {};

  return {
    top: `${held.top}px`,
    left: `${held.left}px`,
    width: `${held.width}px`,
    transform: held.landing ? "scale(1)" : "scale(1.02)",
    transition: held.landing && !still ? `top ${SLIDE_MS}ms ease, transform ${SLIDE_MS}ms ease` : "none"
  };
});

// How far an item slides to make room while another is carried: the carried item's height, up or down, for every
// item between where it came from and where it would land.
function slid(index: number): Record<string, string> {
  const held = carried.value;

  if (!held || index === held.from) return held && !still ? { transition: `transform ${SLIDE_MS}ms ease` } : {};

  const height = held.height || boxes[held.from]?.getBoundingClientRect().height || 0;
  let shift = 0;

  if (held.from < held.to && index > held.from && index <= held.to) shift = -height;
  if (held.from > held.to && index >= held.to && index < held.from) shift = height;

  return {
    transform: shift === 0 ? "" : `translateY(${shift}px)`,
    transition: still ? "none" : `transform ${SLIDE_MS}ms ease`
  };
}

function press(event: PointerEvent, index: number): void {
  if (event.button !== 0 || !event.isPrimary || carried.value) return;

  pending = { index, x: event.clientX, y: event.clientY, timer: null, pointer: event.pointerId };

  // A finger lifts the item by holding still on the handle; a mouse or a pen by travelling a few pixels.
  if (event.pointerType === "touch") {
    pending.timer = window.setTimeout(() => pending && lift(pending.index, pending.y), HOLD_MS);
  }

  window.addEventListener("pointermove", moved);
  window.addEventListener("pointerup", released);
  window.addEventListener("pointercancel", cancelled);
  window.addEventListener("keydown", escaped);
}

function lift(index: number, y: number): void {
  const box = boxes[index];

  if (!box) return;

  const measured = boxes.map((one) => one?.getBoundingClientRect() ?? new DOMRect());
  const own = measured[index]!;

  if (pending?.timer) window.clearTimeout(pending.timer);
  pending = null;
  lastY = y;
  carried.value = {
    from: index,
    to: index,
    by: "pointer",
    boxes: measured,
    grip: y - own.top,
    top: own.top,
    left: own.left,
    width: own.width,
    height: own.height,
    landing: null,
    scrolled: 0
  };
  said.value = { key: "common.status.item_picked", params: { name: props.itemLabel(props.items[index]!) } };
  scroll();
}

function moved(event: PointerEvent): void {
  if (pending && !carried.value) {
    const far = Math.hypot(event.clientX - pending.x, event.clientY - pending.y) >= START_PX;

    // A finger that travels before its hold is done is scrolling, not carrying.
    if (event.pointerType === "touch") {
      if (far) stopListening();
      return;
    }

    if (far) lift(pending.index, pending.y);
  }

  const held = carried.value;

  if (!held || held.by !== "pointer" || held.landing) return;

  lastY = event.clientY;
  held.top = event.clientY - held.grip;
  held.to = landingPlace(held);
}

// Where the carried item would land: past every other item whose middle its own middle has passed, the boxes read
// as they stood when it lifted, shifted by how far the list has scrolled since.
function landingPlace(held: Carried): number {
  const middle = held.top + held.height / 2 + held.scrolled;
  let to = held.from;

  held.boxes.forEach((box, index) => {
    if (index === held.from) return;

    const centre = box.top + box.height / 2;

    if (index > held.from && middle > centre) to = Math.max(to, index);
    if (index < held.from && middle < centre) to = Math.min(to, index);
  });

  return to;
}

// The box that scrolls the list, scrolled along while the carried item stands near its edge.
function scroller(): HTMLElement {
  let at = listBox.value?.parentElement ?? null;

  while (at) {
    const overflow = getComputedStyle(at).overflowY;

    if ((overflow === "auto" || overflow === "scroll") && at.scrollHeight > at.clientHeight) return at;
    at = at.parentElement;
  }

  return document.scrollingElement as HTMLElement;
}

function scroll(): void {
  const held = carried.value;

  if (!held || held.by !== "pointer" || held.landing) return;

  const box = scroller();
  const edge = box === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : box.getBoundingClientRect();
  const near = lastY - edge.top < EDGE_PX ? -(EDGE_PX - (lastY - edge.top)) : edge.bottom - lastY < EDGE_PX ? EDGE_PX - (edge.bottom - lastY) : 0;

  if (near !== 0) {
    const before = box.scrollTop;

    box.scrollTop += Math.sign(near) * Math.min(SCROLL_MOST_PX, Math.abs(near) / 2);
    held.scrolled += box.scrollTop - before;
    held.to = landingPlace(held);
  }

  scrolling = requestAnimationFrame(scroll);
}

function released(event: PointerEvent): void {
  const held = carried.value;

  stopListening();

  if (!held || held.by !== "pointer") return;

  const list = listBox.value?.getBoundingClientRect();
  const outside =
    !list ||
    event.clientX < list.left - EDGE_PX ||
    event.clientX > list.right + EDGE_PX ||
    event.clientY < list.top - EDGE_PX ||
    event.clientY > list.bottom + EDGE_PX;

  if (outside) putBack();
  else setDown();
}

function cancelled(): void {
  stopListening();
  if (carried.value) putBack();
}

function escaped(event: KeyboardEvent): void {
  if (event.key !== "Escape") return;

  event.preventDefault();
  stopListening();
  if (carried.value) putBack();
}

function stopListening(): void {
  if (pending?.timer) window.clearTimeout(pending.timer);
  pending = null;
  cancelAnimationFrame(scrolling);
  window.removeEventListener("pointermove", moved);
  window.removeEventListener("pointerup", released);
  window.removeEventListener("pointercancel", cancelled);
  window.removeEventListener("keydown", escaped);
}

// The carried item settles where the gap stands: the floating copy lands on the gap's place, then the move is
// answered once it is there.
function setDown(): void {
  const held = carried.value;

  if (!held) return;

  if (held.by === "keys") {
    finish("set");
    return;
  }

  const target = held.boxes[held.to]!;
  const top = held.to > held.from ? target.bottom - held.height : target.top;

  held.landing = "set";
  held.top = top - held.scrolled;
  if (still) finish("set");
}

// The carried item flies back to its own place, and nothing is answered.
function putBack(): void {
  const held = carried.value;

  if (!held) return;

  held.to = held.from;

  if (held.by === "keys") {
    finish("back");
    return;
  }

  held.landing = "back";
  held.top = held.boxes[held.from]!.top - held.scrolled;
  if (still) finish("back");
}

function landed(event: TransitionEvent): void {
  if (event.propertyName !== "top" || !carried.value?.landing) return;

  finish(carried.value.landing);
}

function finish(how: "set" | "back"): void {
  const held = carried.value;

  if (!held) return;

  const name = props.itemLabel(props.items[held.from]!);
  const { from, to } = held;

  carried.value = null;

  if (how === "set" && from !== to) {
    said.value = { key: "common.status.item_set_down", params: { name, place: to + 1 } };
    emit("move", from, to);
  } else {
    said.value = { key: "common.status.item_put_back", params: { name } };
  }
}

// The keyboard's carry: Space or Enter picks up and sets down, the arrows move a place at a time, Escape puts back.
function key(event: KeyboardEvent, index: number): void {
  const held = carried.value;

  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();

    if (!held) {
      carried.value = {
        from: index,
        to: index,
        by: "keys",
        boxes: [],
        grip: 0,
        top: 0,
        left: 0,
        width: 0,
        height: boxes[index]?.getBoundingClientRect().height ?? 0,
        landing: null,
        scrolled: 0
      };
      said.value = { key: "common.status.item_picked", params: { name: props.itemLabel(props.items[index]!) } };
    } else if (held.by === "keys") {
      setDown();
    }

    return;
  }

  if (!held || held.by !== "keys") return;

  if (event.key === "Escape") {
    event.preventDefault();
    putBack();
    return;
  }

  const step = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;

  if (step === 0) return;

  event.preventDefault();
  held.to = Math.min(props.items.length - 1, Math.max(0, held.to + step));
  said.value = { key: "common.status.item_moved", params: {
    name: props.itemLabel(props.items[held.from]!),
    place: held.to + 1,
    count: props.items.length
  } };
}

onBeforeUnmount(stopListening);
</script>
