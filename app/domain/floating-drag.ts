import { nextTick, onScopeDispose, readonly, ref } from "vue";

import { HOLD_SLOP_PX } from "./longpress";

import type { Ref } from "vue";

// A small thing floating over the page, moved by a pointer or a finger the way a picture-in-picture
// window is (`docs/components.md`, "Dragged like a picture-in-picture window"). Telling a press from a
// drag, following the pointer, the throw and the click a drag ends in are this module's; where the
// thing stands, how far it may go and where it settles are its host's.

/** The top leading corner of the thing dragged, in pixels of whatever box the host places it in. */
export interface DragPoint {
  left: number;
  top: number;
}

/** The edges the thing's top leading corner may reach while it is dragged. */
export interface DragBounds {
  minLeft: number;
  maxLeft: number;
  minTop: number;
  maxTop: number;
}

export type DragSide = "left" | "right";

// How far a mouse and a pen travel before a press becomes a drag. A finger settling on glass wanders
// further than a mouse held still, so it is given the held finger's own distance.
const MOUSE_SLOP_PX = 4;
const PEN_SLOP_PX = 6;

// How far ahead a throw is carried when choosing the side it settles on, in seconds of its speed.
const THROW_S = 0.15;

const MS_PER_S = 1000;

export function dragSlop(pointerType: string): number {
  switch (pointerType) {
    case "touch":
      return HOLD_SLOP_PX;
    case "pen":
      return PEN_SLOP_PX;
    default:
      return MOUSE_SLOP_PX;
  }
}

export function isDrag(dx: number, dy: number, pointerType: string): boolean {
  return Math.hypot(dx, dy) > dragSlop(pointerType);
}

/** A value held between two edges; where the edges cross, the lower one wins. */
export function clampTo(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * The side a thing `width` wide let go at `left`, moving sideways at `speed` pixels a second, settles
 * on: the one its centre is nearer to once the throw is carried on a little.
 */
export function settledSide(left: number, width: number, bounds: DragBounds, speed: number): DragSide {
  const centre = left + width / 2 + speed * THROW_S;
  const middle = (bounds.minLeft + bounds.maxLeft + width) / 2;

  return centre < middle ? "left" : "right";
}

/**
 * The thing glided from where it stood at `before` to where it stands now, at the shared `pop` length
 * with the `enter` easing, both read off the stylesheet's tokens; it stands there at once where less
 * movement was asked for. The glide is a translation of its own, so the thing's other transforms
 * stand as they are, and the next glide or drag takes it off.
 */
export function glideFrom(element: HTMLElement, before: DOMRect): void {
  const after = element.getBoundingClientRect();
  const dx = before.left - after.left;
  const dy = before.top - after.top;

  stopGlide(element);

  if ((dx === 0 && dy === 0) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  element.style.translate = `${dx}px ${dy}px`;
  // The browser lays the thing out at its starting offset before the transition is set, so the
  // offset is where it glides from rather than a value it never showed.
  void element.offsetWidth;
  element.style.transition = "translate var(--bmo-motion-pop) var(--bmo-ease-enter)";
  element.style.translate = "";
  element.addEventListener("transitionend", () => stopGlide(element), { once: true });
  element.addEventListener("transitioncancel", () => stopGlide(element), { once: true });
}

function stopGlide(element: HTMLElement): void {
  element.style.transition = "";
  element.style.translate = "";
}

export interface FloatingDrag {
  // The thing dragged, which the glide moves.
  element: () => HTMLElement | null;
  // Read once a press has travelled into a drag: where the thing stands and the edges it may reach;
  // null where it cannot be moved now.
  begin: () => { from: DragPoint; bounds: DragBounds } | null;
  // Where it stands, each time the pointer moves while it is dragged.
  move: (at: DragPoint) => void;
  // Where it was let go, the edges it was held between and how fast it was moving sideways at the
  // end, in pixels a second. The host settles it where it means it to stand, and the module glides
  // it there from where it was let go once the host's change is drawn.
  settle: (at: DragPoint, bounds: DragBounds, speed: number) => void;
}

export interface FloatingDragHandle {
  // Handed the pointer going down on the thing.
  grab: (event: PointerEvent) => void;
  // Handed every click on the thing in its capture phase, before anything inside it hears it.
  swallow: (event: MouseEvent) => void;
  // Whether a drag is under way, from the press travelling to its letting go.
  dragging: Readonly<Ref<boolean>>;
}

// One press on the thing, from the pointer going down: a press until it has travelled past the slop,
// a drag from then on.
interface Held {
  pointer: number;
  type: string;
  x: number;
  y: number;
  drag: { from: DragPoint; bounds: DragBounds; at: DragPoint } | null;
  lastX: number;
  lastAt: number;
  speed: number;
}

export function useFloatingDrag(spec: FloatingDrag): FloatingDragHandle {
  const dragging = ref(false);
  let held: Held | null = null;
  // Whether the press now ending was a drag, so the click it ends in is the drag's.
  let dragged = false;

  function listen(on: boolean): void {
    if (on) {
      window.addEventListener("pointermove", follow);
      window.addEventListener("pointerup", release);
      window.addEventListener("pointercancel", release);
      window.addEventListener("dragstart", holdNativeDrag, true);

      return;
    }

    window.removeEventListener("pointermove", follow);
    window.removeEventListener("pointerup", release);
    window.removeEventListener("pointercancel", release);
    window.removeEventListener("dragstart", holdNativeDrag, true);
  }

  // A mouse pressed on a link or a picture inside the thing would start the browser's own drag of it, which
  // cancels the pointer the drag follows; while a press is held, none starts.
  function holdNativeDrag(event: DragEvent): void {
    event.preventDefault();
  }

  function grab(event: PointerEvent): void {
    dragged = false;

    if (!event.isPrimary || event.button !== 0) return;

    const element = spec.element();

    if (element !== null) stopGlide(element);

    held = { pointer: event.pointerId, type: event.pointerType, x: event.clientX, y: event.clientY, drag: null, lastX: event.clientX, lastAt: event.timeStamp, speed: 0 };
    listen(true);
  }

  function follow(event: PointerEvent): void {
    if (held === null || event.pointerId !== held.pointer) return;

    const dx = event.clientX - held.x;
    const dy = event.clientY - held.y;

    if (held.drag === null) {
      if (!isDrag(dx, dy, held.type)) return;

      const begun = spec.begin();

      if (begun === null) {
        end();

        return;
      }

      held.drag = { ...begun, at: begun.from };
      dragging.value = true;
    }

    const elapsed = event.timeStamp - held.lastAt;

    if (elapsed > 0) held.speed = ((event.clientX - held.lastX) / elapsed) * MS_PER_S;

    held.lastX = event.clientX;
    held.lastAt = event.timeStamp;

    const { from, bounds } = held.drag;

    held.drag.at = { left: clampTo(from.left + dx, bounds.minLeft, bounds.maxLeft), top: clampTo(from.top + dy, bounds.minTop, bounds.maxTop) };
    spec.move(held.drag.at);
  }

  async function release(event: PointerEvent): Promise<void> {
    const ended = held;

    if (ended === null || event.pointerId !== ended.pointer) return;

    end();

    if (ended.drag === null) return;

    dragged = true;

    const element = spec.element();
    const before = element?.getBoundingClientRect() ?? null;

    spec.settle(ended.drag.at, ended.drag.bounds, ended.speed);
    await nextTick();

    if (element !== null && before !== null && element.isConnected) glideFrom(element, before);
  }

  function end(): void {
    held = null;
    dragging.value = false;
    listen(false);
  }

  // A click that ends a drag is the drag's; one from the keyboard carries no pointer and is passed on.
  function swallow(event: MouseEvent): void {
    if (dragged && event.detail !== 0) {
      event.stopPropagation();
      event.preventDefault();
    }

    dragged = false;
  }

  onScopeDispose(() => {
    if (held !== null) end();
  });

  return { grab, swallow, dragging: readonly(dragging) };
}
