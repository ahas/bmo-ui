import { matchFields, searchPhrase } from "../../shared/search";

import type { SearchField } from "../../shared/search";

// How a side part of a screen stands: beside the body behind a splitter on a wide screen, and up
// from the bottom edge on a phone.

// The boundary a splitter draws between two parts: a hairline, and the room a hand aims at around
// it. The handle takes only the hairline's own pixel in the layout, so the parts on either side reach
// the line itself and leave no strip beside it; the grab room is drawn over their edges instead, a
// few pixels each way, so thinning what is seen does not thin what can be grabbed. Nothing is placed
// with a transform: a shifted line lands between device pixels and is drawn across two of them,
// which reads as a doubled edge.
export const SPLIT_HANDLE = [
  "before:absolute before:inset-0 before:bg-accented before:transition-colors after:absolute after:z-10",
  "data-[state=hover]:before:bg-primary data-[state=drag]:before:bg-primary",
  "data-[orientation=horizontal]:w-px data-[orientation=horizontal]:after:inset-y-0 data-[orientation=horizontal]:after:-inset-x-1",
  "data-[orientation=vertical]:h-px data-[orientation=vertical]:after:inset-x-0 data-[orientation=vertical]:after:-inset-y-1"
].join(" ");

// A side part risen from the bottom edge of a phone: the part reaches the sheet's edges and keeps its
// own padding, so its lists scroll at the sheet's edge as they do beside the body.
export const FULL_SHEET = {
  content: "h-[75dvh]",
  container: "min-h-0 flex-1 p-0 gap-0 overflow-hidden",
  header: "border-b border-default px-4 py-3",
  body: "flex min-h-0 flex-1 flex-col"
};

// The side list's head, as tall as a tab row, and the same height told to the body beside it as
// `--bmo-list-head`, which a row heading the body takes, so its line runs on from the head's
// (`docs/components.md`, "Choosing from a side list").
export const SIDE_HEAD = { height: "h-12", told: "[--bmo-list-head:calc(var(--spacing)*12)]" } as const;

// The side list a screen chooses what its body stands for from (`ChoiceSidebar`,
// `docs/components.md`, "Choosing from a side list"). An entry is a choice, by its value and the
// label it is shown by, standing indented by its depth and with a muted line under its label where
// it has one, or a heading over the choices after it, written as the component library's own items
// write a label.
export interface SideChoice {
  value: string | number;
  label: string;
  depth?: number;
  line?: string;
}

export interface SideHeading {
  type: "label";
  label: string;
}

export type SideEntry = SideChoice | SideHeading;

// The list's share of a splitter's width, in hundredths: about a quarter, at least room for its search
// and a name, and at most two fifths, so the body keeps the rest.
export const SIDE_LIST_REGION = { minSize: 18, defaultSize: 26, maxSize: 40 } as const;

export function isSideHeading(entry: SideEntry): entry is SideHeading {
  return "type" in entry && entry.type === "label";
}

// The entries the words keep, in their order: each choice whose label or line holds them, through
// the one search, and each heading while a choice under it stays, up to the next heading.
export function sideEntriesMatching(entries: readonly SideEntry[], words: string, locale?: string): SideEntry[] {
  if (searchPhrase(words) === "") return [...entries];

  const kept: SideEntry[] = [];
  let heading: SideHeading | null = null;

  for (const entry of entries) {
    if (isSideHeading(entry)) {
      heading = entry;
      continue;
    }

    if (!holdsWords(entry, words, locale)) continue;

    if (heading !== null) {
      kept.push(heading);
      heading = null;
    }

    kept.push(entry);
  }

  return kept;
}

// Whether the texts a row shows, its label and the line under it, hold the words, through the one
// search.
function holdsWords(row: { label: string; line?: string }, words: string, locale?: string): boolean {
  const fields: SearchField[] = [
    { label: "", text: row.label, shown: true },
    { label: "", text: row.line, shown: true }
  ];

  return matchFields(fields, words, locale) !== null;
}

// The side tree a screen chooses what its body stands for from (`ChoiceTree`, `docs/components.md`,
// "Choosing from a side tree"): each node by its key, the label it is shown by, the icon leading it
// where it has one, and the nodes under it.
export interface SideNode {
  key: string | number;
  label: string;
  icon?: string;
  children?: readonly SideNode[];
}

// Every node of a tree as a side list's choice, each before the nodes under it: what names the chosen
// node and says whether the words leave anything.
export function sideNodeChoices(nodes: readonly SideNode[]): SideChoice[] {
  return nodes.flatMap((node) => [{ value: node.key, label: node.label }, ...sideNodeChoices(node.children ?? [])]);
}

// The tree the words keep, in its order: each node whose label holds them, through the one search, and
// each node above one that stays, holding only the nodes under it that stay.
export function sideNodesMatching(nodes: readonly SideNode[], words: string, locale?: string): SideNode[] {
  if (searchPhrase(words) === "") return [...nodes];

  return nodes.flatMap((node) => {
    const children = sideNodesMatching(node.children ?? [], words, locale);

    if (children.length > 0) return [{ ...node, children }];
    if (!holdsWords(node, words, locale)) return [];

    // A match none of whose nodes stays stands as a leaf.
    const { children: _left, ...leaf } = node;

    return [leaf];
  });
}

// The keys from the top of the tree down to the node of the key, its own last; none where no node
// holds the key.
export function sideNodePath(nodes: readonly SideNode[], key: string | number | null): (string | number)[] {
  for (const node of nodes) {
    if (node.key === key) return [node.key];

    const below = sideNodePath(node.children ?? [], key);

    if (below.length > 0) return [node.key, ...below];
  }

  return [];
}

// The keys of every node that holds others, each before the nodes under it.
export function sideNodeParents(nodes: readonly SideNode[]): (string | number)[] {
  return nodes.flatMap((node) => {
    const children = node.children ?? [];

    return children.length > 0 ? [node.key, ...sideNodeParents(children)] : [];
  });
}
