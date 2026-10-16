import { describe, expect, test } from "bun:test";

import { FIT, MAX_SCALE, bounded, fittedSize, moved, pinched, swipeStep, toggled, wheeled, zoomedTo } from "~/domain/zoom";

// A 1920×1080 screenshot in a 1000×800 stage fits at 1000×562.5.
const stage = { width: 1000, height: 800 };
const fitted = fittedSize({ width: 1920, height: 1080 }, stage);

describe("a picture opened whole", () => {
  test("fits its stage without growing past its own size", () => {
    expect(fitted).toEqual({ width: 1000, height: 562.5 });
    expect(fittedSize({ width: 200, height: 100 }, stage)).toEqual({ width: 200, height: 100 });
    expect(fittedSize({ width: 0, height: 100 }, stage)).toEqual({ width: 0, height: 0 });
  });

  test("zooms around the point under the pointer, which stays where it was", () => {
    const at = { x: 300, y: -100 };
    const view = zoomedTo(FIT, 2, at, fitted, stage);

    // The picture point under `at` was (at - 0) / 1 from the centre; drawn at 2 it stands at x + 2 * that.
    expect(view.scale).toBe(2);
    expect(view.x + 2 * at.x).toBeCloseTo(at.x);
    expect(view.y + 2 * at.y).toBeCloseTo(at.y);
  });

  test("the wheel zooms in towards the reader and out away, never past its bounds", () => {
    const zoomedIn = wheeled(FIT, -500, { x: 0, y: 0 }, fitted, stage);

    expect(zoomedIn.scale).toBeGreaterThan(1);
    expect(wheeled(zoomedIn, 500, { x: 0, y: 0 }, fitted, stage).scale).toBeCloseTo(1);
    expect(wheeled(FIT, 500, { x: 0, y: 0 }, fitted, stage)).toEqual(FIT);
    expect(wheeled(FIT, -100_000, { x: 0, y: 0 }, fitted, stage).scale).toBe(MAX_SCALE);
  });

  test("a fitted picture stays centred, and a zoomed one never leaves an edge inside the stage", () => {
    expect(moved(FIT, { x: 50, y: 50 }, fitted, stage)).toEqual(FIT);

    const view = zoomedTo(FIT, 2, { x: 0, y: 0 }, fitted, stage);

    // Drawn 2000×1125 in 1000×800: 500 of slack each way across, 162.5 down.
    expect(moved(view, { x: 900, y: -900 }, fitted, stage)).toEqual({ scale: 2, x: 500, y: -162.5 });
    expect(bounded({ scale: 1.2, x: 10, y: 10 }, fitted, stage)).toEqual({ scale: 1.2, x: 10, y: 0 });
  });

  test("two fingers spread zoom in around where they started and carry the picture with them", () => {
    const view = pinched(FIT, [{ x: -100, y: 0 }, { x: 100, y: 0 }], [{ x: -190, y: 10 }, { x: 210, y: 10 }], fitted, stage);

    expect(view.scale).toBeCloseTo(2);
    expect(view.x).toBeCloseTo(10);
    expect(view.y).toBeCloseTo(10);
  });

  test("a double press zooms a fitted picture in and a zoomed one back out", () => {
    const view = toggled(FIT, { x: 100, y: 50 }, fitted, stage);

    expect(view.scale).toBe(2.5);
    expect(toggled(view, { x: 0, y: 0 }, fitted, stage)).toEqual(FIT);
  });

  test("a sideways stroke past a share of the stage goes on or back, and a short or upright one goes nowhere", () => {
    expect(swipeStep({ x: -200, y: 20 }, stage)).toBe(1);
    expect(swipeStep({ x: 200, y: -20 }, stage)).toBe(-1);
    expect(swipeStep({ x: -100, y: 0 }, stage)).toBe(0);
    expect(swipeStep({ x: -200, y: 260 }, stage)).toBe(0);
    expect(swipeStep({ x: -45, y: 0 }, { width: 200, height: 400 })).toBe(1);
  });
});
