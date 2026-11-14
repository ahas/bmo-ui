import { describe, expect, test } from "bun:test";

import { BRIGHTNESS_MAX, BRIGHTNESS_MIN, brightnessFrom, dragAxis, DOUBLE_TAP_MS, heldSpeed, levelFrom, overlayOpen, seekFrom, sideOf, tapMatches } from "~/domain/video-gestures";

// How a finger on the video player's picture is read, apart from the element it drives: which half it landed on, what a travel
// makes of it, where a drag lands, and how fast a held finger plays.

describe("the half a finger lands on", () => {
  test("is the left before the middle and the right from it", () => {
    expect(sideOf(10, 0, 200)).toBe("left");
    expect(sideOf(99, 0, 200)).toBe("left");
    expect(sideOf(100, 0, 200)).toBe("right");
    expect(sideOf(199, 0, 200)).toBe("right");
  });
});

describe("what a travel makes of a press", () => {
  test("nothing while it is within a hold's reach", () => {
    expect(dragAxis(0, 0)).toBeNull();
    expect(dragAxis(6, 6)).toBeNull();
  });

  test("a seek across the picture and a vertical drag down it", () => {
    expect(dragAxis(40, 10)).toBe("seek");
    expect(dragAxis(-40, 10)).toBe("seek");
    expect(dragAxis(10, 40)).toBe("vertical");
    expect(dragAxis(10, -40)).toBe("vertical");
  });

  test("a seek where the two ways are equal, so a diagonal keeps the position", () => {
    expect(dragAxis(30, 30)).toBe("seek");
  });
});

describe("two taps", () => {
  test("make a double tap within the wait and the reach", () => {
    const first = { at: 1_000, x: 50, y: 50 };

    expect(tapMatches(first, { at: 1_000 + DOUBLE_TAP_MS, x: 50, y: 50 })).toBe(true);
    expect(tapMatches(first, { at: 1_050, x: 70, y: 50 })).toBe(true);
  });

  test("are two taps where the second is late or lands elsewhere", () => {
    const first = { at: 1_000, x: 50, y: 50 };

    expect(tapMatches(first, { at: 1_000 + DOUBLE_TAP_MS + 1, x: 50, y: 50 })).toBe(false);
    expect(tapMatches(first, { at: 1_050, x: 81, y: 50 })).toBe(false);
    expect(tapMatches(first, { at: 999, x: 50, y: 50 })).toBe(false);
  });
});

describe("where a horizontal drag lands", () => {
  test("moves the whole length across the whole width, held inside the video", () => {
    expect(seekFrom(30, 0, 400, 100)).toBe(30);
    expect(seekFrom(30, 200, 400, 100)).toBe(80);
    expect(seekFrom(30, -200, 400, 100)).toBe(0);
    expect(seekFrom(30, 400, 400, 100)).toBe(100);
  });

  test("stands still where the length is unknown or the picture has no width", () => {
    expect(seekFrom(30, 200, 400, null)).toBeNull();
    expect(seekFrom(30, 200, 0, 100)).toBeNull();
  });
});

describe("where a vertical drag lands", () => {
  test("a volume rises upward and falls downward, held between nought and one", () => {
    expect(levelFrom(0.5, 0, 200)).toBe(0.5);
    expect(levelFrom(0.5, -100, 200)).toBe(1);
    expect(levelFrom(0.5, 100, 200)).toBe(0);
    expect(levelFrom(0.9, -20, 200)).toBe(1);
  });

  test("a brightness rises upward across its own dimmest and brightest", () => {
    expect(brightnessFrom(1, 0, 200)).toBe(1);
    expect(brightnessFrom(1, -200, 200)).toBe(BRIGHTNESS_MAX);
    expect(brightnessFrom(1, 200, 200)).toBe(BRIGHTNESS_MIN);
    expect(brightnessFrom(1, -20, 200)).toBeCloseTo(1.18);
  });
});

describe("a held finger", () => {
  test("plays at twice the chosen speed, never under the fast one nor over the fastest", () => {
    expect(heldSpeed(0.5)).toBe(2);
    expect(heldSpeed(1)).toBe(2);
    expect(heldSpeed(1.5)).toBe(3);
    expect(heldSpeed(2)).toBe(4);
  });
});

describe("what stands over the picture", () => {
  function layer(state: string, role = "dialog"): HTMLElement {
    const one = document.createElement("div");

    one.setAttribute("role", role);
    one.setAttribute("data-state", state);
    document.body.append(one);

    return one;
  }

  test("reads a dialog, a drawer or a menu the library marks as open", () => {
    const shut = layer("closed");

    expect(overlayOpen(document)).toBe(false);

    const open = layer("open", "menu");

    expect(overlayOpen(document)).toBe(true);
    shut.remove();
    open.remove();
  });

  test("leaves out the layer the player itself stands in, and no other", () => {
    const holding = layer("open");
    const player = document.createElement("div");

    holding.append(player);

    expect(overlayOpen(document, player)).toBe(false);

    const over = layer("open", "menu");

    expect(overlayOpen(document, player)).toBe(true);
    holding.remove();
    over.remove();
  });
});
