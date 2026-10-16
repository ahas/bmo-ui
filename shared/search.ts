// One search for every list (`docs/components.md`, "List search"). A list hands it, for each
// record, every text the record carries: what its row shows, and what it holds that the row does
// not. The search matches all of them the same way, so a word read on the screen — a number, a
// status, a badge — finds its row as surely as a word inside the stored data does, and it says
// which of the two it matched in: a hit on the row is marked where it stands, and a hit only in
// hidden data is shown as one line under the row.

// One text a record carries. `shown` says whether the row puts it on the screen; `label` names a
// hidden one in the line that shows where it matched.
export interface SearchField {
  label: string;
  text: string | null | undefined;
  shown: boolean;
}

// Where a record matched. `hidden` is set only when nothing on the row matched, since a hit the
// reader can already see needs no second line.
export interface SearchMatch {
  shown: boolean;
  hidden: { label: string; snippet: string } | null;
}

export interface SearchPart {
  text: string;
  hit: boolean;
}

// How much of the hidden text stands on either side of the hit in its one line.
const SNIPPET_RADIUS = 36;

// What the search looks for: the typed phrase, whitespace at its ends dropped. The phrase is
// matched whole, so "stage 7/9" finds the rows that say exactly that.
export function searchPhrase(query: string | null | undefined): string {
  return (query ?? "").trim();
}

// Letter case is folded in the locale the caller hands over, the runtime's own where none is. The
// module is shared and runs on a server as well, so it reads no app configuration of its own.
function folded(text: string, locale: string | undefined): string {
  return text.toLocaleLowerCase(locale);
}

// Every place the phrase stands in the text, ignoring case, as [start, end) pairs in order.
export function searchHits(text: string, query: string | null | undefined, locale?: string): [number, number][] {
  const phrase = folded(searchPhrase(query), locale);

  if (phrase === "" || text === "") {
    return [];
  }

  const haystack = folded(text, locale);
  const hits: [number, number][] = [];
  let from = haystack.indexOf(phrase);

  while (from !== -1) {
    hits.push([from, from + phrase.length]);
    from = haystack.indexOf(phrase, from + phrase.length);
  }

  return hits;
}

// The text cut into the pieces a screen draws, each saying whether it is a hit.
export function highlightParts(text: string, query: string | null | undefined, locale?: string): SearchPart[] {
  const hits = searchHits(text, query, locale);

  if (hits.length === 0) {
    return text === "" ? [] : [{ text, hit: false }];
  }

  const parts: SearchPart[] = [];
  let at = 0;

  for (const [start, end] of hits) {
    if (start > at) {
      parts.push({ text: text.slice(at, start), hit: false });
    }

    parts.push({ text: text.slice(start, end), hit: true });
    at = end;
  }

  if (at < text.length) {
    parts.push({ text: text.slice(at), hit: false });
  }

  return parts;
}

// One line of a long text around its first hit, with its line breaks laid flat and an ellipsis
// where it was cut. `lead` is how much stands before the hit, as much as after it unless a line
// cut at its end by the screen needs the hit near its start.
export function hitSnippet(
  text: string,
  query: string | null | undefined,
  radius: number = SNIPPET_RADIUS,
  lead: number = radius,
  locale?: string
): string {
  const flat = text.replace(/\s+/g, " ");
  const hit = searchHits(flat, query, locale)[0];

  if (hit === undefined) {
    return "";
  }

  const start = Math.max(0, hit[0] - lead);
  const end = Math.min(flat.length, hit[1] + radius);

  return `${start > 0 ? "…" : ""}${flat.slice(start, end).trim()}${end < flat.length ? "…" : ""}`;
}

// Whether a record matches, and where. Null when it does not match at all, and for an empty
// phrase, which is no search.
export function matchFields(fields: readonly SearchField[], query: string | null | undefined, locale?: string): SearchMatch | null {
  if (searchPhrase(query) === "") {
    return null;
  }

  let shown = false;
  let hidden: SearchMatch["hidden"] = null;

  for (const field of fields) {
    const text = field.text ?? "";

    if (searchHits(text, query, locale).length === 0) {
      continue;
    }

    if (field.shown) {
      shown = true;
    } else if (hidden === null) {
      hidden = { label: field.label, snippet: hitSnippet(text, query, SNIPPET_RADIUS, SNIPPET_RADIUS, locale) };
    }
  }

  if (shown) {
    return { shown, hidden: null };
  }

  return hidden === null ? null : { shown, hidden };
}

// The records that match, in the order they came.
export function filterRecords<T>(
  records: readonly T[],
  fields: (record: T) => readonly SearchField[],
  query: string | null | undefined,
  locale?: string
): T[] {
  if (searchPhrase(query) === "") {
    return [...records];
  }

  return records.filter((record) => matchFields(fields(record), query, locale) !== null);
}
