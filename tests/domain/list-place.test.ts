import { describe, expect, test } from "bun:test";

import { reached, scrollable } from "~/domain/list-place";

// Where a list goes back to, worked out from what it can actually scroll. The waiting itself is
// frames of a browser; these are the two answers it asks for on each of them.

describe("going back to where a list stood", () => {
  test("stands at the offset the list can hold, and never past its end", () => {
    expect(scrollable(400, 2_000, 600)).toBe(400);
    expect(scrollable(400, 800, 600)).toBe(200);
    expect(scrollable(400, 600, 600)).toBe(0);
  });

  test("never reads an offset of its own as a negative one", () => {
    expect(scrollable(0, 200, 600)).toBe(0);
  });

  test("waits while the rows are still arriving and stops once they can hold the offset", () => {
    expect(reached(400, 600, 600)).toBe(false);
    expect(reached(400, 900, 600)).toBe(false);
    expect(reached(400, 1_000, 600)).toBe(true);
    expect(reached(400, 2_000, 600)).toBe(true);
  });

  test("takes a rounding of a pixel for the offset itself", () => {
    expect(reached(400, 999.5, 600)).toBe(true);
  });
});
