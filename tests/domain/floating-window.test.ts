import { afterEach, describe, expect, test } from "bun:test";

import {
  WINDOW_GUTTER_PX,
  WINDOW_LEAP_PX,
  WINDOW_MIN,
  WINDOW_STEP_PX,
  clampRect,
  firstRect,
  keepPill,
  keepRect,
  keepSheet,
  keptPill,
  keptRect,
  keptSheet,
  pillBounds,
  stepOf,
  widthClass
} from "~/domain/floating-window";

// Where a window beside the page stands (`docs/components.md`, "A window beside the page"): inside what is visible,
// at its first place where nothing is kept, and kept per browser by its name and its width class.

const FRAME = { left: 0, top: 0, width: 1280, height: 800 };

afterEach(() => {
  window.localStorage.clear();
});

describe("a window's width class", () => {
  test("is the narrow sheet up to the narrow query's width and three widths of window past it", () => {
    expect(widthClass(360)).toBe("narrow");
    expect(widthClass(639)).toBe("narrow");
    expect(widthClass(640)).toBe("medium");
    expect(widthClass(1023)).toBe("medium");
    expect(widthClass(1024)).toBe("wide");
    expect(widthClass(1535)).toBe("wide");
    expect(widthClass(1536)).toBe("widest");
  });
});

describe("a window kept inside what is visible", () => {
  test("stands as it is where it already fits", () => {
    const rect = { x: 100, y: 100, width: 400, height: 300 };

    expect(clampRect(rect, FRAME)).toEqual(rect);
  });

  test("stops a gutter in from every edge", () => {
    expect(clampRect({ x: -500, y: -500, width: 400, height: 300 }, FRAME)).toEqual({ x: WINDOW_GUTTER_PX, y: WINDOW_GUTTER_PX, width: 400, height: 300 });
    expect(clampRect({ x: 5000, y: 5000, width: 400, height: 300 }, FRAME)).toEqual({
      x: FRAME.width - WINDOW_GUTTER_PX - 400,
      y: FRAME.height - WINDOW_GUTTER_PX - 300,
      width: 400,
      height: 300
    });
  });

  test("shrinks where moving is not enough, and is never sized under its floor while there is room for it", () => {
    expect(clampRect({ x: 0, y: 0, width: 2000, height: 2000 }, FRAME)).toEqual({ x: 16, y: 16, width: 1248, height: 768 });
    expect(clampRect({ x: 0, y: 0, width: 10, height: 10 }, FRAME)).toEqual({ x: 16, y: 16, width: WINDOW_MIN.width, height: WINDOW_MIN.height });
  });

  test("counts only the visible part, a keyboard laid over the page's foot included", () => {
    const raised = { left: 0, top: 0, width: 1280, height: 300 };

    expect(clampRect({ x: 100, y: 400, width: 400, height: 300 }, raised)).toEqual({ x: 100, y: 16, width: 400, height: 268 });
  });
});

describe("a window's first place", () => {
  test("is the area's top trailing corner a gutter in, never taller than three fifths of the area", () => {
    const area = { left: 300, top: 60, width: 700, height: 600 };

    expect(firstRect(area, FRAME)).toEqual({ x: 300 + 700 - 16 - 400, y: 76, width: 400, height: 360 });
  });

  test("is the leading corner of the area in a page written right to left", () => {
    const area = { left: 300, top: 60, width: 700, height: 600 };

    expect(firstRect(area, FRAME, undefined, undefined, true).x).toBe(316);
  });
});

describe("a window moved by the arrow keys", () => {
  test("takes a step, or a leap with Shift, and no other key moves it", () => {
    expect(stepOf("ArrowLeft", false)).toEqual({ dx: -WINDOW_STEP_PX, dy: 0 });
    expect(stepOf("ArrowDown", true)).toEqual({ dx: 0, dy: WINDOW_LEAP_PX });
    expect(stepOf("Enter", false)).toBeNull();
  });
});

describe("a window's place kept in the browser", () => {
  test("is read back under its name and class alone", () => {
    keepRect("panel", "wide", { x: 10, y: 20, width: 400, height: 300 });

    expect(keptRect("panel", "wide")).toEqual({ x: 10, y: 20, width: 400, height: 300 });
    expect(keptRect("panel", "medium")).toBeNull();
    expect(keptRect("other", "wide")).toBeNull();
  });

  test("reads anything not of a place's shape as nothing kept", () => {
    window.localStorage.setItem("bmo-ui:window:panel:wide", "not json");
    expect(keptRect("panel", "wide")).toBeNull();

    window.localStorage.setItem("bmo-ui:window:panel:wide", JSON.stringify({ x: "1" }));
    expect(keptRect("panel", "wide")).toBeNull();
  });

  test("keeps a sheet's height under the narrow class", () => {
    expect(keptSheet("panel")).toBeNull();

    keepSheet("panel", "tall");

    expect(keptSheet("panel")).toBe("tall");
  });
});

describe("a folded window's pill on a narrow screen", () => {
  const PHONE = { left: 0, top: 0, width: 360, height: 780 };
  const PILL = { width: 64, height: 36 };

  test("stays a gutter in from what is visible and above the room kept at the foot", () => {
    expect(pillBounds(PHONE, null, 100, PILL)).toEqual({ minLeft: 16, maxLeft: 360 - 16 - 64, minTop: 16, maxTop: 780 - 100 - 16 - 36 });
  });

  test("stays inside the area its host names, and inside what is visible where the area runs past it", () => {
    const area = { left: 0, top: 56, width: 360, height: 900 };

    expect(pillBounds(PHONE, area, 100, PILL)).toEqual({ minLeft: 16, maxLeft: 280, minTop: 72, maxTop: 628 });
  });

  test("keeps where it was left under the window's name, apart from the sheet's height", () => {
    keepSheet("notes", "tall");
    keepPill("notes", { side: "right", top: 300 });

    expect(keptPill("notes")).toEqual({ side: "right", top: 300 });
    expect(keptSheet("notes")).toBe("tall");
    expect(keptPill("other")).toBeNull();
  });

  test("reads nothing kept from a value it did not write", () => {
    window.localStorage.setItem("bmo-ui:window:notes:pill", JSON.stringify({ side: "middle", top: 3 }));

    expect(keptPill("notes")).toBeNull();
  });
});
