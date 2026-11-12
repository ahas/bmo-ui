<template>
  <!-- A picture opened whole. It stands centred at the size that fits, and is looked into the way a
       photo viewer lets one: the wheel zooms around the pointer, a drag moves a zoomed picture, two
       fingers pinch and move it, and a double press zooms in at that point or back out to fitting.
       The foot holds the same by buttons, with how far it is zoomed. Where it is handed pictures
       either side of this one, the arrow keys, the arrows at its sides and a sideways stroke on a
       fitted picture go to them; what acts on the picture shown stands in its head beside the
       close. It covers the screen, so the back gesture closes it rather than leaving the screen
       under it (`docs/components.md`, "Skeletons and loading"). -->
  <UModal
    v-model:open="open"
    :title="props.title"
    fullscreen
    :content="{ onCloseAutoFocus }"
    :ui="{ body: 'flex min-h-0 flex-1 p-0 sm:p-0', footer: 'justify-center', wrapper: 'min-w-0 flex-1' }"
  >
    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>

    <template #close="{ ui }">
      <!-- The close stands in the head's own row rather than over its corner, so what acts on the
           picture can stand beside it. -->
      <ShellClose :class="ui.close({ class: 'static' })" @close="open = false" />
    </template>

    <template #body>
      <div class="relative flex min-h-0 flex-1">
        <div
          ref="stage"
          data-image-stage
          tabindex="0"
          role="img"
          :aria-label="$t('common.aria.image_zoom', { title: props.title })"
          class="relative min-h-0 flex-1 touch-none overflow-hidden outline-none select-none"
          :class="view.scale > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'"
          @wheel.prevent="onWheel"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @dblclick="onDoubleClick"
          @keydown="onKey"
        >
          <div v-if="!ready && !broken" role="status" class="absolute inset-0 flex items-center justify-center">
            <SkeletonBar class="size-40 rounded-lg" />
            <span class="sr-only">{{ $t("common.status.picture_loading") }}</span>
          </div>

          <p v-if="broken" role="alert" class="absolute inset-0 flex items-center justify-center text-sm text-dimmed">{{ $t("common.error.picture_failed") }}</p>

          <img
            v-else
            :src="props.src"
            :alt="props.title"
            draggable="false"
            class="absolute top-1/2 left-1/2 max-w-none origin-center bg-white"
            :class="[ready ? '' : 'opacity-0', settling ? 'transition-transform duration-(--bmo-motion-quick) ease-(--bmo-ease-enter) motion-reduce:transition-none' : '']"
            :style="pictureStyle"
            @load="onLoad"
            @error="broken = true"
          >
        </div>

        <!-- The arrows stand on a screen with a pointer; a finger strokes the picture instead. -->
        <template v-if="props.canPrevious || props.canNext">
          <UTooltip :text="$t('common.action.previous_picture')">
            <UButton
              icon="i-material-symbols-chevron-left"
              color="neutral"
              variant="outline"
              class="absolute inset-y-0 start-4 my-auto h-fit rounded-full max-sm:hidden"
              :aria-label="$t('common.action.previous_picture')"
              :disabled="!props.canPrevious"
              @click="go('previous')"
            />
          </UTooltip>
          <UTooltip :text="$t('common.action.next_picture')">
            <UButton
              icon="i-material-symbols-chevron-right"
              color="neutral"
              variant="outline"
              class="absolute inset-y-0 end-4 my-auto h-fit rounded-full max-sm:hidden"
              :aria-label="$t('common.action.next_picture')"
              :disabled="!props.canNext"
              @click="go('next')"
            />
          </UTooltip>
        </template>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center gap-2">
        <UTooltip :text="$t('common.action.zoom_out')">
          <UButton icon="i-material-symbols-zoom-out" size="sm" color="neutral" variant="ghost" :aria-label="$t('common.action.zoom_out')" :disabled="view.scale <= MIN_SCALE" @click="zoomBy(1 / 1.5)" />
        </UTooltip>
        <span class="w-14 text-center text-sm tabular-nums text-muted" aria-live="polite">{{ Math.round(view.scale * 100) }}%</span>
        <UTooltip :text="$t('common.action.zoom_in')">
          <UButton icon="i-material-symbols-zoom-in" size="sm" color="neutral" variant="ghost" :aria-label="$t('common.action.zoom_in')" :disabled="view.scale >= MAX_SCALE" @click="zoomBy(1.5)" />
        </UTooltip>
        <UTooltip :text="$t('common.action.fit_screen')">
          <UButton icon="i-material-symbols-fit-screen-outline" size="sm" color="neutral" variant="ghost" :aria-label="$t('common.action.fit_screen')" :disabled="view.scale === 1" @click="fit" />
        </UTooltip>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { FIT, MAX_SCALE, MIN_SCALE, fittedSize, moved, pinched, swipeStep, toggled, wheeled, zoomedTo } from "../domain/zoom";

import type { Point, Size, ZoomView } from "../domain/zoom";

interface Props {
  src: string;
  title: string;
  // Whether there is a picture before or after this one to go to.
  canPrevious?: boolean;
  canNext?: boolean;
  // Whether closing hands the keyboard back to what opened the viewer. A close that takes the
  // reader somewhere else on the page leaves it, since handing it back scrolls to the opener.
  returnFocus?: boolean;
}

const props = withDefaults(defineProps<Props>(), { canPrevious: false, canNext: false, returnFocus: true });

const emit = defineEmits<{
  previous: [];
  next: [];
  // The picture's own size, once it has loaded.
  loaded: [natural: Size];
}>();

const open = defineModel<boolean>("open", { required: true });

const stage = useTemplateRef<HTMLElement>("stage");
const view = ref<ZoomView>(FIT);
const natural = ref<Size>({ width: 0, height: 0 });
const room = ref<Size>({ width: 0, height: 0 });
const ready = ref(false);
const broken = ref(false);
const dragging = ref(false);
// A button or a double press eases the picture to its place; a hand moving it is followed at once.
const settling = ref(false);
// How far a finger has carried a fitted picture sideways towards the one beside it.
const swipe = ref(0);

const fitted = computed<Size>(() => fittedSize(natural.value, room.value));

const pictureStyle = computed(() => ({
  width: `${fitted.value.width}px`,
  height: `${fitted.value.height}px`,
  transform: `translate(-50%, -50%) translate(${view.value.x + swipe.value}px, ${view.value.y}px) scale(${view.value.scale})`
}));

watch(open, (isOpen) => {
  if (isOpen) {
    view.value = FIT;
    broken.value = false;
  }
});

watch(
  () => props.src,
  () => {
    ready.value = false;
    broken.value = false;
    view.value = FIT;
    swipe.value = 0;
  }
);

let observer: ResizeObserver | null = null;

watch(stage, (element) => {
  observer?.disconnect();
  observer = null;

  if (element === null) {
    return;
  }

  const measure = () => {
    room.value = { width: element.clientWidth, height: element.clientHeight };
  };

  measure();
  observer = new ResizeObserver(measure);
  observer.observe(element);
  element.focus({ preventScroll: true });
});

onBeforeUnmount(() => observer?.disconnect());

function onLoad(event: Event): void {
  const image = event.target as HTMLImageElement;

  natural.value = { width: image.naturalWidth, height: image.naturalHeight };
  ready.value = true;
  emit("loaded", natural.value);
}

// Closing hands the keyboard back to what opened the viewer, unless it was asked not to.
function onCloseAutoFocus(event: Event): void {
  if (!props.returnFocus) {
    event.preventDefault();
  }
}

// To the picture beside this one, by an arrow, a key or a stroke. The keyboard stays on the
// picture, so the keys go on working after an arrow is pressed.
function go(side: "previous" | "next"): void {
  if (side === "previous" ? !props.canPrevious : !props.canNext) {
    return;
  }

  if (side === "previous") {
    emit("previous");
  } else {
    emit("next");
  }

  stage.value?.focus({ preventScroll: true });
}

// A point on the screen, as the stage's centre sees it.
function local(event: { clientX: number; clientY: number }): Point {
  const box = stage.value?.getBoundingClientRect();

  return box === undefined ? { x: 0, y: 0 } : { x: event.clientX - box.left - box.width / 2, y: event.clientY - box.top - box.height / 2 };
}

function show(next: ZoomView, eased: boolean): void {
  settling.value = eased;
  view.value = next;
}

function zoomBy(factor: number): void {
  show(zoomedTo(view.value, view.value.scale * factor, { x: 0, y: 0 }, fitted.value, room.value), true);
}

function fit(): void {
  show(FIT, true);
}

function onWheel(event: WheelEvent): void {
  // A pinch on a trackpad arrives as a wheel with ctrl held and small steps; it zooms faster.
  const delta = event.ctrlKey ? event.deltaY * 4 : event.deltaY;

  show(wheeled(view.value, delta, local(event), fitted.value, room.value), false);
}

function onDoubleClick(event: MouseEvent): void {
  // A touch screen's double tap is read from the touches themselves.
  if (lastPointer === "touch") {
    return;
  }

  show(toggled(view.value, local(event), fitted.value, room.value), true);
}

function onKey(event: KeyboardEvent): void {
  if (event.key === "+" || event.key === "=") {
    zoomBy(1.5);
  } else if (event.key === "-") {
    zoomBy(1 / 1.5);
  } else if (event.key === "0") {
    fit();
  } else if (event.key === "ArrowLeft") {
    go("previous");
  } else if (event.key === "ArrowRight") {
    go("next");
  } else {
    return;
  }

  event.preventDefault();
}

// The fingers or the pointer on the picture, and where each stood when the present gesture began.
const pointers = new Map<number, Point>();
let gesture: { view: ZoomView; points: Map<number, Point> } | null = null;
// Where and when the last touch that did not move was lifted, for a double tap.
let lastTap: { at: Point; time: number } | null = null;
let travelled = 0;
let lastPointer = "mouse";
// Where one finger came down on a fitted picture that has another beside it: such a stroke carries
// the picture sideways rather than moving it, since a fitted picture has nowhere to move.
let stroke: Point | null = null;

// How much of a stroke towards a side with no picture the picture follows, so the end is felt.
const SWIPE_RESISTANCE = 0.3;

const DOUBLE_TAP_MS = 300;
const TAP_SLOP_PX = 10;

function begin(): void {
  gesture = { view: view.value, points: new Map(pointers) };
}

function onPointerDown(event: PointerEvent): void {
  if (event.button > 0) {
    return;
  }

  lastPointer = event.pointerType;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, local(event));
  travelled = pointers.size > 1 ? Number.POSITIVE_INFINITY : 0;
  dragging.value = true;
  begin();

  stroke = pointers.size === 1 && view.value.scale <= MIN_SCALE && (props.canPrevious || props.canNext) ? local(event) : null;
  swipe.value = 0;
}

function onPointerMove(event: PointerEvent): void {
  if (!pointers.has(event.pointerId) || gesture === null) {
    return;
  }

  const was = pointers.get(event.pointerId)!;
  const now = local(event);

  pointers.set(event.pointerId, now);
  travelled += Math.hypot(now.x - was.x, now.y - was.y);

  const ids = [...pointers.keys()];

  if (ids.length >= 2) {
    const [a, b] = ids as [number, number];
    const from: [Point, Point] = [gesture.points.get(a)!, gesture.points.get(b)!];
    const to: [Point, Point] = [pointers.get(a)!, pointers.get(b)!];

    show(pinched(gesture.view, from, to, fitted.value, room.value), false);

    return;
  }

  if (stroke !== null) {
    const across = now.x - stroke.x;
    const beside = across > 0 ? props.canPrevious : props.canNext;

    settling.value = false;
    swipe.value = beside ? across : across * SWIPE_RESISTANCE;

    return;
  }

  const start = gesture.points.get(event.pointerId)!;

  show(moved(gesture.view, { x: now.x - start.x, y: now.y - start.y }, fitted.value, room.value), false);
}

function onPointerUp(event: PointerEvent): void {
  if (!pointers.delete(event.pointerId)) {
    return;
  }

  // One finger left of two carries on from where the pinch left the picture.
  if (pointers.size > 0) {
    begin();

    return;
  }

  gesture = null;
  dragging.value = false;

  if (stroke !== null) {
    const at = local(event);
    const step = event.type === "pointercancel" ? 0 : swipeStep({ x: at.x - stroke.x, y: at.y - stroke.y }, room.value);

    stroke = null;
    settling.value = true;
    swipe.value = 0;

    if (step !== 0) {
      go(step > 0 ? "next" : "previous");
    }
  }

  if (event.pointerType !== "touch" || travelled > TAP_SLOP_PX || event.type === "pointercancel") {
    lastTap = null;

    return;
  }

  const at = local(event);
  const now = performance.now();

  if (lastTap !== null && now - lastTap.time < DOUBLE_TAP_MS && Math.hypot(at.x - lastTap.at.x, at.y - lastTap.at.y) < TAP_SLOP_PX * 3) {
    lastTap = null;
    show(toggled(view.value, at, fitted.value, room.value), true);

    return;
  }

  lastTap = { at, time: now };
}
</script>
