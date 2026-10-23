import { relayCall } from "./relay";

// The console's translator (`docs/console-bundles.md`, "Translation"): a service the host names in its runtime
// configuration, whose route takes texts and a language and answers their readings. The layer states the
// route's shape and asks it through the relay's call; which service translates, at which path, how many texts
// one ask carries and how many asks stand at once, is the host's to say. A screen hands texts and a language and
// takes one reading for each, in order.

/**
 * One original's reading: the text in the language, and whether every part of it was rendered. An untranslated
 * reading is the original itself, which the translator stayed too busy to read.
 */
export interface Reading {
  text: string;
  whole: boolean;
  untranslated?: boolean;
}

/** The translator the host names: the service it is relayed under, its translating route, and its bounds. */
export interface Translator {
  service: string;
  path: string;
  // The most originals one ask carries.
  batch: number;
  // How many asks the tab holds out at once.
  asksAtOnce: number;
}

/** A translation that did not come: the host names no translator, or the translator refused or failed. */
export class Untranslated extends Error {}

/** How many originals one ask carries where the host names no bound. */
export const TRANSLATION_BATCH = 4;

/** How many asks the tab holds out at once where the host names no bound. */
export const TRANSLATION_ASKS_AT_ONCE = 1;

// The waits before an ask answered busy is made again, one for each ask again.
const BUSY_WAITS_MS = [2_000, 4_000, 8_000];

// The answers that say the translator is busy rather than refusing: a service taking no more asks for now, and a
// console that waited past its bound for the answer to begin.
const BUSY = new Set([503, 504]);

// Each whole reading answered, by language and then by original, for the life of the tab.
const kept = new Map<string, Map<string, string>>();

// The asks out now across the tab, and the asks waiting for one of them to come back, first come first served.
let out = 0;
const queued: (() => void)[] = [];

// A bound the host states, or the default where it states none or one that is not a whole number of one or more.
function bound(stated: unknown, fallback: number): number {
  const read = typeof stated === "string" && stated.trim() !== "" ? Number(stated) : stated;

  return typeof read === "number" && Number.isInteger(read) && read >= 1 ? read : fallback;
}

/** The translator the host's runtime configuration names, or null where it names none. */
export function translatorOf(): Translator | null {
  const named = (useRuntimeConfig().public as { bmoUi?: { translator?: Record<string, unknown> } }).bmoUi?.translator;
  const service = typeof named?.service === "string" ? named.service.trim() : "";
  const path = typeof named?.path === "string" ? named.path.trim() : "";

  if (service === "" || path === "") return null;

  return { service, path, batch: bound(named?.batch, TRANSLATION_BATCH), asksAtOnce: bound(named?.asksAtOnce, TRANSLATION_ASKS_AT_ONCE) };
}

/** Whether the host names a translator, so a screen may offer a translation at all. */
export function hasTranslator(): boolean {
  return translatorOf() !== null;
}

// A place among the asks out, waited for behind every ask that came before, and handed on when let go of.
async function place(asksAtOnce: number): Promise<() => void> {
  if (out >= asksAtOnce) await new Promise<void>((taken) => queued.push(taken));
  else out += 1;

  return () => {
    const next = queued.shift();

    if (next === undefined) out -= 1;
    else next();
  };
}

function pause(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}

// The status a failed call was answered with, where the fetcher read one.
function statusOf(error: unknown): number | undefined {
  const status = (error as { statusCode?: unknown; status?: unknown } | null)?.statusCode ?? (error as { status?: unknown } | null)?.status;

  return typeof status === "number" ? status : undefined;
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

  return readings.map((one) => ({ text: one.text!, whole: one.whole! }));
}

// One ask, its originals picked once its place among the asks out is taken, so none another translation kept
// meanwhile is asked; made again after each wait while the translator answers busy, holding its place the whole
// while; still busy after the last wait, every original is answered untranslated.
async function askedPatiently(translator: Translator, language: string, pick: () => string[]): Promise<{ originals: string[]; readings: Reading[] }> {
  const release = await place(translator.asksAtOnce);

  try {
    const originals = pick();

    return { originals, readings: originals.length === 0 ? [] : await answeredPatiently(translator, language, originals) };
  } finally {
    release();
  }
}

async function answeredPatiently(translator: Translator, language: string, originals: string[]): Promise<Reading[]> {
  for (let tried = 0; ; tried += 1) {
    try {
      return await asked(translator, language, originals);
    } catch (error) {
      const busy = BUSY.has(statusOf((error as Error).cause) ?? 0);

      if (!busy) throw error;
      if (tried === BUSY_WAITS_MS.length) return originals.map((text) => ({ text, whole: false, untranslated: true }));

      await pause(BUSY_WAITS_MS[tried]!);
    }
  }
}

/**
 * The readings of texts in a language, one for each text in the order given, through the translator the host
 * names. An empty text is its own reading; a text asked before in the language and read whole is answered from
 * what the tab keeps. A batch the translator stays busy for answers its texts untranslated. Fails with
 * `Untranslated` where the host names no translator or the translator refuses or fails; the batches answered
 * before the failure stay kept.
 */
export async function translated(texts: readonly string[], language: string): Promise<Reading[]> {
  const translator = translatorOf();

  if (translator === null) throw new Untranslated("the console names no translator");

  const shelf = kept.get(language) ?? new Map<string, string>();
  const answered = new Map<string, Reading>();

  kept.set(language, shelf);

  const wanted = [...new Set(texts)].filter((text) => text.trim() !== "" && !shelf.has(text));
  const batches: string[][] = [];

  for (let at = 0; at < wanted.length; at += translator.batch) batches.push(wanted.slice(at, at + translator.batch));

  // Every batch is handed on at once and waits for its place among the tab's asks there, so the bound holds across
  // every translation in the tab. A failure leaves the batches not yet asked unasked.
  let failed = false;

  await Promise.all(
    batches.map(async (batch) => {
      try {
        const { originals, readings } = await askedPatiently(translator, language, () => (failed ? [] : batch.filter((text) => !shelf.has(text))));

        originals.forEach((original, at) => {
          const reading = readings[at]!;

          if (reading.whole) shelf.set(original, reading.text);
          else answered.set(original, reading);
        });
      } catch (error) {
        failed = true;
        throw error;
      }
    })
  );

  return texts.map((text) => {
    const read = shelf.get(text);

    if (read !== undefined) return { text: read, whole: true };

    return answered.get(text) ?? { text, whole: true };
  });
}
