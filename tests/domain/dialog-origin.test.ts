import { describe, expect, test } from "bun:test";

import { originOf } from "~/domain/dialog-origin";

// A dialog 600 by 400 standing in the middle of a 1280 by 800 window: its box at rest runs from
// 340 to 940 across and from 200 to 600 down.
const SIZE = { width: 600, height: 400 };
const AT_REST = { left: 340, top: 200, width: 600, height: 400 };

describe("where a dialog grows out of", () => {
  test("the press that opened it, as a point inside the dialog's own box", () => {
    expect(originOf({ x: 1200, y: 40, at: 1_000 }, 1_050, AT_REST, SIZE)).toBe("860px -160px");
  });

  // The box is read on the dialog's first frame, while it is still drawn small around its own
  // middle; the place it is handed is the same as if it had been read at its full size.
  test("read the same off a box still drawn small around its middle", () => {
    const small = { left: 640 - 150, top: 400 - 100, width: 300, height: 200 };

    expect(originOf({ x: 1200, y: 40, at: 1_000 }, 1_050, small, SIZE)).toBe("860px -160px");
  });

  test("nowhere, where nothing was pressed: it only fades", () => {
    expect(originOf(null, 1_050, AT_REST, SIZE)).toBeNull();
  });

  test("nowhere, where the last press is long past: it opened of its own accord", () => {
    expect(originOf({ x: 1200, y: 40, at: 1_000 }, 2_500, AT_REST, SIZE)).toBeNull();
  });
});
