import { describe, expect, test } from "bun:test";

import { CHOOSE_CELL, CHOOSE_GUTTER, chooseAllLabel, chooseAllPress, chooseAllState, chosenRuns } from "~/domain/chooseall";

import type { Translate } from "#shared/wording";

const wording: Translate = (key) => key;

describe("where the choice stands against the rows shown", () => {
  const keys = ["a", "b", "c"];

  test("is none with nothing chosen", () => {
    expect(chooseAllState(new Set(), keys)).toBe(false);
  });

  test("is some with part of them chosen", () => {
    expect(chooseAllState(new Set(["b"]), keys)).toBe("indeterminate");
  });

  test("is all only when every row shown is chosen", () => {
    expect(chooseAllState(new Set(keys), keys)).toBe(true);
    expect(chooseAllState(new Set(["a", "b"]), keys)).toBe("indeterminate");
  });

  // A page of a list chooses the page it is showing. What was chosen on a page since left behind
  // is still chosen, and says nothing about whether this page is whole.
  test("reads the rows shown and not the whole choice", () => {
    expect(chooseAllState(new Set([...keys, "d"]), keys)).toBe(true);
  });

  test("is none where there is nothing to choose", () => {
    expect(chooseAllState(new Set(), [])).toBe(false);
    expect(chooseAllState(new Set(["d"]), [])).toBe(false);
  });
});

describe("the chosen rows as boxes", () => {
  test("rows chosen one after another stand as one box, and a row left out parts them", () => {
    const keys = ["a", "b", "c", "d", "e"];

    expect(chosenRuns(keys, new Set(["a", "b", "d"]))).toEqual([["a", "b"], ["d"]]);
    expect(chosenRuns(keys, new Set(["e", "c", "d"]))).toEqual([["c", "d", "e"]]);
    expect(chosenRuns(keys, new Set())).toEqual([]);
  });
});

describe("what a press means", () => {
  test("chooses all from none and from some", () => {
    expect(chooseAllPress(false)).toBe(true);
    expect(chooseAllPress("indeterminate")).toBe(true);
  });

  test("gives the whole choice up from all", () => {
    expect(chooseAllPress(true)).toBe(false);
  });

  test("is what the control is called", () => {
    expect(chooseAllLabel(wording, false)).toBe(wording("common.action.choose_all"));
    expect(chooseAllLabel(wording, "indeterminate")).toBe(wording("common.action.choose_all"));
    expect(chooseAllLabel(wording, true)).toBe(wording("common.action.choose_none"));
  });
});

describe("the line the choosing controls stand on", () => {
  // The one thing a reader takes in at a glance from a list being chosen is whether the marks
  // stand straight, and a pressed mark's colour is read as even round it. A row centres its box in
  // its mark's cell and hangs the cell out before the row by the room round the box, so the box
  // lands on the row's leading line — where the control over the list stands its box too.
  test("a row centres the box in its cell and hangs the cell out by the room round it", () => {
    expect(CHOOSE_CELL).toContain("justify-center");
    expect(CHOOSE_CELL).not.toContain("justify-start");
    expect(CHOOSE_CELL).toContain("-ms-2.5 ");
    expect(CHOOSE_CELL).toContain("pointer-coarse:-ms-3 ");
  });

  test("a row's mark cell is as wide as a row of one line is tall, on a finger too", () => {
    expect(CHOOSE_CELL).toContain("size-9");
    expect(CHOOSE_CELL).toContain("pointer-coarse:size-10");
  });

  test("hangs out of the reading column by what a row's own mark hangs out by", () => {
    expect(CHOOSE_GUTTER).toBe("-ms-1");
  });
});

const control = await Bun.file(new URL("../../app/components/ChooseAll.vue", import.meta.url)).text();

describe("the choose-all control", () => {
  // Its pressable shape keeps room inside round the box and reaches out before the box by exactly
  // that room, so the box stays where the cell's own room puts it.
  test("reaches out before its box by the room it keeps inside", () => {
    expect(control).toContain("-ms-2 ");
    expect(control).toContain(" px-2 ");
    expect(control).not.toContain("CHOOSE_CELL");
  });
});
