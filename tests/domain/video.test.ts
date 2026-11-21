import { describe, expect, test } from "bun:test";

import { firstFrameOf, hostControlFor, keyAction, nextCardLead, nextTurn, otherOrientation, skipTo, steppedVolume, stillBox, toggledTrack, turnedBox } from "~/domain/video";

// How the video player behaves apart from the element it drives: its keys, its skips, its volume steps, the
// subtitle the captions key turns to, how a picture is turned, and the box its still stands in.

describe("the keys", () => {
  test("space and k play and pause, the arrows nudge and move the volume, j and l skip, f, m and c do their own", () => {
    expect([" ", "k", "ArrowLeft", "ArrowRight", "j", "l", "ArrowUp", "ArrowDown", "f", "m", "c"].map(keyAction)).toEqual([
      "toggle",
      "toggle",
      "nudge-back",
      "nudge-forward",
      "back",
      "forward",
      "louder",
      "quieter",
      "fullscreen",
      "mute",
      "captions"
    ]);
  });

  test("r turns the picture", () => {
    expect(keyAction("r")).toBe("turn");
  });

  test("answer no other key", () => {
    expect(keyAction("Enter")).toBeNull();
    expect(keyAction("x")).toBeNull();
  });
});

describe("a host's control", () => {
  const wide = { id: "wide", label: "Wide view", icon: "i-wide", key: "t", onSelect: () => undefined };
  const bare = { id: "bare", label: "No key", icon: "i-bare", onSelect: () => undefined };

  test("answers its own key in either case", () => {
    expect([hostControlFor("t", [bare, wide]), hostControlFor("T", [bare, wide])]).toEqual([wide, wide]);
  });

  test("never answers a key the player keeps for itself, nor a key no control names", () => {
    expect([hostControlFor("f", [{ ...wide, key: "f" }]), hostControlFor("x", [bare, wide])]).toEqual([null, null]);
  });
});

describe("skips and volume", () => {
  test("a skip lands inside the video", () => {
    expect(skipTo(5, -10, 100)).toBe(0);
    expect(skipTo(95, 10, 100)).toBe(100);
    expect(skipTo(50, 10, null)).toBe(60);
  });

  test("a volume step stays between nought and one", () => {
    expect(steppedVolume(0.95, 0.1)).toBe(1);
    expect(steppedVolume(0.05, -0.1)).toBe(0);
    expect(steppedVolume(0.5, 0.1)).toBe(0.6);
  });
});

describe("the captions key", () => {
  const tracks = [{ id: 3 }, { id: 7 }];

  test("turns the shown one off, and back to the last one shown", () => {
    expect(toggledTrack(7, null, tracks)).toBeNull();
    expect(toggledTrack(null, 7, tracks)).toBe(7);
  });

  test("turns to the first where none was shown before or the last one is gone", () => {
    expect(toggledTrack(null, null, tracks)).toBe(3);
    expect(toggledTrack(null, 9, tracks)).toBe(3);
    expect(toggledTrack(null, null, [])).toBeNull();
  });
});

describe("turning the picture", () => {
  test("goes a quarter at a time and comes round", () => {
    expect([0, 90, 180, 270].map(nextTurn)).toEqual([90, 180, 270, 0]);
  });

  test("asks for the other orientation than the screen stands in", () => {
    expect(otherOrientation("portrait-primary")).toBe("landscape");
    expect(otherOrientation("landscape-primary")).toBe("portrait");
    expect(otherOrientation(undefined)).toBe("landscape");
  });

  test("fits a picture on its side to the player, with its width the player's height", () => {
    expect(turnedBox(0, 400, 800)).toEqual({});
    expect(turnedBox(90, 400, 800)).toMatchObject({ width: "800px", height: "400px", transform: "translate(-50%, -50%) rotate(90deg)" });
    expect(turnedBox(180, 400, 800)).toMatchObject({ width: "400px", height: "800px" });
  });
});

describe("the still", () => {
  test("stands at the video's ratio, as wide as twenty rem of height allows", () => {
    expect(stillBox({ width: 1280, height: 720 })).toEqual({ aspectRatio: "1280 / 720", width: "35.556rem" });
    expect(stillBox({ width: 720, height: 1280 })).toEqual({ aspectRatio: "720 / 1280", width: "11.250rem" });
  });

  test("leaves its box to the picture where the shape is not known", () => {
    expect(stillBox(null)).toBeNull();
    expect(stillBox({ width: 0, height: 720 })).toBeNull();
  });

  test("reads its first frame a moment past the start, unless the address names a moment", () => {
    expect(firstFrameOf("/media/1?item=2")).toBe("/media/1?item=2#t=0.1");
    expect(firstFrameOf("/media/1#t=4")).toBe("/media/1#t=4");
  });
});

describe("the next video's card", () => {
  test("stands thirty seconds before the end of a video of ten minutes, more for longer ones", () => {
    expect(nextCardLead(600)).toBe(30);
    expect(nextCardLead(39 * 60)).toBe(30);
    expect(nextCardLead(40 * 60)).toBe(35);
    expect(nextCardLead(50 * 60)).toBe(40);
  });

  test("stands for no video shorter than ten minutes nor one of a length not known", () => {
    expect(nextCardLead(599)).toBeNull();
    expect(nextCardLead(null)).toBeNull();
    expect(nextCardLead(Number.NaN)).toBeNull();
  });
});
