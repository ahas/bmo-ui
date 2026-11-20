import { NARROW_MAX_PX } from "./screen";

import type { DragBounds, DragSide } from "./floating-drag";

// Where a window beside the page stands (`docs/components.md`, "A window beside the page"): a place
// and a size of its own on a wide screen, kept inside what is visible and kept per browser, one of
// two heights as a sheet on a narrow one, and where its pill stands there once dragged. Everything
// here is arithmetic over rectangles and the browser's storage, so the component only reads the
// pointer and the keys and hands them in.

/** A window's place and size, in pixels of the page's layout. */
export interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The part of the window a person can see: its top leading corner and its size. */
export interface WindowFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The room a window keeps from every edge of what is visible. */
export const WINDOW_GUTTER_PX = 16;

/** How far one arrow key moves or sizes a window, and how far one with Shift does. */
export const WINDOW_STEP_PX = 16;
export const WINDOW_LEAP_PX = 64;

/** The floor a window is sized down to where its host names none. */
export const WINDOW_MIN = { width: 320, height: 240 } as const;

/** The size a window first stands at where its host names none. */
export const WINDOW_SIZE = { width: 400, height: 520 } as const;

// The share of the area a window first stands in that it may take in height, so the foot of what the
// area shows — the newest of a list read from the top, the box a person writes in — stays clear.
const FIRST_HEIGHT_SHARE = 0.6;

/** The two heights a sheet stands at, as shares of the visible height. */
export const SHEET_HEIGHTS = { short: 0.45, tall: 0.9 } as const;

export type SheetHeight = keyof typeof SHEET_HEIGHTS;

/** The class of width a place is kept under: a narrow screen's sheet, and three widths of window. */
export type WidthClass = "narrow" | "medium" | "wide" | "widest";

const MEDIUM_MAX_PX = 1023;
const WIDE_MAX_PX = 1535;

export function widthClass(width: number): WidthClass {
  if (width <= NARROW_MAX_PX) return "narrow";
  if (width <= MEDIUM_MAX_PX) return "medium";

  return width <= WIDE_MAX_PX ? "wide" : "widest";
}

/**
 * What is visible of the window: the browser's visual viewport where it has one, so a keyboard laid
 * over the page's foot counts, and the window's own size otherwise.
 */
export function visibleBox(): WindowFrame {
  const view = window.visualViewport;

  if (view === null || view === undefined) {
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  }

  return { left: view.offsetLeft, top: view.offsetTop, width: view.width, height: view.height };
}

function within(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

/**
 * A window brought inside what is visible, a gutter in from every edge: its size first, down to what
 * the frame has room for and no further down than its floor where the frame has room for that, then
 * its place.
 */
export function clampRect(rect: WindowRect, frame: WindowFrame, floor: { width: number; height: number } = WINDOW_MIN): WindowRect {
  const roomWidth = Math.max(0, frame.width - WINDOW_GUTTER_PX * 2);
  const roomHeight = Math.max(0, frame.height - WINDOW_GUTTER_PX * 2);
  const width = Math.round(Math.min(Math.max(rect.width, Math.min(floor.width, roomWidth)), roomWidth));
  const height = Math.round(Math.min(Math.max(rect.height, Math.min(floor.height, roomHeight)), roomHeight));
  const left = frame.left + WINDOW_GUTTER_PX;
  const top = frame.top + WINDOW_GUTTER_PX;

  return {
    x: Math.round(within(rect.x, left, left + roomWidth - width)),
    y: Math.round(within(rect.y, top, top + roomHeight - height)),
    width,
    height
  };
}

/**
 * Where a window stands the first time in a width class: at its size, at the top trailing corner of
 * the area its host names, a gutter in from both edges, never taller than its share of that area,
 * and inside what is visible. The trailing corner is the right one in a page written left to right
 * and the left one otherwise.
 */
export function firstRect(
  area: WindowFrame,
  frame: WindowFrame,
  size: { width: number; height: number } = WINDOW_SIZE,
  floor: { width: number; height: number } = WINDOW_MIN,
  rightToLeft = false
): WindowRect {
  const width = Math.min(size.width, area.width - WINDOW_GUTTER_PX * 2);
  const height = Math.min(size.height, Math.round(area.height * FIRST_HEIGHT_SHARE));
  const x = rightToLeft ? area.left + WINDOW_GUTTER_PX : area.left + area.width - WINDOW_GUTTER_PX - width;

  return clampRect({ x, y: area.top + WINDOW_GUTTER_PX, width, height }, frame, floor);
}

/** Where an arrow key moves a window or its size, by a step or with Shift by a leap; null for any other key. */
export function stepOf(key: string, leap: boolean): { dx: number; dy: number } | null {
  const by = leap ? WINDOW_LEAP_PX : WINDOW_STEP_PX;

  switch (key) {
    case "ArrowLeft":
      return { dx: -by, dy: 0 };
    case "ArrowRight":
      return { dx: by, dy: 0 };
    case "ArrowUp":
      return { dx: 0, dy: -by };
    case "ArrowDown":
      return { dx: 0, dy: by };
    default:
      return null;
  }
}

// The browser's storage a place is kept in. It can refuse — a private window, blocked site data — and
// a refusal is nothing kept, never an error the window stands or falls by.
function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function keyOf(name: string, kind: WidthClass): string {
  return `bmo-ui:window:${name}:${kind}`;
}

function read(key: string): unknown {
  try {
    const kept = storage()?.getItem(key) ?? null;

    return kept === null ? null : (JSON.parse(kept) as unknown);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // A storage that refuses keeps nothing; the window stands where it stands all the same.
  }
}

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** The place and size kept for a window under its name and width class, or null where none is kept. */
export function keptRect(name: string, kind: WidthClass): WindowRect | null {
  const kept = read(keyOf(name, kind));

  if (typeof kept !== "object" || kept === null) return null;

  const { x, y, width, height } = kept as Record<string, unknown>;

  return finite(x) && finite(y) && finite(width) && finite(height) ? { x, y, width, height } : null;
}

export function keepRect(name: string, kind: WidthClass, rect: WindowRect): void {
  write(keyOf(name, kind), rect);
}

/** The height kept for a window's sheet under its name, or null where none is kept. */
export function keptSheet(name: string): SheetHeight | null {
  const kept = read(keyOf(name, "narrow"));

  return kept === "short" || kept === "tall" ? kept : null;
}

export function keepSheet(name: string, height: SheetHeight): void {
  write(keyOf(name, "narrow"), height);
}

/** Where the folded pill stands on a narrow screen once it was dragged: a side, and its top in pixels. */
export interface PillSpot {
  side: DragSide;
  top: number;
}

/**
 * The edges a pill `size` big may reach on a narrow screen: a gutter in from every edge of what is
 * visible, inside the area the host names where it names one, and above the room the screen keeps
 * at its foot.
 */
export function pillBounds(frame: WindowFrame, area: WindowFrame | null, foot: number, size: { width: number; height: number }): DragBounds {
  const left = Math.max(frame.left, area?.left ?? frame.left);
  const right = Math.min(frame.left + frame.width, area === null ? Number.POSITIVE_INFINITY : area.left + area.width);
  const top = Math.max(frame.top, area?.top ?? frame.top);
  const bottom = Math.min(frame.top + frame.height - foot, area === null ? Number.POSITIVE_INFINITY : area.top + area.height);

  return {
    minLeft: left + WINDOW_GUTTER_PX,
    maxLeft: right - WINDOW_GUTTER_PX - size.width,
    minTop: top + WINDOW_GUTTER_PX,
    maxTop: bottom - WINDOW_GUTTER_PX - size.height
  };
}

function pillKey(name: string): string {
  return `bmo-ui:window:${name}:pill`;
}

/** The side and height a window's pill was left at on a narrow screen, or null where it was never dragged. */
export function keptPill(name: string): PillSpot | null {
  const kept = read(pillKey(name));

  if (typeof kept !== "object" || kept === null) return null;

  const { side, top } = kept as Record<string, unknown>;

  return (side === "left" || side === "right") && finite(top) ? { side, top } : null;
}

export function keepPill(name: string, spot: PillSpot): void {
  write(pillKey(name), spot);
}
