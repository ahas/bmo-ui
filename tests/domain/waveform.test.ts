import { afterEach, describe, expect, test } from "bun:test";

import { barCount, levelsOf, loudnessAt, WAVE_DETAIL, WAVE_FETCH_LIMIT, WAVE_FLOOR, waveBars, waveformOf } from "~/domain/waveform";

// How a sound's own waveform is read and stood as a player's bars (`docs/components.md`,
// "Skeletons and loading").

describe("reading a sound's waveform", () => {
  test("takes the root-mean-square loudness of each stretch, against the loudest", () => {
    const samples = Float32Array.from([0.5, -0.5, 0.25, -0.25, 0, 0, -0.125, 0.125]);

    expect(levelsOf([samples], 4)).toEqual([1, 0.5, 0, 0.25]);
  });

  test("reads a stretch by its loudness rather than its one loudest sample", () => {
    const click = Float32Array.from([1, 0, 0, 0, 0, 0, 0, 0]);
    const voice = Float32Array.from([0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, -0.5]);
    const [clicked, spoken] = levelsOf([Float32Array.from([...click, ...voice])], 2);

    expect(clicked).toBeCloseTo(Math.sqrt(1 / 8) / 0.5);
    expect(spoken).toBe(1);
  });

  test("reads every channel, so a sound loud on one side alone still shows", () => {
    const left = Float32Array.from([0.4, 0, 0, 0]);
    const right = Float32Array.from([0, 0, 0, 0.8]);

    expect(levelsOf([left, right], 2)).toEqual([0.5, 1]);
  });

  test("reads silence and an empty sound as nought throughout", () => {
    expect(levelsOf([new Float32Array(8)], 4)).toEqual([0, 0, 0, 0]);
    expect(levelsOf([], 3)).toEqual([0, 0, 0]);
  });

  test("gives every stretch a sample where the sound is shorter than the stretches asked for", () => {
    expect(levelsOf([Float32Array.from([0.5, 1])], 4)).toEqual([0.5, 0.5, 1, 1]);
  });
});

describe("standing the bars", () => {
  test("each bar is the mean of the stretches under it, raised to the floor", () => {
    const [loud, quiet] = waveBars([0, 1, 0, 0], 2);

    expect(loud).toBeCloseTo(1);
    expect(quiet).toBe(WAVE_FLOOR);
  });

  test("run from the sound's quiet end to its loudest, so an even voice still shows its words", () => {
    // A voice spoken at an even loudness, every stretch between three fifths and the whole of the
    // loudest: against the loudest alone each bar would stand above two thirds of the height.
    const levels = [0.6, 0.9, 1, 0.8, 0.75, 0.95, 0.7, 0.85, 0.65, 0.9];
    const bars = waveBars(levels, levels.length);

    expect(bars[0]).toBe(WAVE_FLOOR);
    expect(bars[2]).toBeCloseTo(1);
    expect(bars[8]).toBeCloseTo(WAVE_FLOOR + (1 - WAVE_FLOOR) / 8);
    expect(bars[3]).toBeLessThan(bars[1]!);
    expect(new Set(bars.map((bar) => bar.toFixed(3))).size).toBe(9);
  });

  test("a sound with pauses runs from silence, each spoken stretch at its own loudness", () => {
    expect(waveBars([0, 0, 1, 0.5], 4)).toEqual([WAVE_FLOOR, WAVE_FLOOR, 1, WAVE_FLOOR + (1 - WAVE_FLOOR) / 2]);
  });

  test("an even sound stands every bar full, and a silent one every bar at the floor", () => {
    expect(waveBars([0.5, 0.5, 0.5, 0.5], 2)).toEqual([1, 1]);
    expect(waveBars([0, 0, 0, 0], 2)).toEqual([WAVE_FLOOR, WAVE_FLOOR]);
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
    const levels = [0.2, 0.4, 0.6, 0.8];

    expect(loudnessAt(levels, 0)).toBe(0.2);
    expect(loudnessAt(levels, 0.6)).toBe(0.6);
    expect(loudnessAt(levels, 1)).toBe(0.8);
    expect(loudnessAt(levels, -1)).toBe(0.2);
    expect(loudnessAt([], 0.5)).toBe(0);
  });
});

// Reading a file at an address, with the browser's fetch and decoder stood in: the decoder hands back
// a buffer of the samples a test gives it, at whatever rate it was asked for, or refuses the rates a
// test names.
describe("reading the waveform of a file", () => {
  const realFetch = globalThis.fetch;
  const realContext = (globalThis as { OfflineAudioContext?: unknown }).OfflineAudioContext;
  let tried: number[] = [];

  function decoder(samples: Float32Array, refused: number[] = []): void {
    tried = [];

    class Context {
      constructor(
        _channels: number,
        _length: number,
        private readonly rate: number
      ) {}

      decodeAudioData(): Promise<unknown> {
        tried.push(this.rate);

        if (refused.includes(this.rate)) {
          return Promise.reject(new Error("refused"));
        }

        return Promise.resolve({
          numberOfChannels: 1,
          duration: samples.length / this.rate,
          getChannelData: () => samples
        });
      }
    }

    Object.assign(globalThis, { OfflineAudioContext: Context });
  }

  // A file sent in pieces, saying its length or not, as a server streaming it in chunks does.
  function served(pieces: number[], length: number | null): void {
    globalThis.fetch = (async () => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const size of pieces) {
            controller.enqueue(new Uint8Array(size));
          }

          controller.close();
        }
      });

      return new Response(body, { headers: length === null ? {} : { "content-length": String(length) } });
    }) as unknown as typeof fetch;
  }

  afterEach(() => {
    globalThis.fetch = realFetch;
    Object.assign(globalThis, { OfflineAudioContext: realContext });
  });

  test("reads the levels of the decoded sound, its length with them", async () => {
    const samples = Float32Array.from({ length: 8000 }, (_, at) => (at < 4000 ? 0.5 : 0.25) * (at % 2 === 0 ? 1 : -1));

    decoder(samples);
    served([1024, 1024], null);

    const read = await waveformOf("/sound/decoded.ogg");

    expect(read?.seconds).toBe(1);
    expect(read?.levels).toHaveLength(WAVE_DETAIL);
    expect(read?.levels[0]).toBe(1);
    expect(read?.levels[WAVE_DETAIL - 1]).toBe(0.5);
    expect(tried).toEqual([8000]);
  });

  test("decodes at an ordinary rate where the low one is refused", async () => {
    decoder(Float32Array.from([0.5, -0.5]), [8000]);
    served([16], 16);

    const read = await waveformOf("/sound/refused-low.ogg");

    expect(tried).toEqual([8000, 44100]);
    expect(read?.levels[0]).toBe(1);
  });

  test("stands with even bars where no rate decodes it", async () => {
    decoder(Float32Array.from([0.5]), [8000, 44100]);
    served([16], 16);

    expect(await waveformOf("/sound/undecodable.ogg")).toBeNull();
  });

  test("reads no further than the limit where the server does not say the length", async () => {
    decoder(Float32Array.from([0.5]));
    served([WAVE_FETCH_LIMIT, 1], null);

    expect(await waveformOf("/sound/unsaid-too-long.ogg")).toBeNull();
    expect(tried).toEqual([]);
  });

  test("reads nothing where the server says a length past the limit", async () => {
    decoder(Float32Array.from([0.5]));
    served([16], WAVE_FETCH_LIMIT + 1);

    expect(await waveformOf("/sound/said-too-long.ogg")).toBeNull();
    expect(tried).toEqual([]);
  });

  test("fetches and decodes an address once however often it is asked for", async () => {
    let fetches = 0;

    decoder(Float32Array.from([0.5]));
    served([16], null);

    const once = globalThis.fetch;

    globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
      fetches += 1;

      return once(...args);
    }) as typeof fetch;

    const [first, second] = await Promise.all([waveformOf("/sound/twice.ogg"), waveformOf("/sound/twice.ogg")]);

    expect(first).toBe(second);
    expect(fetches).toBe(1);
  });
});
