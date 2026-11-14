<template>
  <!-- The shared tooltip for words that say more than what they stand on: a name cut to fit its
       box, a number standing for something with a name (`docs/components.md`, "Tooltips"). A
       pointer brings it up on hover and the keyboard on focus, the library's own way; a focus the
       keyboard did not bring, as one handed back by a closing dialog, brings up nothing. A finger has
       no hover, so it brings it up with a tap where a tap does nothing else, and by resting on what
       it stands on where a tap acts there; the next touch anywhere puts it away. Its words wrap
       inside a box no wider than a phone has room for, so a long name is read whole. Its own box
       around what it stands on is marked where it holds one element and no words, so a row that
       lays out its controls reads the box as the control inside it. -->
  <UTooltip
    v-model:open="shown"
    :text="props.text"
    :kbds="props.kbds"
    :disabled="props.disabled"
    disable-closing-trigger
    :ignore-non-keyboard-focus="TOOLTIP_PROVIDER.ignoreNonKeyboardFocus"
    :content="tipContent"
    :portal="props.portal"
    :ui="TOOLTIP_UI"
  >
    <template v-if="$slots.content" #content>
      <slot name="content" />
    </template>

    <component
      :is="props.as"
      ref="trigger"
      v-bind="$attrs"
      :data-hint-single="single ? '' : undefined"
      :class="props.press && !props.disabled ? 'select-none [-webkit-touch-callout:none]' : ''"
      @pointerenter="onPointerEnter"
      @pointerdown="pointer = $event.pointerType"
      @focusin="onFocusIn"
      @focusout="shown = false"
      @click.capture="onClick"
      @contextmenu="onContextMenu"
    >
      <slot />
    </component>
  </UTooltip>
</template>

<script setup lang="ts">
import { useLongPress } from "../domain/longpress";
import { TOOLTIP_PROVIDER, TOOLTIP_UI } from "../domain/tooltip";

import type { Component, ComponentPublicInstance } from "vue";

interface Props {
  text?: string;
  // What a screen reader is told, where the words drawn are a slot of the caller's that can change
  // while the tooltip stands; the library otherwise reads them once, as it opens.
  label?: string;
  // Only where what it stands on is actually cut short by its box; a name read whole has nothing
  // more to say.
  cut?: boolean;
  // What it stands on acts on a tap, so a finger rests on it to read it instead.
  press?: boolean;
  // Whether a focus arriving on what it stands on is the keyboard's, where the browser's visible-focus
  // tell cannot say so for it; that tell by default.
  keyboardFocus?: (event: FocusEvent) => boolean;
  disabled?: boolean;
  as?: string | Component;
  // Which side of what it stands on it comes up on, where the library's own side would cover
  // something that must stay read — a chip lying over a picture's foot.
  side?: "top" | "right" | "bottom" | "left";
  // The keys that press what it stands on, shown after its words in the library's key marks.
  kbds?: string[];
  // Where it is drawn: the page's body unless what it stands on is inside an element taken to full
  // screen, which is all the browser shows then.
  portal?: boolean | string | HTMLElement;
}

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<Props>(), { text: undefined, label: undefined, cut: false, press: false, keyboardFocus: undefined, disabled: false, as: "span", side: undefined, kbds: undefined, portal: true });

// What the library is told of the tooltip's own box: the name a screen reader hears, and the side.
const tipContent = computed(() => {
  const content = { ...(props.label === undefined ? {} : { ariaLabel: props.label }), ...(props.side === undefined ? {} : { side: props.side }) };

  return Object.keys(content).length === 0 ? undefined : content;
});

// Said as it is about to be read: by a pointer coming over it, a focus or a finger.
const emit = defineEmits<{ ask: [] }>();

const open = ref(false);
const pointer = ref("");
const trigger = useTemplateRef<HTMLElement | ComponentPublicInstance>("trigger");
// The tap that ends a finger's rest is the rest's, not a press of what it stands on.
let restEnded = false;

function element(): HTMLElement | null {
  const found = trigger.value;

  if (found instanceof HTMLElement) return found;

  return (found?.$el as HTMLElement | undefined) ?? null;
}

// Whether its box holds one element and no words of its own, read off what was drawn each time it is
// drawn again.
const single = ref(false);

function readSingle(): void {
  const box = element();

  single.value = box !== null && box.childElementCount === 1 && [...box.childNodes].every((node) => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim() === "");
}

onMounted(readSingle);
onUpdated(readSingle);

function isCut(): boolean {
  const box = element();

  return box !== null && box.scrollWidth > box.clientWidth;
}

const shown = computed({
  get: () => open.value,
  set: (value: boolean) => {
    // Switched off, it opens for nothing: a tap and a resting finger as little as a hover or a focus.
    if (value && props.disabled) return;
    if (value && props.cut && !isCut()) return;
    if (value) emit("ask");

    open.value = value;
  }
});

function onPointerEnter(event: PointerEvent): void {
  if (event.pointerType === "mouse") emit("ask");
}

// The library opens on its own trigger's focus; a focus landing on something inside is the same
// question asked of the same words.
function onFocusIn(event: FocusEvent): void {
  if (props.keyboardFocus === undefined ? visibleFocus(event) : props.keyboardFocus(event)) shown.value = true;
}

function visibleFocus(event: FocusEvent): boolean {
  return event.target instanceof Element && event.target.matches(":focus-visible");
}

// The next touch anywhere puts it away, as a tap outside puts away anything floating. A touch on
// what it stands on puts it away too, and the tap it ends in does not bring it straight back.
function closeOnNextTouch(): void {
  document.addEventListener(
    "pointerdown",
    (event) => {
      open.value = false;
      restEnded = event.target instanceof Node && (element()?.contains(event.target) ?? false);
    },
    { once: true, capture: true }
  );
}

function showForFinger(): void {
  shown.value = true;

  if (open.value) closeOnNextTouch();
}

function onClick(event: MouseEvent): void {
  const by = pointer.value;

  pointer.value = "";

  if (restEnded) {
    restEnded = false;

    if (props.press) {
      event.preventDefault();
      event.stopPropagation();
    }

    return;
  }

  if (by === "touch" && !props.press) showForFinger();
}

function onContextMenu(event: MouseEvent): void {
  if (props.press && pointer.value === "touch") event.preventDefault();
}

// A finger resting on it is the layer's one long press, so one that set off scrolls instead.
useLongPress({
  surface: () => (props.press && !props.disabled ? element() : null),
  press: () => () => {
    showForFinger();
    // The finger lifting off the rest is no tap of what it rested on.
    restEnded = true;
  }
});
</script>
