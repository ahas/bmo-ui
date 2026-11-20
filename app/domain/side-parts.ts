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

    if (matchFields(sideFields(entry), words, locale) === null) continue;

    if (heading !== null) {
      kept.push(heading);
      heading = null;
    }

    kept.push(entry);
  }

  return kept;
}

// The texts a choice's row shows, each searched.
function sideFields(choice: SideChoice): SearchField[] {
  return [
    { label: "", text: choice.label, shown: true },
    { label: "", text: choice.line, shown: true }
  ];
}
