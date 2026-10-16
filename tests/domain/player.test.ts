import { describe, expect, test } from "bun:test";

import { auraOf, AURA_STILL, buttonAfter, easedLoudness, knownLength, loudnessOf, playAlone, playClock } from "~/domain/player";

import type { PlayerButton, PlayerSignal } from "~/domain/player";

// How the players on a screen share the sound, and how a player reads its clock, its aura and its
// button.

describe("one thing playing at a time", () => {
  function player(paused: boolean) {
    const one = {
      paused,
      pauses: 0,
      pause: () => {
        one.paused = true;
        one.pauses += 1;
      }
    };

    return one;
  }

  test("the one that started takes the sound from every other one playing", () => {
    const [started, sound, video] = [player(false), player(false), player(false)];

    playAlone(started, [sound, started, video]);

    expect([started.paused, sound.paused, video.paused]).toEqual([false, true, true]);
  });

  test("one already stopped is left as it stands", () => {
    const [started, stopped] = [player(false), player(true)];

    playAlone(started, [started, stopped]);

    expect(stopped.pauses).toBe(0);
  });
});

describe("a player's clock", () => {
  test("reads minutes and seconds in two places each, dropping what is under a second", () => {
    expect(playClock(0)).toBe("00:00");
    expect(playClock(12.9)).toBe("00:12");
    expect(playClock(85)).toBe("01:25");
    expect(playClock(-3)).toBe("00:00");
  });

  test("puts hours in front once it runs past one", () => {
    expect(playClock(3599)).toBe("59:59");
    expect(playClock(3600 + 65)).toBe("1:01:05");
  });

  test("knows a length only where the file said a bounded one", () => {
    expect(knownLength(85.3)).toBe(85.3);
    expect(knownLength(Number.NaN)).toBeNull();
    expect(knownLength(Number.POSITIVE_INFINITY)).toBeNull();
    expect(knownLength(0)).toBeNull();
  });
});

describe("the aura round a playing sound", () => {
  // A stretch of samples swinging evenly either side of the byte's middle by a given amount.
  function swing(amount: number): Uint8Array {
    return Uint8Array.from({ length: 256 }, (_, sample) => 128 + (sample % 2 === 0 ? amount : -amount));
  }

  test("reads silence as nought, a voice at its loudest as one, and a quiet syllable in between", () => {
    expect(loudnessOf(swing(0))).toBe(0);
    expect(loudnessOf(new Uint8Array())).toBe(0);
    expect(loudnessOf(swing(40))).toBe(1);
    expect(loudnessOf(swing(6))).toBeGreaterThan(0.1);
    expect(loudnessOf(swing(6))).toBeLessThan(loudnessOf(swing(12)));
  });

  test("rises toward a louder sound faster than it falls back from it", () => {
    const rise = easedLoudness(0, 1);
    const fall = 1 - easedLoudness(1, 0);

    expect(rise).toBeGreaterThan(fall);
    expect(easedLoudness(0.5, 0.5)).toBe(0.5);
    expect(easedLoudness(0, 2)).toBe(rise);
  });

  test("shows a thin ring at silence and reaches furthest and brightest at its loudest", () => {
    const quiet = auraOf(0);
    const loud = auraOf(1);

    expect(quiet.scale).toBeGreaterThan(1);
    expect(loud.scale).toBeGreaterThan(quiet.scale);
    expect(loud.glow).toBe(1);
    expect(auraOf(AURA_STILL).scale).toBeLessThan(loud.scale);
    expect(auraOf(5)).toEqual(loud);
  });
});

// The button through the events a browser gives. Each run below is what Chromium fired for a sound
// served slower than it plays: pressed with its bytes not yet there, starved again partway, and
// sought into a stretch not yet fetched.
describe("the play button through a sound's events", () => {
  function through(signals: PlayerSignal[]): PlayerButton[] {
    const shown: PlayerButton[] = [];
    let now: PlayerButton = "play";

    for (const signal of signals) {
      now = buttonAfter(now, signal);
      shown.push(now);
    }

    return shown;
  }

  test("spins from the press until the sound is heard", () => {
    expect(through(["pressed", "play", "waiting", "playing"])).toEqual(["starting", "starting", "starting", "pause"]);
  });

  test("stays the pause button while it waits for bytes partway or after a seek, and a press there stops it", () => {
    expect(through(["pressed", "play", "playing", "waiting", "moved", "playing", "waiting", "pause"])).toEqual([
      "starting",
      "starting",
      "pause",
      "pause",
      "pause",
      "pause",
      "pause",
      "play"
    ]);
  });

  test("takes the clock running on as the sound heard where no playing comes", () => {
    expect(through(["pressed", "play", "waiting", "moved", "waiting"])).toEqual([
      "starting",
      "starting",
      "starting",
      "pause",
      "pause"
    ]);
  });

  test("takes no clock moved while it rests for a sound playing", () => {
    expect(buttonAfter("play", "moved")).toBe("play");
  });

  test("stands at play again once refused, ended, broken or stopped from elsewhere", () => {
    for (const signal of ["refused", "ended", "error", "pause"] as const) {
      expect(buttonAfter("starting", signal)).toBe("play");
      expect(buttonAfter("pause", signal)).toBe("play");
    }
  });
});
