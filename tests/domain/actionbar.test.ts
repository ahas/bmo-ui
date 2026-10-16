import { describe, expect, test } from "bun:test";

import { actionsOutside, BAR_GATHERS_UNDER_PX, barGathers, GATHERED_ACTIONS, STANDING_ACTIONS } from "~/domain/actionbar";

describe("whether a bar gathers its actions", () => {
  test("is read off the room the bar has", () => {
    expect(barGathers(BAR_GATHERS_UNDER_PX - 1)).toBe(true);
    expect(barGathers(BAR_GATHERS_UNDER_PX)).toBe(false);
    expect(barGathers(BAR_GATHERS_UNDER_PX + 1)).toBe(false);
  });

  // A bar in a side panel or in one half of a splitter is as narrow as that part however wide the
  // window around it is, which is the whole reason the room is asked of the bar and not of the
  // screen. A bar of a phone's width standing on a desktop gathers exactly as a phone's does.
  test("does not turn on how wide the window is", () => {
    expect(barGathers(320)).toBe(barGathers(320));
    expect(barGathers(360)).toBe(true);
  });

  // Until it has been measured a bar stands its actions, so a bar drawn by the server and a bar on
  // its first frame do not flash gathered and open again a moment later.
  test("stands its actions while the room is still unknown", () => {
    expect(barGathers(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("how many actions stand outside the menu", () => {
  test("is what a hand reaches for first on a gathered bar", () => {
    expect(actionsOutside(360)).toBe(GATHERED_ACTIONS);
  });

  test("is what a group may hold before it folds whole where there is room", () => {
    expect(actionsOutside(1024)).toBe(STANDING_ACTIONS);
  });

  test("never grows as the bar narrows", () => {
    const widths = [200, 400, 560, 720, 1024, 1920];

    for (const [at, width] of widths.entries()) {
      if (at === 0) continue;

      expect(actionsOutside(width)).toBeGreaterThanOrEqual(actionsOutside(widths[at - 1]!));
    }
  });
});
