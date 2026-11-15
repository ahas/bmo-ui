<template>
  <!-- A part of a screen floating beside it while the screen behind stays in use (`docs/components.md`, "A window
       beside the page"). It is drawn only once the browser has the page, since where it stands is read off the
       browser's window and storage, which a server has neither of. -->
  <template v-if="mounted">
    <!-- On a narrow screen: the library's drawer, with no shade and nothing outside it closing it. A tap on the page
         under it is the page's own, so it carries the mark that says so; the back gesture and Esc still fold it. -->
    <UDrawer
      v-if="narrow"
      :open="props.open"
      :modal="false"
      :overlay="false"
      :snap-points="SNAP_POINTS"
      :active-snap-point="SHEET_HEIGHTS[sheet]"
      :content="sheetContent"
      :ui="{ content: 'h-dvh max-h-none', container: 'min-h-0 gap-0 p-0' }"
      @update:open="emit('update:open', $event)"
      @update:active-snap-point="settleSheet"
    >
      <template #content>
        <div class="flex min-h-0 flex-1 flex-col" :aria-label="props.label" role="group">
          <div class="flex min-h-12 shrink-0 items-center gap-2 border-b border-default ps-4 pe-2">
            <div class="flex min-w-0 flex-1 items-center gap-2">
              <slot name="title" />
            </div>
            <IconButton
              :icon="sheet === 'tall' ? 'i-material-symbols-collapse-content' : 'i-material-symbols-expand-content'"
              :label="sheet === 'tall' ? $t('common.action.collapse') : $t('common.action.expand')"
              @click="setSheet(sheet === 'tall' ? 'short' : 'tall')"
            />
            <IconButton icon="i-material-symbols-close" :label="$t('common.action.close')" @click="fold" />
          </div>
          <!-- What the sheet hides under the screen's foot at its short height is room at the body's foot, so the
               body's end can still be scrolled up into what is seen. -->
          <div
            ref="sheetBody"
            class="min-h-0 flex-1 overflow-y-auto overscroll-contain"
            :style="{ paddingBottom: `calc(${(1 - SHEET_HEIGHTS[sheet]) * 100}dvh + var(--bmo-safe-bottom))` }"
            @focusin="writeInView"
          >
            <slot />
          </div>
        </div>
      </template>
    </UDrawer>

    <Teleport :to="root">
      <!-- On a wide screen: a window at a place and a size of its own. It is drawn into the app's own root after the
           screens, so it stands over every screen and under whatever the library floats after the app. -->
      <Transition
        :enter-active-class="MOVING"
        :leave-active-class="MOVING"
        :enter-from-class="grown ? GROWN_FROM : FADED"
        :leave-to-class="grown ? GROWN_FROM : FADED"
        @after-enter="grown = false"
        @after-leave="grown = false"
      >
        <section
          v-if="!narrow && props.open"
          ref="box"
          role="dialog"
          aria-modal="false"
          :aria-label="props.label"
          class="fixed flex flex-col overflow-hidden rounded-lg bg-default shadow-lg ring ring-default"
          :class="rightToLeft ? 'origin-top-left' : 'origin-top-right'"
          :style="{ left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` }"
          @keydown.esc="foldFromKey"
        >
          <!-- The title bar moves it, by a pointer or a finger dragged on it and by the arrow keys while it holds the
               focus; a control inside the bar is pressed as itself. The ring is drawn inside the bar, since the
               window's own corners clip what stands past its edge. -->
          <div
            ref="bar"
            tabindex="0"
            :aria-label="$t('common.aria.window_move')"
            class="focus-inset flex min-h-12 shrink-0 cursor-move touch-none select-none items-center gap-2 border-b border-default ps-4 pe-2"
            @pointerdown="startMove"
            @keydown="stepMove"
          >
            <div class="flex min-w-0 flex-1 items-center gap-2">
              <slot name="title" />
            </div>
            <IconButton icon="i-material-symbols-close" :label="$t('common.action.close')" @click="fold" />
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <slot />
          </div>

          <!-- The trailing foot corner sizes it, dragged or by the arrow keys, and names itself in the shared tooltip. -->
          <HintTip :text="$t('common.aria.window_resize')" class="absolute bottom-0 end-0 flex">
            <span
              tabindex="0"
              role="separator"
              :aria-label="$t('common.aria.window_resize')"
              class="focus-inset flex size-5 touch-none items-end justify-end text-dimmed hover:text-highlighted active:text-highlighted"
              :class="rightToLeft ? 'cursor-nesw-resize' : 'cursor-nwse-resize'"
              @pointerdown="startSize"
              @keydown="stepSize"
            >
              <UIcon name="i-material-symbols-drag-handle" class="size-4" :class="rightToLeft ? 'rotate-45' : '-rotate-45'" />
            </span>
          </HintTip>
        </section>
      </Transition>

      <!-- Folded: one small button, where the window's title bar ended on a wide screen and at the leading foot on a
           narrow one. It comes and goes as it stands, with a fade. -->
      <Transition :enter-active-class="FADING" :leave-active-class="FADING" :enter-from-class="FADED" :leave-to-class="FADED">
        <div v-if="!props.open" class="pointer-events-none fixed flex" :class="narrow ? '' : 'justify-end'" :style="pillPlace">
          <HintTip :text="props.pillLabel" press class="pointer-events-auto">
            <UButton
              ref="pill"
              :color="props.pillColor"
              variant="subtle"
              class="shadow-lg"
              :aria-label="props.pillLabel"
              @click="unfold"
            >
              <slot name="pill" />
            </UButton>
          </HintTip>
        </div>
      </Transition>
    </Teleport>
  </template>
</template>

<script setup lang="ts">
import { useBackClose } from "../domain/layers";
import { BESIDE_PAGE } from "../domain/overlays";
import {
  SHEET_HEIGHTS,
  WINDOW_GUTTER_PX,
  WINDOW_MIN,
  WINDOW_SIZE,
  clampRect,
  firstRect,
  keepRect,
  keepSheet,
  keptRect,
  keptSheet,
  stepOf,
  visibleBox,
  widthClass
} from "../domain/floating-window";
import { useNarrow } from "../domain/screen";

import type { ButtonProps } from "@nuxt/ui";
import type { ComponentPublicInstance } from "vue";
import type { SheetHeight, WindowFrame, WindowRect } from "../domain/floating-window";

interface Props {
  // Whether it stands unfolded; folded, it is its pill. The host holds it, so it may unfold it again.
  open: boolean;
  // The name its place and size are kept under in this browser.
  name: string;
  // What it is, as a screen reader names the window.
  label: string;
  // The pill's name, heard and shown in the shared tooltip.
  pillLabel: string;
  pillColor?: ButtonProps["color"];
  // The area it first stands in on a wide screen, read when it first stands there; the visible window where none.
  area?: () => WindowFrame | null;
  // The room the screen keeps at its foot, which the pill stands above on a narrow screen.
  foot?: number;
  size?: { width: number; height: number };
  floor?: { width: number; height: number };
}

const props = withDefaults(defineProps<Props>(), {
  pillColor: "neutral",
  area: undefined,
  foot: 0,
  size: () => WINDOW_SIZE,
  floor: () => WINDOW_MIN
});

const emit = defineEmits<{ "update:open": [open: boolean] }>();

// The lengths and easings are the console's own (`docs/components.md`, "Floating things"): a window grows out of
// its pill and shrinks back into it, and only fades where nothing was pressed or less movement was asked for.
const MOVING = "transition-[opacity,scale] duration-(--bmo-motion-pop) ease-(--bmo-ease-move) motion-reduce:transition-[opacity]";
const FADING = "transition-opacity duration-(--bmo-motion-quick) ease-(--bmo-ease-move)";
const FADED = "opacity-0";
const GROWN_FROM = "opacity-0 scale-50 motion-reduce:scale-100";

const SNAP_POINTS = [SHEET_HEIGHTS.short, SHEET_HEIGHTS.tall];

const narrow = useNarrow();
const nuxtApp = useNuxtApp();
const mounted = ref(false);
// The width class the window's place was last read under, so a window grown into another class stands at that
// class's own place.
const kindNow = ref(widthClass(Number.POSITIVE_INFINITY));
const rightToLeft = ref(false);
// The app's own root, where the window is drawn after the screens; the page's body where there is none.
const root = ref<Element | string>("body");

const rect = ref<WindowRect>({ x: 0, y: 0, width: props.size.width, height: props.size.height });
const sheet = ref<SheetHeight>("short");
// Whether the next fold or unfold was pressed for, so the window grows out of the pill or shrinks into it.
const grown = ref(false);

const box = useTemplateRef<HTMLElement>("box");
const bar = useTemplateRef<HTMLElement>("bar");
const pill = useTemplateRef<ComponentPublicInstance>("pill");
const sheetBody = useTemplateRef<HTMLElement>("sheetBody");

// The sheet's content as the drawer is handed it: the mark that leaves the page in use, and nothing outside it
// putting it away — a press, a tap or a focus there is the page's.
const sheetContent = {
  [BESIDE_PAGE]: "",
  onPointerDownOutside: (event: Event) => event.preventDefault(),
  onInteractOutside: (event: Event) => event.preventDefault(),
  onFocusOutside: (event: Event) => event.preventDefault()
};

// Where the pill stands: at the top trailing corner of the window's place on a wide screen, so the window unfolds
// out of it; at the leading foot above the screen's own foot on a narrow one. On a wide screen its box spans the
// window's width and lets presses through, the pill standing at the box's trailing end.
const pillPlace = computed(() => {
  if (narrow.value) {
    return { insetInlineStart: `${WINDOW_GUTTER_PX}px`, bottom: `${props.foot + WINDOW_GUTTER_PX}px` };
  }

  return { left: `${rect.value.x}px`, top: `${rect.value.y}px`, width: `${rect.value.width}px` };
});

function place(): void {
  const frame = visibleBox();
  const kind = widthClass(window.innerWidth);

  kindNow.value = kind;

  if (kind === "narrow") {
    sheet.value = keptSheet(props.name) ?? "short";

    return;
  }

  const kept = keptRect(props.name, kind);

  rect.value = kept === null
    ? firstRect(props.area?.() ?? frame, frame, props.size, props.floor, rightToLeft.value)
    : clampRect(kept, frame, props.floor);
}

// The window brought back into what is visible after the browser's window or its visible part changed.
function keepInView(): void {
  if (widthClass(window.innerWidth) !== kindNow.value) {
    place();

    return;
  }

  if (narrow.value) {
    writeInView();

    return;
  }

  rect.value = clampRect(rect.value, visibleBox(), props.floor);
}

function keep(): void {
  keepRect(props.name, widthClass(window.innerWidth), rect.value);
}

// A drag of the title bar or the corner, followed until the pointer lets go. A press on a control inside the bar is
// that control's, and a pointer's other buttons move nothing.
function follow(event: PointerEvent, change: (dx: number, dy: number, from: WindowRect) => WindowRect): void {
  const target = event.currentTarget as HTMLElement;
  const from = { ...rect.value };
  const startX = event.clientX;
  const startY = event.clientY;

  target.setPointerCapture(event.pointerId);
  event.preventDefault();

  const move = (moved: PointerEvent): void => {
    rect.value = clampRect(change(moved.clientX - startX, moved.clientY - startY, from), visibleBox(), props.floor);
  };
  const end = (): void => {
    target.removeEventListener("pointermove", move);
    target.removeEventListener("pointerup", end);
    target.removeEventListener("pointercancel", end);
    keep();
  };

  target.addEventListener("pointermove", move);
  target.addEventListener("pointerup", end);
  target.addEventListener("pointercancel", end);
}

function pressedOnControl(event: PointerEvent): boolean {
  return event.target instanceof Element && event.target.closest("button, a, input, textarea, select, [role='button']") !== null;
}

function startMove(event: PointerEvent): void {
  if (event.button !== 0 || pressedOnControl(event)) return;

  follow(event, (dx, dy, from) => ({ ...from, x: from.x + dx, y: from.y + dy }));
}

// The corner is the trailing one, so a page written right to left grows the window leftwards from it.
function startSize(event: PointerEvent): void {
  if (event.button !== 0) return;

  follow(event, (dx, dy, from) => sized(from, dx, dy));
}

function sized(from: WindowRect, dx: number, dy: number): WindowRect {
  if (!rightToLeft.value) return { ...from, width: from.width + dx, height: from.height + dy };

  const width = Math.max(props.floor.width, from.width - dx);

  return { ...from, x: from.x + from.width - width, width, height: from.height + dy };
}

function stepMove(event: KeyboardEvent): void {
  if (event.target !== bar.value) return;

  const step = stepOf(event.key, event.shiftKey);

  if (step === null) return;

  event.preventDefault();
  rect.value = clampRect({ ...rect.value, x: rect.value.x + step.dx, y: rect.value.y + step.dy }, visibleBox(), props.floor);
  keep();
}

function stepSize(event: KeyboardEvent): void {
  const step = stepOf(event.key, event.shiftKey);

  if (step === null) return;

  event.preventDefault();
  rect.value = clampRect(sized(rect.value, step.dx, step.dy), visibleBox(), props.floor);
  keep();
}

// A box written in inside the sheet stands where it is seen, above a keyboard. The sheet's body runs on under the
// screen's foot by what its height leaves hidden, so the browser's own bringing into view, which reads the body's box
// rather than what is seen, can leave the box behind the keyboard; the body is scrolled by what the box stands past
// the visible part, a gutter in.
function writeInView(): void {
  const writing = document.activeElement;

  if (!(writing instanceof HTMLElement) || sheetBody.value?.contains(writing) !== true || !writing.matches("textarea, input")) return;

  requestAnimationFrame(() => {
    const body = sheetBody.value;

    if (body === null) return;

    const box = writing.getBoundingClientRect();
    const seen = visibleBox();
    const low = seen.top + seen.height - WINDOW_GUTTER_PX;
    const high = Math.max(body.getBoundingClientRect().top, seen.top) + WINDOW_GUTTER_PX;

    if (box.bottom > low) body.scrollTop += box.bottom - low;
    else if (box.top < high) body.scrollTop -= high - box.top;
  });
}

function setSheet(height: SheetHeight): void {
  sheet.value = height;
  keepSheet(props.name, height);
}

function settleSheet(point: string | number | null): void {
  if (point === SHEET_HEIGHTS.tall) setSheet("tall");
  else if (point === SHEET_HEIGHTS.short) setSheet("short");
}

function pillElement(): HTMLElement | null {
  return (pill.value?.$el as HTMLElement | undefined) ?? null;
}

// Folding by a press shrinks the window into its pill. Where the focus stood inside the window it goes to the pill,
// so a keyboard is not left on nothing.
function fold(): void {
  const inside = box.value?.contains(document.activeElement) === true;

  grown.value = true;
  emit("update:open", false);

  if (inside) {
    void nextTick(() => pillElement()?.focus());
  }
}

function foldFromKey(event: KeyboardEvent): void {
  if (event.defaultPrevented) return;

  event.preventDefault();
  fold();
}

function unfold(): void {
  const fromPill = document.activeElement === pillElement() && document.activeElement !== null;

  grown.value = true;
  emit("update:open", true);

  if (fromPill) {
    void nextTick(() => bar.value?.focus());
  }
}

// The window stands as a layer of the back gesture while it stands unfolded on a wide screen; the sheet is the
// library's drawer and is found as one on its own.
useBackClose(
  computed(() => mounted.value && !narrow.value && props.open),
  fold
);

watch(narrow, () => {
  if (mounted.value) place();
});

// It is first placed a frame after it is set up, once whatever the screen laid out in the same turn — a band over
// the screen standing for the same news — has taken its room, so the area the host names is read as it stands.
onMounted(() => {
  rightToLeft.value = document.documentElement.dir === "rtl";
  root.value = (nuxtApp.vueApp as { _container?: Element })._container ?? "body";
  requestAnimationFrame(() => {
    place();
    mounted.value = true;
  });

  window.addEventListener("resize", keepInView);
  window.visualViewport?.addEventListener("resize", keepInView);
  window.visualViewport?.addEventListener("scroll", keepInView);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", keepInView);
  window.visualViewport?.removeEventListener("resize", keepInView);
  window.visualViewport?.removeEventListener("scroll", keepInView);
});
</script>
