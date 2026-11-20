import { describe, expect, test } from "bun:test";

import { sideEntriesMatching } from "~/domain/side-parts";

import type { SideEntry } from "~/domain/side-parts";

// Which entries of a side list the words typed keep (`docs/components.md`, "Choosing from a side
// list"): a choice by its label or the line under it, a heading while a choice under it stays. How
// the list draws them is the component's browser test (`tests/browser/choice-sidebar.test.ts`).

const ENTRIES: SideEntry[] = [
  { type: "label", label: "Northwind" },
  { value: 1, label: "Northwind" },
  { value: 2, label: "Sales", depth: 1 },
  { value: 3, label: "Field team", depth: 2, line: "Northwind / Sales" },
  { type: "label", label: "Projects" },
  { value: "launch", label: "Launch" }
];

function labels(entries: readonly SideEntry[]): string[] {
  return entries.map((entry) => ("type" in entry ? `# ${entry.label}` : entry.label));
}

describe("the entries a side list's search keeps", () => {
  test("are every entry while no words are typed", () => {
    expect(labels(sideEntriesMatching(ENTRIES, "  "))).toEqual(labels(ENTRIES));
  });

  test("are the choices whose label or line holds the words, letter case folded, each under its heading", () => {
    expect(labels(sideEntriesMatching(ENTRIES, "SALES"))).toEqual(["# Northwind", "Sales", "Field team"]);
    expect(labels(sideEntriesMatching(ENTRIES, "launch"))).toEqual(["# Projects", "Launch"]);
  });

  test("leave a heading out where no choice under it stays", () => {
    expect(labels(sideEntriesMatching(ENTRIES, "projects"))).toEqual([]);
    expect(labels(sideEntriesMatching(ENTRIES, "nothing like it"))).toEqual([]);
  });
});
