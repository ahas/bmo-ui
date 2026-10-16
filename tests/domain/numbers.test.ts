import { beforeEach, describe, expect, test } from "bun:test";

import { countLocale, countText, figurePlaces, progressText, turnOf } from "~/domain/numbers";

// Which numbers carry the thousands mark. A number saying how many or how much is read at a glance
// once it is grouped — 116002 has to be walked with a finger to learn whether it is a hundred
// thousand or a million. The mark is written in the locale the host states, read through its app
// configuration, which stands in here.

function hostSays(locale?: string): void {
  Object.assign(globalThis, { useAppConfig: () => ({ bmoUi: { locale } }) });
}

beforeEach(() => hostSays("en-US"));

describe("a number that says how many", () => {
  test("carries the thousands mark", () => {
    expect(countText(116002)).toBe("116,002");
    expect(countText(1472)).toBe("1,472");
    expect(countText(1000)).toBe("1,000");
  });

  test("and below a thousand it is the plain number, so nothing is decorated that need not be", () => {
    expect(countText(0)).toBe("0");
    expect(countText(999)).toBe("999");
  });

  test("is written in the locale the host states", () => {
    hostSays("de-DE");

    expect(countLocale()).toBe("de-DE");
    expect(countText(1234)).toBe((1234).toLocaleString("de-DE"));
  });

  test("and in the runtime's own where the host states none", () => {
    hostSays(undefined);

    expect(countLocale()).toBeUndefined();
    expect(countText(1234)).toBe((1234).toLocaleString());
  });
});

describe("progress toward a known end", () => {
  test("reads as done over total and the share, with no words", () => {
    expect(progressText(3, 10)).toBe("3/10 30%");
    expect(progressText(1200, 4800)).toBe("1,200/4,800 25%");
  });

  test("never says done before it is", () => {
    expect(progressText(999, 1000)).toBe("999/1,000 99%");
    expect(progressText(1000, 1000)).toBe("1,000/1,000 100%");
    expect(progressText(0, 0)).toBe("0/0 0%");
  });
});

describe("a number that turns as it changes", () => {
  // Two figures' places side by side, the way a change from one to the other is drawn: a place
  // present in both keeps its key, and its character turns only where the two differ.
  function changed(before: string, after: string): number[] {
    const was = new Map(figurePlaces(before).map((place) => [place.at, place.mark]));

    return figurePlaces(after).filter((place) => was.get(place.at) !== place.mark).map((place) => place.at);
  }

  test("turns only the places whose character changed, counted from the right", () => {
    expect(changed("1,299", "1,300")).toEqual([2, 1, 0]);
    expect(changed("41", "42")).toEqual([0]);
    // A digit the figure grows comes in as a place of its own; the rest keep their keys.
    expect(changed("9", "10")).toEqual([1, 0]);
    expect(changed("999", "1,000")).toEqual([4, 3, 2, 1, 0]);
  });

  test("turns up where it grew and down where it shrank", () => {
    expect(turnOf(3, 2)).toBe("up");
    expect(turnOf(2, 3)).toBe("down");
  });
});
