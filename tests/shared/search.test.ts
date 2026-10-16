import { describe, expect, test } from "bun:test";

import { filterRecords, highlightParts, hitSnippet, matchFields, searchHits } from "#shared/search";

import type { SearchField } from "#shared/search";

describe("where a phrase stands in a text", () => {
  test("every place, ignoring case", () => {
    expect(searchHits("Auto and AUTO", "auto")).toEqual([[0, 4], [9, 13]]);
  });

  test("the phrase is matched whole, spaces and all", () => {
    expect(searchHits("in progress · stage 7/9", "stage 7/9")).toEqual([[14, 23]]);
    expect(searchHits("stage 7 / 9", "stage 7/9")).toEqual([]);
  });

  test("an empty phrase finds nothing", () => {
    expect(searchHits("anything", "  ")).toEqual([]);
  });

  // Case is folded in the locale the caller hands over: a dotted and a dotless i are two letters in
  // Turkish and one in English, so the same phrase finds the same word in one and not the other.
  test("case is folded in the locale it is handed", () => {
    expect(searchHits("TITLE", "title", "en-US")).toEqual([[0, 5]]);
    expect(searchHits("TITLE", "title", "tr-TR")).toEqual([]);
    expect(matchFields([{ label: "n", text: "TITLE", shown: true }], "title", "tr-TR")).toBeNull();
    expect(filterRecords(["TITLE"], (record) => [{ label: "n", text: record, shown: true }], "title", "tr-TR")).toEqual([]);
  });
});

describe("the pieces a screen draws", () => {
  test("hits and the text between them, in order", () => {
    expect(highlightParts("#369 work #3690", "#369")).toEqual([
      { text: "#369", hit: true },
      { text: " work ", hit: false },
      { text: "#369", hit: true },
      { text: "0", hit: false }
    ]);
  });

  test("a text with no hit is one plain piece", () => {
    expect(highlightParts("Title", "x")).toEqual([{ text: "Title", hit: false }]);
  });

  // The layer's own marks fold case as the host says, read from its setting each time they draw.
  test("are folded in the host's locale where the layer draws them", async () => {
    const source = await Bun.file(new URL("../../app/components/SearchText.vue", import.meta.url)).text();

    expect(source).toContain("highlightParts(props.text, props.query, countLocale())");
  });
});

describe("the one line under a row", () => {
  test("is the hidden text around its first hit, laid flat and cut on both sides", () => {
    const text = `${"x".repeat(50)}\nneedle\n${"y".repeat(50)}`;

    expect(hitSnippet(text, "needle", 3)).toBe("…xx needle yy…");
  });

  // A line the screen cuts at its end keeps the hit near its start.
  test("keeps less before the hit than after it where a lead is asked for", () => {
    expect(hitSnippet(`${"a".repeat(50)} needle ${"b".repeat(50)}`, "needle", 6, 2)).toBe("…a needle bbbbb…");
  });

  test("is not cut where the text is short", () => {
    expect(hitSnippet("short needle", "needle")).toBe("short needle");
  });
});

describe("whether a record matches", () => {
  const fields: SearchField[] = [
    { label: "Number", text: "#369", shown: true },
    { label: "State", text: "in progress · stage 7/9", shown: true },
    { label: "Report", text: "a secret word inside the report", shown: false },
    { label: "Brief", text: null, shown: false }
  ];

  test("a word read on the row matches, and needs no line under it", () => {
    expect(matchFields(fields, "#369")).toEqual({ shown: true, hidden: null });
    expect(matchFields(fields, "stage 7/9")).toEqual({ shown: true, hidden: null });
  });

  test("a word only in hidden data matches, and says where", () => {
    expect(matchFields(fields, "secret")).toEqual({ shown: false, hidden: { label: "Report", snippet: "a secret word inside the report" } });
  });

  test("a word found nowhere does not match, and an empty phrase is no search", () => {
    expect(matchFields(fields, "nowhere")).toBeNull();
    expect(matchFields(fields, "")).toBeNull();
  });

  test("filtering keeps the order and keeps everything for an empty phrase", () => {
    const records = [{ n: "a1" }, { n: "b" }, { n: "a2" }];
    const of = (record: { n: string }) => [{ label: "n", text: record.n, shown: true }];

    expect(filterRecords(records, of, "a").map((record) => record.n)).toEqual(["a1", "a2"]);
    expect(filterRecords(records, of, " ")).toHaveLength(3);
  });
});
