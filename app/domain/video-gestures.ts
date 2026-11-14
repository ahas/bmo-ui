import { followSurface, pressTravelled, useLongPress } from "./longpress";
import { SKIP_SECONDS, skipTo } from "./video";

// What a finger on the video player's picture does (`docs/components.md`, "The video player"): a tap brings or
// hides the controls, two
// taps on a half skip, a held finger plays faster, a horizontal drag moves the position and a vertical one sets
// the brightness on the left half or the volume on the right. The reading is one state machine, apart from the
// element it drives: a press is a tap, a hold or a drag, and which of the two drag directions it is is settled
// once, by the first travel past the distance a hold allows.

/** How long after a tap a second tap on the same place makes a double tap. */
export const DOUBLE_TAP_MS = 300;

/** How far apart two taps may land and still be one double tap. */
export const DOUBLE_TAP_SLOP_PX = 30;

/** The dimmest and the brightest the picture is drawn, where a finger on its left half sets it. */
export const BRIGHTNESS_MIN = 0.2;
export const BRIGHTNESS_MAX = 2;

/** How long a cue stands once its gesture has ended. */
export const CUE_LINGER_MS = 700;

/** The least and the most a held finger plays at, whatever speed the viewer chose. */
export const HOLD_SPEED_MIN = 2;
export const HOLD_SPEED_MAX = 4;

// The layers over the page the component library marks, and the state each says it stands in. A gesture or a key
// is not the player's while one of them is open over it: a dialog, a drawer, a menu or a list dropped from a
// control. The layer the player itself stands in, as a dialog showing it large, is not over it.
const OPEN_LAYER = "[data-dismissable-layer][data-state='open'], [role='dialog'][data-state='open'], [role='menu'][data-state='open']";

/** Whether something the library or a host floats over the screen stands open, leaving out a layer holding `player`. */
export function overlayOpen(page: Pick<Document, "querySelectorAll">, player: Element | null = null): boolean {
  return Array.from(page.querySelectorAll(OPEN_LAYER)).some((layer) => player === null || !layer.contains(player));
}

/** The half of the picture a point stands on. */
export function sideOf(x: number, left: number, width: number): "left" | "right" {
  return x < left + width / 2 ? "left" : "right";
}

/** Which drag a travel makes, or none while it is still within a hold's reach. */
export function dragAxis(dx: number, dy: number): "seek" | "vertical" | null {
  if (!pressTravelled({ x: 0, y: 0 }, { x: dx, y: dy })) return null;

  return Math.abs(dx) >= Math.abs(dy) ? "seek" : "vertical";
}

/** Whether a tap landing now makes the double tap whose first tap ended at the given moment and point. */
export function tapMatches(first: { at: number; x: number; y: number }, second: { at: number; x: number; y: number }): boolean {
  const waited = second.at - first.at;

  return waited >= 0 && waited <= DOUBLE_TAP_MS && Math.hypot(second.x - first.x, second.y - first.y) <= DOUBLE_TAP_SLOP_PX;
}

/** Where a horizontal drag from a starting position lands: the whole picture's width moves the whole length. */
export function seekFrom(start: number, dx: number, width: number, length: number | null): number | null {
  if (length === null || width <= 0) return null;

  return Math.min(length, Math.max(0, start + (dx / width) * length));
}

/** A volume or a brightness moved by a vertical drag: the whole picture's height covers the whole range. */
export function levelFrom(start: number, dy: number, height: number): number {
  if (height <= 0) return clampLevel(start);

  return clampLevel(start - dy / height);
}

/** The picture's brightness moved by a vertical drag, across its own dimmest and brightest. */
export function brightnessFrom(start: number, dy: number, height: number): number {
  if (height <= 0) return clampBrightness(start);

  return clampBrightness(start - (dy / height) * (BRIGHTNESS_MAX - BRIGHTNESS_MIN));
}

/** The speed a held finger plays at: twice the chosen speed, never under the fast one nor over the fastest. */
export function heldSpeed(chosen: number): number {
  return Math.min(HOLD_SPEED_MAX, Math.max(HOLD_SPEED_MIN, chosen * 2));
}

function clampLevel(level: number): number {
  return Math.min(1, Math.max(0, level));
}

function clampBrightness(level: number): number {
  return Math.min(BRIGHTNESS_MAX, Math.max(BRIGHTNESS_MIN, level));
}

/** What the cue over the picture says, before the screen gives it words. */
export type PlayerCue =
  | { kind: "seek"; seconds: number; from: number; length: number | null; by: number | null }
  | { kind: "brightness" | "volume"; level: number }
  | { kind: "hold"; speed: number };

/** What the gesture reader tells the player it stands on. */
export interface GestureSpec {
  /** The length the position may be moved within, or none where the file has not said it. */
  length: () => number | null;
  /** The speed the viewer chose, what a held finger returns to. */
  speed: () => number;
  volume: () => number;
  setVolume: (level: number) => void;
  brightness: () => number;
  setBrightness: (level: number) => void;
  /** The position as the picture now stands at it, while a finger moves it. */
  onTime: (seconds: number) => void;
  /** The cue to stand over the picture, or none. */
  onCue: (cue: PlayerCue | null) => void;
  /** What a finished gesture did, said once. */
  onSettled: (cue: PlayerCue) => void;
  /** A tap that was not the first of a double tap. */
  onTap: () => void;
  wake: () => void;
  /** Whether something stands over the picture that a gesture must not reach through. */
  blocked: () => boolean;
}

export interface GestureReader {
  /** A finger that has rested long enough to be held, read by the layer's one long press. */
  hold: () => void;
  dispose: () => void;
}

interface Press {
  pointerId: number;
  x: number;
  y: number;
  side: "left" | "right";
  width: number;
  height: number;
  startTime: number;
  startVolume: number;
  startBrightness: number;
  axis: "seek" | "brightness" | "volume" | null;
  held: boolean;
  holding: boolean;
  second: boolean;
}

/** Reads a finger on a picture, answering the call that ends it and the hold the shared long press fires. */
export function attachGestures(picture: HTMLVideoElement, spec: GestureSpec): GestureReader {
  let press: Press | null = null;
  let lastTap: { at: number; x: number; y: number } | null = null;
  let singleTap: ReturnType<typeof setTimeout> | null = null;
  let cueTimer: ReturnType<typeof setTimeout> | null = null;
  let lastCue: PlayerCue | null = null;

  function cancelSingleTap(): void {
    if (singleTap !== null) clearTimeout(singleTap);

    singleTap = null;
  }

  function setCue(cue: PlayerCue | null): void {
    if (cueTimer !== null) clearTimeout(cueTimer);

    cueTimer = null;
    lastCue = cue;
    spec.onCue(cue);
  }

  function settleCue(cue: PlayerCue | null): void {
    setCue(cue);

    if (cue !== null) {
      cueTimer = setTimeout(() => {
        cueTimer = null;
        lastCue = null;
        spec.onCue(null);
      }, CUE_LINGER_MS);
    }
  }

  function hideCue(): void {
    setCue(null);
  }

  function endHold(ended: Press): void {
    ended.holding = false;
    picture.playbackRate = spec.speed();
    hideCue();
    spec.onSettled({ kind: "hold", speed: spec.speed() });
  }

  function hold(): void {
    if (press === null || press.held || press.axis !== null) return;

    press.held = true;

    // A picture that is not playing has no speed to raise; the long press still keeps its end from being a tap.
    if (picture.paused) return;

    press.holding = true;

    const speed = heldSpeed(spec.speed());

    picture.playbackRate = speed;
    setCue({ kind: "hold", speed });
    spec.onSettled({ kind: "hold", speed });
  }

  function down(event: PointerEvent): void {
    if (event.pointerType !== "touch" || !event.isPrimary || press !== null || spec.blocked()) return;

    const box = picture.getBoundingClientRect();
    const second = lastTap !== null && tapMatches(lastTap, { at: event.timeStamp, x: event.clientX, y: event.clientY });

    if (second) cancelSingleTap();

    press = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      side: sideOf(event.clientX, box.left, box.width),
      width: box.width,
      height: box.height,
      startTime: picture.currentTime,
      startVolume: spec.volume(),
      startBrightness: spec.brightness(),
      axis: null,
      held: false,
      holding: false,
      second
    };

    hideCue();
    spec.wake();
  }

  function move(event: PointerEvent): void {
    if (press === null || event.pointerId !== press.pointerId) return;

    spec.wake();

    if (press.held) return;

    const dx = event.clientX - press.x;
    const dy = event.clientY - press.y;
    const axis = dragAxis(dx, dy);

    if (press.axis === null) {
      if (axis === null) return;

      press.axis = axis === "seek" ? "seek" : press.side === "left" ? "brightness" : "volume";
    }

    if (press.axis === "seek") {
      const length = spec.length();
      const to = seekFrom(press.startTime, dx, press.width, length);

      if (to === null) return;

      picture.currentTime = to;
      spec.onTime(to);
      setCue({ kind: "seek", seconds: to, from: press.startTime, length, by: null });
    } else if (press.axis === "volume") {
      const level = levelFrom(press.startVolume, dy, press.height);

      spec.setVolume(level);
      setCue({ kind: "volume", level });
    } else {
      const level = brightnessFrom(press.startBrightness, dy, press.height);

      spec.setBrightness(level);
      setCue({ kind: "brightness", level });
    }
  }

  function settle(pressed: Press, at: number): void {
    if (pressed.holding) {
      endHold(pressed);

      return;
    }

    // A hold that found the picture paused played nothing and is no tap either.
    if (pressed.held) return;

    if (pressed.axis === "seek") {
      const cue: PlayerCue = { kind: "seek", seconds: picture.currentTime, from: pressed.startTime, length: spec.length(), by: null };

      settleCue(cue);
      spec.onSettled(cue);
    } else if (pressed.axis === "volume") {
      const cue: PlayerCue = { kind: "volume", level: spec.volume() };

      settleCue(cue);
      spec.onSettled(cue);
    } else if (pressed.axis === "brightness") {
      const cue: PlayerCue = { kind: "brightness", level: spec.brightness() };

      settleCue(cue);
      spec.onSettled(cue);
    } else if (pressed.second) {
      const by = pressed.side === "left" ? -SKIP_SECONDS : SKIP_SECONDS;
      const from = picture.currentTime;
      const seconds = skipTo(from, by, spec.length());
      const cue: PlayerCue = { kind: "seek", seconds, from, length: spec.length(), by };

      lastTap = null;
      picture.currentTime = seconds;
      spec.onTime(seconds);
      settleCue(cue);
      spec.onSettled(cue);
    } else {
      lastTap = { at, x: pressed.x, y: pressed.y };
      cancelSingleTap();
      singleTap = setTimeout(() => {
        singleTap = null;
        lastTap = null;
        spec.onTap();
      }, DOUBLE_TAP_MS);
    }
  }

  function up(event: PointerEvent): void {
    if (press === null || event.pointerId !== press.pointerId) return;

    const ended = press;

    press = null;
    settle(ended, event.timeStamp);
  }

  function cancel(event: PointerEvent): void {
    if (press === null || event.pointerId !== press.pointerId) return;

    const ended = press;

    press = null;

    if (ended.holding) {
      endHold(ended);
    } else if (ended.axis !== null) {
      const cue = lastCue;

      if (cue !== null) settleCue(cue);
    }
  }

  function preventMenu(event: Event): void {
    event.preventDefault();
  }

  picture.addEventListener("pointerdown", down);
  picture.addEventListener("pointermove", move);
  picture.addEventListener("pointerup", up);
  picture.addEventListener("pointercancel", cancel);
  picture.addEventListener("contextmenu", preventMenu);

  return {
    hold,
    dispose: () => {
      picture.removeEventListener("pointerdown", down);
      picture.removeEventListener("pointermove", move);
      picture.removeEventListener("pointerup", up);
      picture.removeEventListener("pointercancel", cancel);
      picture.removeEventListener("contextmenu", preventMenu);
      cancelSingleTap();

      if (cueTimer !== null) clearTimeout(cueTimer);

      if (press?.holding) picture.playbackRate = spec.speed();
    }
  };
}

export interface PlayerGestureSpec extends GestureSpec {
  /** The picture the finger lands on, followed as the player opens another stream. */
  surface: () => HTMLVideoElement | null;
}

/**
 * A finger on a player's picture, read for as long as the picture stands: the one state machine above, and the
 * layer's one long press for the half second that makes a press a hold (`docs/components.md`, "A held finger"),
 * so a slide before it, a scroll and a second finger end it as they end every other hold.
 */
export function usePlayerGestures(spec: PlayerGestureSpec): void {
  let reader: GestureReader | null = null;

  followSurface(
    spec.surface,
    (picture) => {
      reader = attachGestures(picture as HTMLVideoElement, spec);
    },
    () => {
      reader?.dispose();
      reader = null;
    }
  );

  useLongPress({
    surface: spec.surface,
    press: (target) => {
      const picture = spec.surface();

      if (picture === null || spec.blocked() || !(target instanceof Element) || !picture.contains(target)) return null;
      if (target.closest("button, a, input, textarea, select, [contenteditable]") !== null) return null;

      return () => reader?.hold();
    }
  });
}
