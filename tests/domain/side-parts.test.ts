import { describe, expect, test } from "bun:test";

import { sideEntriesMatching, sideNodeChoices, sideNodeParents, sideNodePath, sideNodesMatching } from "~/domain/side-parts";

import type { SideEntry, SideNode } from "~/domain/side-parts";

// Which entries of a side list the words typed keep (`docs/components.md`, "Choosing from a side
// list"): a choice by its label or the line under it, a heading while a choice under it stays. How
// the list draws them is the component's browser test (`tests/browser/choice-sidebar.test.ts`). And
// what a side tree reads of its nodes (`docs/components.md`, "Choosing from a side tree"): the nodes
// the words keep, the way down to a node, the nodes that hold others and every node as a choice; how
// the tree draws them is its own browser test (`tests/browser/choice-tree.test.ts`).

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

const TREE: SideNode[] = [
  {
    key: "north",
    label: "Northwind",
    children: [
      { key: 2, label: "Sales", children: [{ key: 3, label: "Field team" }] },
      { key: 4, label: "Support" }
    ]
  },
  { key: "atlas", label: "Atlas", icon: "i-material-symbols-domain", children: [{ key: 5, label: "Sales desk" }] },
  { key: "beacon", label: "Beacon" }
];

// A tree as its labels, each node's under it.
function outline(nodes: readonly SideNode[]): unknown[] {
  return nodes.map((node) => (node.children === undefined ? node.label : [node.label, outline(node.children)]));
}

describe("the nodes a side tree's search keeps", () => {
  test("are the whole tree while no words are typed", () => {
    expect(outline(sideNodesMatching(TREE, " "))).toEqual(outline(TREE));
  });

  test("are the nodes whose label holds the words, each under every node above it, in their order", () => {
    expect(outline(sideNodesMatching(TREE, "SALES"))).toEqual([
      ["Northwind", ["Sales"]],
      ["Atlas", ["Sales desk"]]
    ]);
    expect(outline(sideNodesMatching(TREE, "field"))).toEqual([["Northwind", [["Sales", ["Field team"]]]]]);
  });

  test("leave a match none of whose nodes stays standing as a leaf, and nothing where nothing holds the words", () => {
    expect(sideNodesMatching(TREE, "atlas")).toEqual([{ key: "atlas", label: "Atlas", icon: "i-material-symbols-domain" }]);
    expect(sideNodesMatching(TREE, "nothing like it")).toEqual([]);
  });
});

describe("what a side tree reads of its nodes", () => {
  test("the way down to a node is every key above it and its own, and none for a key no node holds", () => {
    expect(sideNodePath(TREE, 3)).toEqual(["north", 2, 3]);
    expect(sideNodePath(TREE, "beacon")).toEqual(["beacon"]);
    expect(sideNodePath(TREE, "3")).toEqual([]);
    expect(sideNodePath(TREE, null)).toEqual([]);
  });

  test("the nodes that hold others are each before the nodes under it", () => {
    expect(sideNodeParents(TREE)).toEqual(["north", 2, "atlas"]);
  });

  test("every node is a choice by its key and label, each before the nodes under it", () => {
    expect(sideNodeChoices(TREE).map((choice) => [choice.value, choice.label])).toEqual([
      ["north", "Northwind"],
      [2, "Sales"],
      [3, "Field team"],
      [4, "Support"],
      ["atlas", "Atlas"],
      [5, "Sales desk"],
      ["beacon", "Beacon"]
    ]);
  });
});
