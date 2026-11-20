import { afterEach, describe, expect, test } from "bun:test";
import { effectScope, nextTick } from "vue";

import { clampTo, dragSlop, isDrag, settledSide, useFloatingDrag } from "~/domain/floating-drag";
import { HOLD_SLOP_PX } from "~/domain/longpress";

import type { DragBounds, DragPoint, FloatingDragHandle } from "~/domain/floating-drag";
import type { EffectScope } from "vue";

// A small thing dragged like a picture-in-picture window (`docs/components.md`, "Dragged like a
// picture-in-picture window"): a press until it travels, a drag after, its click swallowed, and let go
// it is handed to its host with where it was let go and how fast it was thrown.

const BOUNDS: DragBounds = { minLeft: 16, maxLeft: 900, minTop: 16, maxTop: 600 };

describe("a press becoming a drag", () => {
  test("travels further for a finger than for a pen, and for a pen than for a mouse", () => {
    expect(dragSlop("touch")).toBe(HOLD_SLOP_PX);
    expect(dragSlop("pen")).toBeLessThan(dragSlop("touch"));
    expect(dragSlop("mouse")).toBeLessThan(dragSlop("pen"));
    expect(isDrag(3, 3, "mouse")).toBe(true);
    expect(isDrag(3, 3, "touch")).toBe(false);
    expect(isDrag(HOLD_SLOP_PX + 1, 0, "touch")).toBe(true);
  });
});

describe("where a thing let go settles", () => {
  test("is the side its centre is nearer to", () => {
    expect(settledSide(100, 100, BOUNDS, 0)).toBe("left");
    expect(settledSide(700, 100, BOUNDS, 0)).toBe("right");
  });

  test("is the side a quick throw goes toward", () => {
    expect(settledSide(400, 100, BOUNDS, 2000)).toBe("right");
    expect(settledSide(500, 100, BOUNDS, -2000)).toBe("left");
  });

  test("keeps a value between edges that cross on the lower one", () => {
    expect(clampTo(5, 10, 20)).toBe(10);
    expect(clampTo(25, 10, 20)).toBe(20);
    expect(clampTo(25, 10, 0)).toBe(10);
  });
});

interface Run {
  drag: FloatingDragHandle;
  moved: DragPoint[];
  settled: { at: DragPoint; speed: number }[];
  scope: EffectScope;
}

let running: Run | null = null;

afterEach(() => {
  running?.scope.stop();
  running = null;
});

function start(from: DragPoint = { left: 100, top: 100 }): Run {
  const scope = effectScope();
  const moved: DragPoint[] = [];
  const settled: { at: DragPoint; speed: number }[] = [];
  const drag = scope.run(() =>
    useFloatingDrag({
      element: () => null,
      begin: () => ({ from, bounds: BOUNDS }),
      move: (at) => moved.push(at),
      settle: (at, _bounds, speed) => settled.push({ at, speed })
    })
  )!;

  running = { drag, moved, settled, scope };

  return running;
}

function pointer(type: string, x: number, y: number, init: PointerEventInit = {}): PointerEvent {
  return new PointerEvent(type, { pointerId: 1, pointerType: "touch", isPrimary: true, button: 0, clientX: x, clientY: y, ...init });
}

function click(detail = 1): MouseEvent {
  return new MouseEvent("click", { detail, cancelable: true, bubbles: true });
}

describe("a press on the thing", () => {
  test("that stays inside the slop moves nothing and lets its click through", () => {
    const run = start();

    run.drag.grab(pointer("pointerdown", 50, 50));
    window.dispatchEvent(pointer("pointermove", 55, 55));
    window.dispatchEvent(pointer("pointerup", 55, 55));

    const event = click();

    run.drag.swallow(event);

    expect(run.moved).toEqual([]);
    expect(run.settled).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
  });

  test("that travels follows the pointer inside the bounds and is handed to the host where it was let go", async () => {
    const run = start();

    run.drag.grab(pointer("pointerdown", 50, 50));
    window.dispatchEvent(pointer("pointermove", 80, 60));

    expect(run.drag.dragging.value).toBe(true);

    window.dispatchEvent(pointer("pointermove", -2000, 5000));
    window.dispatchEvent(pointer("pointerup", -2000, 5000));
    await nextTick();

    expect(run.moved).toEqual([
      { left: 130, top: 110 },
      { left: BOUNDS.minLeft, top: BOUNDS.maxTop }
    ]);
    expect(run.settled.map((one) => one.at)).toEqual([{ left: BOUNDS.minLeft, top: BOUNDS.maxTop }]);
    expect(run.drag.dragging.value).toBe(false);
  });

  test("that was a drag swallows the click it ends in, and the next press's click goes through", () => {
    const run = start();

    run.drag.grab(pointer("pointerdown", 50, 50));
    window.dispatchEvent(pointer("pointermove", 90, 50));
    window.dispatchEvent(pointer("pointerup", 90, 50));

    const ending = click();

    run.drag.swallow(ending);
    expect(ending.defaultPrevented).toBe(true);

    run.drag.grab(pointer("pointerdown", 50, 50));
    window.dispatchEvent(pointer("pointerup", 50, 50));

    const tap = click();

    run.drag.swallow(tap);
    expect(tap.defaultPrevented).toBe(false);
  });

  test("never swallows a click the keyboard made", () => {
    const run = start();

    run.drag.grab(pointer("pointerdown", 50, 50, { pointerType: "mouse" }));
    window.dispatchEvent(pointer("pointermove", 90, 50, { pointerType: "mouse" }));
    window.dispatchEvent(pointer("pointerup", 90, 50, { pointerType: "mouse" }));

    const key = click(0);

    run.drag.swallow(key);
    expect(key.defaultPrevented).toBe(false);
  });

  test("by another button or another finger moves nothing", () => {
    const run = start();

    run.drag.grab(pointer("pointerdown", 50, 50, { button: 2 }));
    window.dispatchEvent(pointer("pointermove", 150, 50));
    run.drag.grab(pointer("pointerdown", 50, 50, { isPrimary: false }));
    window.dispatchEvent(pointer("pointermove", 150, 50));

    expect(run.moved).toEqual([]);
  });

  test("holds off the browser's own drag while it is pressed, and only then", () => {
    const run = start();
    const native = () => new Event("dragstart", { cancelable: true, bubbles: true });

    run.drag.grab(pointer("pointerdown", 50, 50, { pointerType: "mouse" }));

    const held = native();

    window.dispatchEvent(held);
    window.dispatchEvent(pointer("pointerup", 50, 50, { pointerType: "mouse" }));

    const after = native();

    window.dispatchEvent(after);
    expect(held.defaultPrevented).toBe(true);
    expect(after.defaultPrevented).toBe(false);
  });

  test("ended by the browser settles as a letting go does", async () => {
    const run = start();

    run.drag.grab(pointer("pointerdown", 50, 50));
    window.dispatchEvent(pointer("pointermove", 90, 50));
    window.dispatchEvent(pointer("pointercancel", 90, 50));
    await nextTick();

    expect(run.settled).toHaveLength(1);
  });
});
