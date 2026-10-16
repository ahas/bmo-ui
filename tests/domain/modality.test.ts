import { describe, expect, test } from "bun:test";

import { modalityOfKey } from "~/domain/modality";

// Which hand moved the focus, read off a key: only a key that moves the focus is the keyboard's.
describe("the hand that moved the focus", () => {
  test("is the keyboard's for the keys that move it, and unchanged by a key typed into a box", () => {
    expect(modalityOfKey("Tab")).toBe("key");
    expect(modalityOfKey("ArrowDown")).toBe("key");
    expect(modalityOfKey("a")).toBeNull();
    expect(modalityOfKey("Enter")).toBeNull();
  });
});
