import { beforeEach, describe, expect, test } from "bun:test";

import { TRANSLATION_BATCH, Untranslated, hasTranslator, translated, translatorOf } from "../../app/domain/translation";

// The console's translator (`docs/console-bundles.md`, "Translation").

interface Ask {
  address: string;
  language: string;
  originals: string[];
}

let asks: Ask[] = [];
let refuse = false;

// A translator that reads every original into the language by marking it, and leaves an original holding
// "rough" not whole.
function hostNames(translator: { service: string; path: string } | undefined): void {
  Object.assign(globalThis, {
    useAppConfig: () => ({ bmoUi: { relayBase: "/relay" } }),
    useRuntimeConfig: () => ({ app: { baseURL: "/" }, public: { bmoUi: { translator } } }),
    $fetch: async (address: string, options: { body: { language: string; originals: string[] } }) => {
      asks.push({ address, ...options.body });

      if (refuse) throw new Error("403 Forbidden");

      return {
        readings: options.body.originals.map((text) => ({ text: `${options.body.language}:${text}`, whole: !text.includes("rough") }))
      };
    }
  });
}

let language = 0;

// Each test reads in a language of its own, so what an earlier test kept is not answered from the tab.
function fresh(): string {
  language += 1;

  return `x${language}`;
}

beforeEach(() => {
  asks = [];
  refuse = false;
  hostNames({ service: "words-out", path: "/console/translations" });
});

describe("the translator the host names", () => {
  test("is its service and path, and none where either stands empty", () => {
    expect(translatorOf()).toEqual({ service: "words-out", path: "/console/translations" });
    expect(hasTranslator()).toBe(true);

    hostNames({ service: "words-out", path: "" });
    expect(translatorOf()).toBeNull();

    hostNames(undefined);
    expect(hasTranslator()).toBe(false);
  });
});

describe("a translation", () => {
  test("answers one reading for each text in order, through the relay to the named route", async () => {
    const tag = fresh();
    const readings = await translated(["one", "two", "one"], tag);

    expect(readings.map((one) => one.text)).toEqual([`${tag}:one`, `${tag}:two`, `${tag}:one`]);
    expect(asks).toEqual([{ address: "/relay/words-out/console/translations", language: tag, originals: ["one", "two"] }]);
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

  test("asks in batches of the fixed size", async () => {
    const texts = Array.from({ length: TRANSLATION_BATCH * 2 + 1 }, (_, at) => `text ${at}`);
    const readings = await translated(texts, fresh());

    expect(readings).toHaveLength(texts.length);
    expect(asks.map((one) => one.originals.length).toSorted()).toEqual([1, TRANSLATION_BATCH, TRANSLATION_BATCH]);
  });

  test("fails where the translator refuses", async () => {
    refuse = true;

    await expect(translated(["one"], fresh())).rejects.toBeInstanceOf(Untranslated);
  });

  test("fails where the host names no translator, asking nothing", async () => {
    hostNames(undefined);

    await expect(translated(["one"], fresh())).rejects.toBeInstanceOf(Untranslated);
    expect(asks).toEqual([]);
  });
});
