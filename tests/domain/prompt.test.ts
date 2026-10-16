import { describe, expect, test } from "bun:test";

import { enterKeys, TOUCH_QUERY } from "~/domain/prompt";

// What Enter does in a box whose text is sent. A screen keyboard has one key for a line break and
// it is Enter, so on a machine whose main pointer is a finger Enter breaks the line and only the
// button sends; everywhere else Enter sends. Which machine this is is read off the pointer and
// never off the width.

interface Pressed {
  event: KeyboardEvent;
  prevented: () => boolean;
  stopped: () => boolean;
}

interface Box {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  setRangeText: (text: string) => void;
  dispatchEvent: () => boolean;
}

function boxWith(value: string): Box {
  const box: Box = {
    value,
    selectionStart: value.length,
    selectionEnd: value.length,
    setRangeText: (text) => {
      box.value += text;
    },
    dispatchEvent: () => true
  };

  return box;
}

function press(
  box: Box,
  init: { key?: string; shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean; isComposing?: boolean; keyCode?: number } = {}
): Pressed {
  let prevented = false;
  let stopped = false;
  const event = {
    key: init.key ?? "Enter",
    shiftKey: init.shiftKey ?? false,
    altKey: init.altKey ?? false,
    ctrlKey: init.ctrlKey ?? false,
    metaKey: false,
    isComposing: init.isComposing ?? false,
    keyCode: init.keyCode ?? 13,
    target: box,
    preventDefault: () => {
      prevented = true;
    },
    stopImmediatePropagation: () => {
      stopped = true;
    }
  } as unknown as KeyboardEvent;

  return { event, prevented: () => prevented, stopped: () => stopped };
}

// A desk with its own clock and its own deferred work, so the order of events is the test's.
function desk(submits = true) {
  let now = 1000;
  const deferred: (() => void)[] = [];
  let sent = 0;
  const keys = enterKeys(
    () => {
      sent += 1;
    },
    () => submits,
    () => now,
    (run) => deferred.push(run)
  );

  return {
    keys,
    sent: () => sent,
    tick: (ms: number) => {
      now += ms;
    },
    flush: () => {
      for (const run of deferred.splice(0)) run();
    }
  };
}

describe("a plain Enter where Enter sends", () => {
  test("sends at once and keeps the line break out", () => {
    const at = desk();
    const pressed = press(boxWith("\uC548\uB155"));

    at.keys.keydown(pressed.event);
    expect(at.sent()).toBe(1);
    expect(pressed.prevented()).toBe(true);
    expect(pressed.stopped()).toBe(true);
  });

  test("sends nothing from an empty box", () => {
    const at = desk();

    at.keys.keydown(press(boxWith("  ")).event);
    expect(at.sent()).toBe(0);
  });
});

describe("the Enter that commits a Hangul syllable", () => {
  test("sends once the syllable is committed, with no line break left behind", () => {
    const at = desk();
    const box = boxWith("\uC548\uB140");
    const pressed = press(box, { isComposing: true, keyCode: 229 });

    at.keys.keydown(pressed.event);
    expect(pressed.prevented()).toBe(true);
    expect(at.sent()).toBe(0);

    at.keys.compositionend();
    box.value = "\uC548\uB155";
    at.flush();
    expect(at.sent()).toBe(1);
  });

  test("is recognised by the IME key code alone too", () => {
    const at = desk();

    at.keys.keydown(press(boxWith("\uAC00"), { keyCode: 229 }).event);
    at.keys.compositionend();
    at.flush();
    expect(at.sent()).toBe(1);
  });

  test("does not send twice when the browser repeats the Enter after the commit", () => {
    const at = desk();
    const box = boxWith("\uAC00");

    at.keys.keydown(press(box, { isComposing: true }).event);
    at.keys.compositionend();
    at.tick(10);
    const echo = press(box);

    at.keys.keydown(echo.event);
    expect(echo.prevented()).toBe(true);
    at.flush();
    expect(at.sent()).toBe(1);
  });

  test("a composition that ends long after the press sends nothing on its own", () => {
    const at = desk();

    at.keys.keydown(press(boxWith("\uAC00"), { isComposing: true }).event);
    at.tick(2000);
    at.keys.compositionend();
    at.flush();
    expect(at.sent()).toBe(0);
  });

  test("a composition ended by anything but Enter sends nothing", () => {
    const at = desk();

    at.keys.compositionend();
    at.flush();
    expect(at.sent()).toBe(0);
  });
});

describe("breaking the line where Enter sends", () => {
  test("Shift+Enter is left to the browser", () => {
    const at = desk();
    const pressed = press(boxWith("\uAC00"), { shiftKey: true, isComposing: true });

    at.keys.keydown(pressed.event);
    expect(pressed.prevented()).toBe(false);
    expect(at.sent()).toBe(0);
  });

  test("Alt+Enter puts a line break at the caret and sends nothing", () => {
    const at = desk();
    const box = boxWith("\uAC00");
    const pressed = press(box, { altKey: true });

    at.keys.keydown(pressed.event);
    expect(pressed.prevented()).toBe(true);
    expect(box.value).toBe("\uAC00\n");
    expect(at.sent()).toBe(0);
  });

  test("Ctrl+Enter is the prompt's own", () => {
    const at = desk();
    const pressed = press(boxWith("\uAC00"), { ctrlKey: true });

    at.keys.keydown(pressed.event);
    expect(pressed.prevented()).toBe(false);
  });
});

describe("where Enter breaks the line", () => {
  test("no key is touched, composing or not", () => {
    const at = desk(false);

    for (const init of [{}, { isComposing: true }, { altKey: true }]) {
      const pressed = press(boxWith("\uAC00"), init);

      at.keys.keydown(pressed.event);
      expect(pressed.prevented()).toBe(false);
    }

    at.keys.compositionend();
    at.flush();
    expect(at.sent()).toBe(0);
  });
});

const prompt = await Bun.file(new URL("../../app/domain/prompt.ts", import.meta.url)).text();

describe("which machine Enter breaks the line on", () => {
  test("is the one whose main pointer is coarse, and the width is not asked", () => {
    expect(TOUCH_QUERY).toBe("(pointer: coarse)");
    expect(prompt).not.toContain("NARROW_QUERY");
  });

  test("and Enter sends wherever the pointer is not coarse", () => {
    expect(prompt).toContain("const submitOnEnter = computed<boolean>(() => !touch.value)");
  });
});
