import { onBeforeUnmount, onMounted, watch } from "vue";

// A finger resting on one point until it is a hold, a touch screen's right press
// (`docs/components.md`, "A held finger"). It is one mechanism for every screen: a hold takes as long
// and ends on the same movement wherever it stands, and what a hold means — a menu, the start of
// choosing — is the caller's.
//
// A finger that moves while it is held is not holding. Before the hold fires the press ends on a
// slide past a phone's own touch distance, on anything under the finger starting to scroll, on the
// lift, on a second finger and on the browser taking the touch for a gesture of its own. The scroll
// is read as well as the distance because the browser starts a scroll on its own reading of the
// finger, which a slow scroll reaches before any fixed distance does; once what is under the finger
// has moved, the finger is scrolling it, however still it then stands.

// How long a finger rests before it is held.
export const HOLD_MS = 500;
// How far it may slide from where it landed and still be resting: the distance a phone itself reads
// a touch as moving by.
const HOLD_SLOP_PX = 10;
// How lately what is under a finger may have moved for the finger landing on it to be stopping it
// rather than pressing. A list gliding from a flick reports its position every frame, a sixtieth of
// a second, and still within a few frames at the slow end of the glide where it creeps less than a
// pixel a frame; a hand that lifts off a list it was scrolling and comes down again to hold takes
// several times this long. So this covers six frames and stays well under the quickest lift and
// return.
const GLIDE_MS = 100;

export interface TouchPoint {
  x: number;
  y: number;
}

// Whether a finger that landed at one point and now stands at another has gone somewhere, which is
// what ends a press before the half second makes it a hold.
export function pressTravelled(from: TouchPoint, to: TouchPoint): boolean {
  return Math.hypot(to.x - from.x, to.y - from.y) > HOLD_SLOP_PX;
}

// Whether a finger landing at one moment found what is under it still moving from the last time it
// scrolled. Such a touch is the one that stops the glide, and its finger resting afterwards is not a
// hold: it is left where it stopped the list, not pressed on a row.
export function stillGliding(movedAt: number, landedAt: number): boolean {
  return landedAt - movedAt < GLIDE_MS;
}

export interface LongPress {
  // Where the fingers are listened for.
  surface: () => HTMLElement | null;
  // What a finger landing on this element at this point would do once it is held, or null where a
  // press there is no hold of this surface's.
  press: (target: Element, at: TouchPoint) => (() => void) | null;
}

export function useLongPress(spec: LongPress): void {
  let press: { target: Element; x: number; y: number; timer: ReturnType<typeof setTimeout> } | null = null;
  // What last scrolled anywhere on the page, and when.
  let scrolled: { scroller: EventTarget; at: number } | null = null;

  function cancel(): void {
    if (press !== null) {
      clearTimeout(press.timer);
      press = null;
    }
  }

  // Whether a scroll of one element carries what stands at another: the element holds it, or is the
  // page itself.
  function carries(scroller: EventTarget, target: Element): boolean {
    return scroller === document || (scroller instanceof Node && scroller.contains(target));
  }

  function onTouchStart(event: TouchEvent): void {
    cancel();

    const touch = event.touches[0];
    const target = event.target;

    if (event.touches.length !== 1 || touch === undefined || !(target instanceof Element)) {
      return;
    }

    if (scrolled !== null && carries(scrolled.scroller, target) && stillGliding(scrolled.at, Date.now())) {
      return;
    }

    const at = { x: touch.clientX, y: touch.clientY };
    const hold = spec.press(target, at);

    if (hold === null) {
      return;
    }

    press = {
      target,
      ...at,
      timer: setTimeout(() => {
        press = null;
        navigator.vibrate?.(10);
        hold();
      }, HOLD_MS)
    };
  }

  // The slide is read off the pointer rather than the touch: a browser holds its touch moves back
  // until the finger has left its own slop, which is wider than a long press allows, while the
  // pointer reports every move.
  function onPointerMove(event: PointerEvent): void {
    if (press !== null && event.pointerType !== "mouse" && pressTravelled(press, { x: event.clientX, y: event.clientY })) {
      cancel();
    }
  }

  // A scroll does not rise to the surface the touches are listened on, so it is caught on its way
  // down from the document, wherever it happens.
  function onScroll(event: Event): void {
    if (event.target === null) {
      return;
    }

    scrolled = { scroller: event.target, at: Date.now() };

    if (press !== null && carries(event.target, press.target)) {
      cancel();
    }
  }

  followSurface(
    spec.surface,
    (surface) => {
      surface.addEventListener("touchstart", onTouchStart, { passive: true });
      surface.addEventListener("pointermove", onPointerMove, { passive: true });
      surface.addEventListener("touchend", cancel);
      surface.addEventListener("touchcancel", cancel);
      surface.addEventListener("pointercancel", cancel);
    },
    (surface) => {
      cancel();
      surface.removeEventListener("touchstart", onTouchStart);
      surface.removeEventListener("pointermove", onPointerMove);
      surface.removeEventListener("touchend", cancel);
      surface.removeEventListener("touchcancel", cancel);
      surface.removeEventListener("pointercancel", cancel);
    }
  );

  onMounted(() => document.addEventListener("scroll", onScroll, { capture: true, passive: true }));
  onBeforeUnmount(() => document.removeEventListener("scroll", onScroll, true));
}

// Listening on a surface for as long as it stands. It is followed rather than read once on
// mounting: a screen may stand it only once what it shows has been read, and stand another in its
// place later.
export function followSurface(surface: () => HTMLElement | null, listen: (element: HTMLElement) => void, leave: (element: HTMLElement) => void): void {
  let listening: HTMLElement | null = null;

  function follow(): void {
    const now = surface();

    if (now === listening) {
      return;
    }

    if (listening !== null) leave(listening);
    if (now !== null) listen(now);

    listening = now;
  }

  watch(surface, follow, { flush: "post" });
  onMounted(follow);
  onBeforeUnmount(() => {
    if (listening !== null) leave(listening);

    listening = null;
  });
}
