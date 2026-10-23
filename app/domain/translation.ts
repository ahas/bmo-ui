import { relayCall } from "./relay";

// The console's translator (`docs/console-bundles.md`, "Translation"): a service the host names in its runtime
// configuration, whose route takes texts and a language and answers their readings. The layer states the
// route's shape and asks it through the relay's call; which service translates, and at which path, is the
// host's to say. A screen hands texts and a language and takes one reading for each, in order.

/** One original's reading: the text in the language, and whether every part of it was rendered. */
export interface Reading {
  text: string;
  whole: boolean;
}

/** The translator the host names: the service it is relayed under and its translating route. */
export interface Translator {
  service: string;
  path: string;
}

/** A translation that did not come: the host names no translator, or the translator refused or failed. */
export class Untranslated extends Error {}

/** How many originals one ask carries. */
export const TRANSLATION_BATCH = 8;

// How many asks stand at once.
const ASKS_AT_ONCE = 2;

// Each whole reading answered, by language and then by original, for the life of the tab.
const kept = new Map<string, Map<string, string>>();

/** The translator the host's runtime configuration names, or null where it names none. */
export function translatorOf(): Translator | null {
  const named = (useRuntimeConfig().public as { bmoUi?: { translator?: Partial<Translator> } }).bmoUi?.translator;
  const service = named?.service?.trim() ?? "";
  const path = named?.path?.trim() ?? "";

  return service === "" || path === "" ? null : { service, path };
}

/** Whether the host names a translator, so a screen may offer a translation at all. */
export function hasTranslator(): boolean {
  return translatorOf() !== null;
}

async function asked(translator: Translator, language: string, originals: string[]): Promise<Reading[]> {
  let answer: { readings?: unknown };

  try {
    answer = await relayCall<{ readings?: unknown }>(translator.service, translator.path, { method: "POST", body: { language, originals } });
  } catch (error) {
    throw new Untranslated(`the translator did not answer: ${(error as Error).message}`, { cause: error });
  }

  const readings = Array.isArray(answer?.readings) ? (answer.readings as Partial<Reading>[]) : [];
  const whole = readings.length === originals.length && readings.every((one) => typeof one?.text === "string" && typeof one.whole === "boolean");

  if (!whole) throw new Untranslated("the translator's answer does not hold one reading for each original");

  return readings as Reading[];
}

/**
 * The readings of texts in a language, one for each text in the order given, through the translator the host
 * names. An empty text is its own reading; a text asked before in the language and read whole is answered from
 * what the tab keeps. Fails with `Untranslated` where the host names no translator or the translator refuses or
 * fails; the batches answered before the failure stay kept.
 */
export async function translated(texts: readonly string[], language: string): Promise<Reading[]> {
  const translator = translatorOf();

  if (translator === null) throw new Untranslated("the console names no translator");

  const shelf = kept.get(language) ?? new Map<string, string>();
  const answered = new Map<string, Reading>();

  kept.set(language, shelf);

  const wanted = [...new Set(texts)].filter((text) => text.trim() !== "" && !shelf.has(text));
  const batches: string[][] = [];

  for (let at = 0; at < wanted.length; at += TRANSLATION_BATCH) batches.push(wanted.slice(at, at + TRANSLATION_BATCH));

  const lanes = Array.from({ length: Math.min(ASKS_AT_ONCE, batches.length) }, async () => {
    for (let batch = batches.shift(); batch !== undefined; batch = batches.shift()) {
      const readings = await asked(translator, language, batch);

      batch.forEach((original, at) => {
        const reading = readings[at]!;

        if (reading.whole) shelf.set(original, reading.text);
        else answered.set(original, reading);
      });
    }
  });

  await Promise.all(lanes);

  return texts.map((text) => {
    const read = shelf.get(text);

    if (read !== undefined) return { text: read, whole: true };

    return answered.get(text) ?? { text, whole: true };
  });
}
