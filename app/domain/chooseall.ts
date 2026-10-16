// Choosing every row at once, for every list that chooses more than one. A list that has a choosing
// state always carries this: what it shows is the three states the choice can be in — none of the
// rows, some of them, all of them — and what a press means follows from the state rather than from
// the list, so the same press means the same thing wherever it is made.

import type { Translate } from "#shared/wording";

// What the control stands at. The middle state is the word a checkbox understands for it.
export type ChooseAllState = boolean | "indeterminate";

// Where the choice stands against the rows the list is showing. An empty list stands at none:
// there is nothing for "all" to mean.
export function chooseAllState(selected: ReadonlySet<string>, keys: readonly string[]): ChooseAllState {
  if (keys.length === 0 || selected.size === 0) return false;

  return keys.every((key) => selected.has(key)) ? true : "indeterminate";
}

// The chosen rows as runs of neighbours, in the order the list stands them: rows chosen one after
// another are one run and are drawn as one box, and a row left out between them parts two.
export function chosenRuns(keys: readonly string[], selected: ReadonlySet<string>): string[][] {
  const runs: string[][] = [];
  let run: string[] = [];

  for (const key of keys) {
    if (selected.has(key)) {
      run.push(key);
    } else if (run.length > 0) {
      runs.push(run);
      run = [];
    }
  }

  return run.length > 0 ? [...runs, run] : runs;
}

// A press takes the choice to whichever end it is not already at: everything short of all chooses
// all, and all gives the whole choice up.
export function chooseAllPress(state: ChooseAllState): boolean {
  return state !== true;
}

// What the control is called, which is the end the press would take it to.
export function chooseAllLabel(t: Translate, state: ChooseAllState): string {
  return state === true ? t("common.action.choose_none") : t("common.action.choose_all");
}

// The cell the control stands in, which is also the cell a row stands its own mark in. The box is
// a checkbox's own size — smaller than a finger and smaller than the cells of a toolbar — so it
// stands in a cell as wide as a toolbar is tall and the whole cell is pressed.
//
// Inside that cell the box is held to the cell's leading edge rather than centred in it. Centred,
// the box over the list would sit half a cell further in than the boxes on the rows, and the
// column of them would read as bent — the one thing a reader takes in at a glance from a list
// being chosen is whether the marks stand straight. Held to the edge, the box lands wherever the
// cell's own leading room puts it, which is the same room a row gives its own mark, so the two
// stand on one vertical line with nothing measured per screen.
export const CHOOSE_CELL = "flex size-9 shrink-0 items-center justify-start rounded-md transition-colors pointer-coarse:size-10";

// How far a choosing control hangs outside the column its list reads in. A row's box reaches
// outside that column by the row's own side room and insets the mark into itself by what it insets
// it from the top, so the mark lands a little outside the column rather than on its edge. The
// control over the list hangs out by the same amount, and the two stand on one line.
export const CHOOSE_GUTTER = "-ms-1";
