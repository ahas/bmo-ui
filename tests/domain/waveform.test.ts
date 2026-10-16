import { describe, expect, test } from "bun:test";

import { barCount, loudnessAt, peaksOf, WAVE_FLOOR, waveBars } from "~/domain/waveform";

// How a sound's own waveform is read and stood as a player's bars (`docs/components.md`,
// "Skeletons and loading").

describe("reading a sound's waveform", () => {
  test("takes the loudest sample of each stretch, against the loudest of all", () => {
    const samples = Float32Array.from([0.125, -0.5, 0.25, 0.125, 0, 0, -0.0625, 0.0625]);

    expect(peaksOf([samples], 4)).toEqual([1, 0.5, 0, 0.125]);
  });

  test("reads every channel, so a sound loud on one side alone still shows", () => {
    const left = Float32Array.from([0.4, 0, 0, 0]);
    const right = Float32Array.from([0, 0, 0, 0.8]);

    expect(peaksOf([left, right], 2)).toEqual([0.5, 1]);
  });

  test("reads silence and an empty sound as nought throughout", () => {
    expect(peaksOf([new Float32Array(8)], 4)).toEqual([0, 0, 0, 0]);
    expect(peaksOf([], 3)).toEqual([0, 0, 0]);
  });

  test("gives every stretch a sample where the sound is shorter than the stretches asked for", () => {
    expect(peaksOf([Float32Array.from([0.5, 1])], 4)).toEqual([0.5, 0.5, 1, 1]);
  });
});

describe("standing the bars", () => {
  test("each bar is the loudest stretch under it, raised to the floor", () => {
    const [loud, quiet] = waveBars([0, 1, 0, 0], 2);

    expect(loud).toBeCloseTo(1);
    expect(quiet).toBe(WAVE_FLOOR);
  });

  test("a sound not yet read stands every bar at the floor", () => {
    expect(waveBars(null, 3)).toEqual([WAVE_FLOOR, WAVE_FLOOR, WAVE_FLOOR]);
    expect(waveBars([], 2)).toEqual([WAVE_FLOOR, WAVE_FLOOR]);
    expect(waveBars([1], 0)).toEqual([]);
  });

  test("as many as fit the width, the last bar with no gap after it", () => {
    expect(barCount(11, 2, 1)).toBe(4);
    expect(barCount(10, 2, 1)).toBe(3);
    expect(barCount(0, 2, 1)).toBe(0);
  });
});

describe("the loudness at a place", () => {
  test("is the stretch the place falls in, held inside the sound", () => {
    const peaks = [0.2, 0.4, 0.6, 0.8];

    expect(loudnessAt(peaks, 0)).toBe(0.2);
    expect(loudnessAt(peaks, 0.6)).toBe(0.6);
    expect(loudnessAt(peaks, 1)).toBe(0.8);
    expect(loudnessAt(peaks, -1)).toBe(0.2);
    expect(loudnessAt([], 0.5)).toBe(0);
  });
});
