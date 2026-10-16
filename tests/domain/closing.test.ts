import { describe, expect, test } from "bun:test";
import { effectScope, ref } from "vue";

import { OVERLAY_CLOSE_MS, useHeldWhileClosing } from "~/domain/closing";

// That what a dialog was reading stays on it until the dialog itself is off the screen. The wait is
// real time, so the checks drive it with a wait of their own rather than with a clock nobody has.

const WAIT_MS = 20;

function later(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("what a floating element shows while it leaves", () => {
  test("stays until the element is gone, and then goes", async () => {
    const scope = effectScope();

    await scope.run(async () => {
      const open = ref<string | null>("First item");
      const shown = useHeldWhileClosing(() => open.value, WAIT_MS);

      expect(shown.value).toBe("First item");

      open.value = null;
      expect(shown.value).toBe("First item");

      await later(WAIT_MS * 3);
      expect(shown.value).toBe(null);
    });

    scope.stop();
  });

  test("is let go of at once when another opens in its place", async () => {
    const scope = effectScope();

    await scope.run(async () => {
      const open = ref<string | null>("First item");
      const shown = useHeldWhileClosing(() => open.value, WAIT_MS);

      open.value = null;
      open.value = "Next item";
      expect(shown.value).toBe("Next item");

      // The wait the first close started must not come back and empty what is open now.
      await later(WAIT_MS * 3);
      expect(shown.value).toBe("Next item");
    });

    scope.stop();
  });

  test("waits as long as the slowest thing the library animates away", () => {
    expect(OVERLAY_CLOSE_MS).toBe(500);
  });
});
