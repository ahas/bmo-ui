// How a picture opened whole is zoomed and moved. The picture stands centred in its stage at the
// size that fits; a view is how much larger than that it is drawn and how far its centre is moved
// from the stage's. A point is given relative to the stage's centre, so the view does not depend
// on where the stage stands on the screen.

export interface ZoomView {
  scale: number;
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export const FIT: ZoomView = { scale: 1, x: 0, y: 0 };
export const MIN_SCALE = 1;
export const MAX_SCALE = 8;
// What a double press zooms a fitted picture to.
export const DOUBLE_SCALE = 2.5;
// How far one notch of a wheel zooms: the wheel's distance, turned into a factor.
const WHEEL_RATE = 0.002;

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

// The view kept inside the stage: a picture no larger than the stage along an axis stays centred
// on it, and a larger one is never moved so far that an edge comes away from the stage's edge.
export function bounded(view: ZoomView, fitted: Size, stage: Size): ZoomView {
  // Less than a hundredth of a pixel of slack is the arithmetic's, not the picture's.
  const limit = (drawn: number, room: number) => {
    const slack = (drawn - room) / 2;

    return slack < 0.01 ? 0 : slack;
  };
  const x = limit(fitted.width * view.scale, stage.width);
  const y = limit(fitted.height * view.scale, stage.height);

  return {
    scale: view.scale,
    x: Math.min(x, Math.max(-x, view.x)) || 0,
    y: Math.min(y, Math.max(-y, view.y)) || 0
  };
}

// The view zoomed to a scale with the point under `at` held where it is.
export function zoomedTo(view: ZoomView, scale: number, at: Point, fitted: Size, stage: Size): ZoomView {
  const next = clampScale(scale);
  const ratio = next / view.scale;

  return bounded(
    { scale: next, x: at.x - (at.x - view.x) * ratio, y: at.y - (at.y - view.y) * ratio },
    fitted,
    stage
  );
}

// A wheel turned over the picture: away zooms out, towards zooms in, around the pointer.
export function wheeled(view: ZoomView, deltaY: number, at: Point, fitted: Size, stage: Size): ZoomView {
  return zoomedTo(view, view.scale * Math.exp(-deltaY * WHEEL_RATE), at, fitted, stage);
}

export function moved(view: ZoomView, by: Point, fitted: Size, stage: Size): ZoomView {
  return bounded({ scale: view.scale, x: view.x + by.x, y: view.y + by.y }, fitted, stage);
}

// Two fingers moved: the picture follows their midpoint and scales by how far apart they went,
// around where they started.
export function pinched(
  view: ZoomView,
  from: readonly [Point, Point],
  to: readonly [Point, Point],
  fitted: Size,
  stage: Size
): ZoomView {
  const distance = ([a, b]: readonly [Point, Point]) => Math.hypot(a.x - b.x, a.y - b.y);
  const middle = ([a, b]: readonly [Point, Point]): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const start = distance(from);
  const scale = start === 0 ? view.scale : view.scale * (distance(to) / start);
  const zoomed = zoomedTo(view, scale, middle(from), fitted, stage);
  const was = middle(from);
  const now = middle(to);

  return moved(zoomed, { x: now.x - was.x, y: now.y - was.y }, fitted, stage);
}

// A double press: a fitted picture zooms in at the point, a zoomed one goes back to fitting.
export function toggled(view: ZoomView, at: Point, fitted: Size, stage: Size): ZoomView {
  return view.scale > MIN_SCALE ? FIT : zoomedTo(view, DOUBLE_SCALE, at, fitted, stage);
}

// The size a picture is drawn at to fit its stage whole, never larger than itself.
export function fittedSize(natural: Size, stage: Size): Size {
  if (natural.width <= 0 || natural.height <= 0) {
    return { width: 0, height: 0 };
  }

  const ratio = Math.min(1, stage.width / natural.width, stage.height / natural.height);

  const exact = (value: number) => Math.round(value * 1000) / 1000;

  return { width: exact(natural.width * ratio), height: exact(natural.height * ratio) };
}

// How far a finger must carry a fitted picture sideways — a share of the stage's width, and never
// less than a deliberate stroke — for the viewer to go on to the next picture or back to the one
// before rather than spring back.
const SWIPE_SHARE = 0.15;
const SWIPE_FLOOR_PX = 40;

// Where a sideways stroke on a fitted picture goes: to the picture after it (1), the one before it
// (-1), or nowhere (0). A stroke more upright than sideways goes nowhere.
export function swipeStep(travel: Point, stage: Size): -1 | 0 | 1 {
  const across = Math.abs(travel.x);

  if (across < Math.max(SWIPE_FLOOR_PX, stage.width * SWIPE_SHARE) || across <= Math.abs(travel.y)) {
    return 0;
  }

  return travel.x < 0 ? 1 : -1;
}
