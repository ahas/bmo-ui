import { describe, expect, test } from "bun:test";

import { LANDSCAPE, PORTRAIT, SQUARE, fillsShape, rowShape, shapeOf } from "~/domain/artwork";

// The shapes a card's picture stands at: the shape a picture of a size takes, the one a row of them takes, and
// whether a picture fills its frame edge to edge.

describe("a picture's shape", () => {
  test("is landscape from four by three, square from just over four by five, portrait under that", () => {
    expect(shapeOf({ width: 1920, height: 1080 })).toBe(LANDSCAPE);
    expect(shapeOf({ width: 640, height: 480 })).toBe(LANDSCAPE);
    expect(shapeOf({ width: 500, height: 500 })).toBe(SQUARE);
    expect(shapeOf({ width: 820, height: 1000 })).toBe(SQUARE);
    expect(shapeOf({ width: 800, height: 1000 })).toBe(PORTRAIT);
    expect(shapeOf({ width: 400, height: 600 })).toBe(PORTRAIT);
  });

  test("is none where its size is not known", () => {
    expect(shapeOf(null)).toBeNull();
    expect(shapeOf({ width: 0, height: 360 })).toBeNull();
  });
});

describe("a row's shape", () => {
  test("is the one most of its pictures have", () => {
    expect(rowShape([{ width: 400, height: 600 }, { width: 400, height: 600 }, { width: 640, height: 360 }], LANDSCAPE)).toBe(PORTRAIT);
  });

  test("breaks a tie landscape first, then portrait", () => {
    expect(rowShape([{ width: 400, height: 600 }, { width: 640, height: 360 }], SQUARE)).toBe(LANDSCAPE);
    expect(rowShape([{ width: 400, height: 600 }, { width: 500, height: 500 }], LANDSCAPE)).toBe(PORTRAIT);
  });

  test("is the host's where no picture's size is known", () => {
    expect(rowShape([null, undefined], PORTRAIT)).toBe(PORTRAIT);
    expect(rowShape([], SQUARE)).toBe(SQUARE);
  });
});

describe("a picture filling its frame", () => {
  test("fills it where its shape is the frame's, and leaves a ground round it otherwise", () => {
    expect(fillsShape({ width: 640, height: 360 }, LANDSCAPE)).toBe(true);
    expect(fillsShape({ width: 1280, height: 718 }, LANDSCAPE)).toBe(true);
    expect(fillsShape({ width: 640, height: 480 }, LANDSCAPE)).toBe(false);
    expect(fillsShape(null, LANDSCAPE)).toBe(false);
  });
});
