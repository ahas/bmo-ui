// What the one select a value is chosen in searches, and when (`docs/components.md`, "Choosing a
// value"). A list searches once it holds more than seven choices, counted from what it is handed, so
// a list read from data takes its search as it grows; a list found on the server or taking free entry
// searches always. What a choice shows is what is matched, by the search module every list search
// goes through, and words typed that no choice shows are what free entry offers as a new value.

import { matchFields } from "../../shared/search";

import type { SelectMenuItem } from "@nuxt/ui";
import type { SearchField } from "../../shared/search";

// The choices a select is handed, as the component library's select menu takes them: one list, or
// groups of lists drawn apart.
export type ChoiceItems = SelectMenuItem[] | SelectMenuItem[][];

// The fields of a choice that hold the words it shows, its label and the line under it, and the one
// holding its value where it is not the choice itself.
export interface ChoiceKeys {
  label: string;
  description: string;
  value?: string;
}

// The road a list found on the server is searched over: the choices for the words typed.
export type ChoiceFind = (words: string) => Promise<SelectMenuItem[]>;

// A list holding more choices than this searches.
export const SEARCH_ABOVE = 7;

// How long typing stands still before a road is asked for the words typed.
export const CHOICE_FIND_PAUSE_MS = 300;

const LABEL_KEYS: ChoiceKeys = { label: "label", description: "description" };

type Group = readonly SelectMenuItem[];

// A heading or a separator of a list, which stands among the choices and is none of them.
function structural(item: SelectMenuItem): boolean {
  return typeof item === "object" && item !== null && (item.type === "label" || item.type === "separator");
}

function isSeparator(item: SelectMenuItem): boolean {
  return typeof item === "object" && item !== null && item.type === "separator";
}

function nested(items: ChoiceItems): items is SelectMenuItem[][] {
  return items.length > 0 && items.every((item) => Array.isArray(item));
}

function groupsOf(items: ChoiceItems): readonly Group[] {
  return nested(items) ? items : [items as Group];
}

// How many choices a list holds: its headings and separators are none.
export function choiceCount(items: ChoiceItems): number {
  return groupsOf(items).reduce((sum, group) => sum + group.filter((item) => !structural(item)).length, 0);
}

// Whether a list searches: always where a road finds its choices or it takes free entry, since the
// words of a new value are typed into its search, and otherwise once it holds more choices than
// `SEARCH_ABOVE`.
export function searchesChoices(items: ChoiceItems, finds: boolean, takesFree = false): boolean {
  return finds || takesFree || choiceCount(items) > SEARCH_ABOVE;
}

// The words a choice shows, each a field the search matches: a plain value is its own label.
export function choiceFields(item: SelectMenuItem, keys: ChoiceKeys = LABEL_KEYS): SearchField[] {
  if (typeof item !== "object" || item === null) {
    return [{ label: keys.label, text: item === null || item === undefined ? "" : String(item), shown: true }];
  }

  const record = item as Record<string, unknown>;

  return [keys.label, keys.description].map((key) => ({ label: key, text: typeof record[key] === "string" ? record[key] : "", shown: true }));
}

// One group narrowed to the choices that match: a heading stands while any choice under it does, and
// a separator only between two parts that both stand.
function narrowGroup(group: Group, words: string, keys: ChoiceKeys, locale: string | undefined): SelectMenuItem[] {
  const kept: SelectMenuItem[] = [];
  let heading: SelectMenuItem | null = null;
  let separator: SelectMenuItem | null = null;

  for (const item of group) {
    if (isSeparator(item)) {
      separator = kept.length > 0 ? item : null;
      heading = null;
    } else if (structural(item)) {
      heading = item;
    } else if (matchFields(choiceFields(item, keys), words, locale) !== null) {
      if (separator !== null) kept.push(separator);
      if (heading !== null) kept.push(heading);
      kept.push(item);
      separator = null;
      heading = null;
    }
  }

  return kept;
}

// The choices that match the words typed, in the shape they were handed: every choice for no words,
// and a group left with no choice dropped.
export function narrowChoices(items: ChoiceItems, words: string, keys: ChoiceKeys = LABEL_KEYS, locale?: string): ChoiceItems {
  const narrowed = narrowChoicesInPlace(items, words, keys, locale);

  return narrowed !== items && nested(narrowed) ? narrowed.filter((group) => group.length > 0) : narrowed;
}

// The choices that match the words typed, each group kept in its place however few it keeps, so a
// list that knows its groups by their place still knows each one: every choice for no words.
export function narrowChoicesInPlace(items: ChoiceItems, words: string, keys: ChoiceKeys = LABEL_KEYS, locale?: string): ChoiceItems {
  if (words.trim() === "") {
    return items;
  }

  if (nested(items)) {
    return items.map((group) => narrowGroup(group, words, keys, locale));
  }

  return narrowGroup(items as SelectMenuItem[], words, keys, locale);
}

// Whether a choice already is the value typed: its label shows the words, letter case folded in the
// locale handed over, or its value is the words themselves.
function holds(item: SelectMenuItem, value: string, keys: ChoiceKeys, locale: string | undefined): boolean {
  if (structural(item)) {
    return false;
  }

  if (keys.value !== undefined && typeof item === "object" && item !== null && (item as Record<string, unknown>)[keys.value] === value) {
    return true;
  }

  return choiceFields(item, keys)[0]!.text?.localeCompare(value, locale, { sensitivity: "accent" }) === 0;
}

// The choice the words typed, their ends trimmed, already are: the first whose label shows them,
// letter case folded, or whose value they are.
export function namedChoice(items: ChoiceItems, words: string, keys: ChoiceKeys = LABEL_KEYS, locale?: string): SelectMenuItem | undefined {
  const value = words.trim();

  if (value === "") {
    return undefined;
  }

  return groupsOf(items)
    .flat()
    .find((item) => holds(item, value, keys, locale));
}

// The words typed, their ends trimmed, as the new value free entry offers: none where nothing is
// typed or a choice already is that value.
export function typedValue(items: ChoiceItems, words: string, keys: ChoiceKeys = LABEL_KEYS, locale?: string): string | null {
  const value = words.trim();

  if (value === "" || namedChoice(items, value, keys, locale) !== undefined) {
    return null;
  }

  return value;
}

// The values words hold where a screen ends a value at its separators: the words cut at each
// separator and each line break, every piece's ends trimmed, the empty pieces left out.
export function cutValues(words: string, separators: readonly string[]): string[] {
  const lines = words.split(/\r\n|\r|\n/);
  const pieces = separators.reduce((parts, separator) => (separator === "" ? parts : parts.flatMap((part) => part.split(separator))), lines);

  return pieces.map((piece) => piece.trim()).filter((piece) => piece !== "");
}

// The words typed where a screen ends a value at its separators, cut at the last separator they
// hold: the values ended before it, and the words still being typed after it. Words that hold none
// end nothing and are left whole.
export function cutTyped(words: string, separators: readonly string[]): { taken: string[]; left: string } {
  const ends = separators.flatMap((separator) => {
    const at = separator === "" ? -1 : words.lastIndexOf(separator);

    return at < 0 ? [] : [at + separator.length];
  });

  if (ends.length === 0) {
    return { taken: [], left: words };
  }

  const end = Math.max(...ends);

  return { taken: cutValues(words.slice(0, end), separators), left: words.slice(end) };
}

// Whether words hold a separator or a line break, and so end at least one value.
export function endsValue(words: string, separators: readonly string[]): boolean {
  return /[\r\n]/.test(words) || separators.some((separator) => separator !== "" && words.includes(separator));
}
