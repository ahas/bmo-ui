import { describe, expect, test } from "bun:test";

import { pressTravelled, stillGliding } from "~/domain/longpress";

describe("a press that has to last half a second", () => {
  test("survives a fingertip's own slide, and is lost to a finger that moves past a phone's touch distance", () => {
    const landed = { x: 200, y: 400 };

    expect(pressTravelled(landed, { x: 200, y: 400 })).toBe(false);
    expect(pressTravelled(landed, { x: 206, y: 406 })).toBe(false);
    expect(pressTravelled(landed, { x: 200, y: 410 })).toBe(false);
    // A scroll setting off slowly, and a drag sideways.
    expect(pressTravelled(landed, { x: 200, y: 412 })).toBe(true);
    expect(pressTravelled(landed, { x: 220, y: 400 })).toBe(true);
  });
});

describe("a finger that lands on something still moving", () => {
  test("is stopping a glide while it moved a few frames before, and pressing what stands", () => {
    const landed = 10_000;

    // A glide reports its position every frame, and still within a few at its slowest.
    expect(stillGliding(landed - 16, landed)).toBe(true);
    expect(stillGliding(landed - 80, landed)).toBe(true);
    // A hand that lifted off its own scroll and came down again to hold.
    expect(stillGliding(landed - 200, landed)).toBe(false);
  });
});
