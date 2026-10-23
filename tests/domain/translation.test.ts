import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { TRANSLATION_ASKS_AT_ONCE, TRANSLATION_BATCH, Untranslated, hasTranslator, translated, translatorOf } from "../../app/domain/translation";

// The console's translator (`docs/console-bundles.md`, "Translation").

interface Ask {
  address: string;
  language: string;
  originals: string[];
}

let asks: Ask[] = [];
// The statuses the next asks are refused with, one for each ask, before the translator answers again.
let refusals: number[] = [];
// How many asks stood at the translator at once, at most.
let standing = 0;
let mostStanding = 0;

function refusedWith(status: number): Error {
  return Object.assign(new Error(`${status} refused`), { statusCode: status });
}

// A translator that reads every original into the language by marking it, and leaves an original holding
// "rough" not whole. Each ask stands a turn before it is answered, so asks made together overlap.
function hostNames(translator: Record<string, unknown> | undefined): void {
  Object.assign(globalThis, {
    useAppConfig: () => ({ bmoUi: { relayBase: "/relay" } }),
    useRuntimeConfig: () => ({ app: { baseURL: "/" }, public: { bmoUi: { translator } } }),
    $fetch: async (address: string, options: { body: { language: string; originals: string[] } }) => {
      asks.push({ address, ...options.body });
      standing += 1;
      mostStanding = Math.max(mostStanding, standing);

      try {
        await Promise.resolve();

        const refusal = refusals.shift();

        if (refusal !== undefined) throw refusedWith(refusal);

        return {
          readings: options.body.originals.map((text) => ({ text: `${options.body.language}:${text}`, whole: !text.includes("rough") }))
        };
      } finally {
        standing -= 1;
      }
    }
  });
}

let language = 0;

// Each test reads in a language of its own, so what an earlier test kept is not answered from the tab.
function fresh(): string {
  language += 1;

  return `x${language}`;
}

// The waits the module asks for, each passed at once.
let waits: number[] = [];
const realTimeout = globalThis.setTimeout;

beforeEach(() => {
  asks = [];
  refusals = [];
  standing = 0;
  mostStanding = 0;
  waits = [];
  hostNames({ service: "words-out", path: "/translations" });
  globalThis.setTimeout = ((done: () => void, ms: number) => {
    waits.push(ms);
    queueMicrotask(done);

    return 0;
  }) as unknown as typeof setTimeout;
});

afterEach(() => {
  globalThis.setTimeout = realTimeout;
});

describe("the translator the host names", () => {
  test("is its service and path with the default bounds, and none where either stands empty", () => {
    expect(translatorOf()).toEqual({ service: "words-out", path: "/translations", batch: TRANSLATION_BATCH, asksAtOnce: TRANSLATION_ASKS_AT_ONCE });
    expect([TRANSLATION_BATCH, TRANSLATION_ASKS_AT_ONCE]).toEqual([4, 1]);
    expect(hasTranslator()).toBe(true);

    hostNames({ service: "words-out", path: "" });
    expect(translatorOf()).toBeNull();

    hostNames(undefined);
    expect(hasTranslator()).toBe(false);
  });

  test("holds the bounds the host states, written as numbers or as the environment's text", () => {
    hostNames({ service: "words-out", path: "/translations", batch: 6, asksAtOnce: "2" });
    expect(translatorOf()).toMatchObject({ batch: 6, asksAtOnce: 2 });
  });

  test("reads a bound that is not a whole number of one or more as its default", () => {
    for (const stated of [0, -1, 2.5, "", "many", null]) {
      hostNames({ service: "words-out", path: "/translations", batch: stated, asksAtOnce: stated });
      expect(translatorOf()).toMatchObject({ batch: TRANSLATION_BATCH, asksAtOnce: TRANSLATION_ASKS_AT_ONCE });
    }
  });
});

describe("a translation", () => {
  test("answers one reading for each text in order, through the relay to the named route", async () => {
    const tag = fresh();
    const readings = await translated(["one", "two", "one"], tag);

    expect(readings.map((one) => one.text)).toEqual([`${tag}:one`, `${tag}:two`, `${tag}:one`]);
    expect(asks).toEqual([{ address: "/relay/words-out/translations", language: tag, originals: ["one", "two"] }]);
  });

  test("answers an empty text as itself without asking", async () => {
    const readings = await translated(["", "  "], fresh());

    expect(readings).toEqual([
      { text: "", whole: true },
      { text: "  ", whole: true }
    ]);
    expect(asks).toEqual([]);
  });

  test("keeps a whole reading and asks for it no more, and keeps no reading that is not whole", async () => {
    const tag = fresh();

    await translated(["kept", "rough part"], tag);
    asks = [];

    const again = await translated(["kept", "rough part"], tag);

    expect(again).toEqual([
      { text: `${tag}:kept`, whole: true },
      { text: `${tag}:rough part`, whole: false }
    ]);
    expect(asks.map((one) => one.originals)).toEqual([["rough part"]]);
  });

  test("asks in batches of the host's size, one ask out at a time by default", async () => {
    const texts = Array.from({ length: TRANSLATION_BATCH * 2 + 1 }, (_, at) => `text ${at}`);
    const readings = await translated(texts, fresh());

    expect(readings.map((one) => one.text.split(":")[1])).toEqual(texts);
    expect(asks.map((one) => one.originals.length)).toEqual([TRANSLATION_BATCH, TRANSLATION_BATCH, 1]);
    expect(mostStanding).toBe(1);
  });

  test("holds the tab's bound across translations asked together", async () => {
    hostNames({ service: "words-out", path: "/translations", batch: 2, asksAtOnce: 2 });

    const tag = fresh();
    const [first, second] = await Promise.all([
      translated(["a", "b", "c", "d", "e"], tag),
      translated(["f", "g", "h"], tag)
    ]);

    expect(first.map((one) => one.text)).toEqual(["a", "b", "c", "d", "e"].map((text) => `${tag}:${text}`));
    expect(second.map((one) => one.text)).toEqual(["f", "g", "h"].map((text) => `${tag}:${text}`));
    expect(mostStanding).toBe(2);
    expect(asks.every((one) => one.originals.length <= 2)).toBe(true);
  });

  test("never asks again for a text another translation kept while it waited", async () => {
    const tag = fresh();

    await Promise.all([translated(["shared", "own"], tag), translated(["shared"], tag)]);

    expect(asks.flatMap((one) => one.originals).filter((text) => text === "shared")).toEqual(["shared"]);
  });

  test("asks a busy batch again after 2, 4 and 8 seconds and answers it once the translator does", async () => {
    refusals = [503, 504, 503];

    const tag = fresh();
    const readings = await translated(["one"], tag);

    expect(readings).toEqual([{ text: `${tag}:one`, whole: true }]);
    expect(waits).toEqual([2_000, 4_000, 8_000]);
    expect(asks).toHaveLength(4);
  });

  test("answers only a batch still busy after the last wait untranslated, and keeps none of it", async () => {
    hostNames({ service: "words-out", path: "/translations", batch: 1 });
    refusals = [503, 503, 503, 503];

    const tag = fresh();
    const readings = await translated(["first", "second"], tag);

    expect(readings).toEqual([
      { text: "first", whole: false, untranslated: true },
      { text: `${tag}:second`, whole: true }
    ]);

    asks = [];
    await translated(["first", "second"], tag);
    expect(asks.map((one) => one.originals)).toEqual([["first"]]);
  });

  test("fails where the translator refuses other than busy, asking nothing again", async () => {
    refusals = [403];

    await expect(translated(["one"], fresh())).rejects.toBeInstanceOf(Untranslated);
    expect(asks).toHaveLength(1);
    expect(waits).toEqual([]);
  });

  test("fails where the host names no translator, asking nothing", async () => {
    hostNames(undefined);

    await expect(translated(["one"], fresh())).rejects.toBeInstanceOf(Untranslated);
    expect(asks).toEqual([]);
  });
});
