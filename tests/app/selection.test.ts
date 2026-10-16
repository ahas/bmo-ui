import { describe, expect, test } from "bun:test";

import { CHOOSE_CELL } from "~/domain/chooseall";
import { HOLD_MS } from "~/domain/longpress";

import { attribute, elements, source, template } from "./sources";

// Choosing many rows belongs to no one list (`docs/design.md`, "Lists"): every list of the layer's
// hosts that chooses more than one row is dragged through the same way and given the same control to
// choose them all. What a list keeps is its policy — which presses are its to read, what a hold means
// there, which rows it is showing and what it does with the answer. All of it is read here off the
// files that ship, because a rendered screen shows none of it until somebody holds a finger down.

const gesture = await source("domain/dragselect.ts");
const longPress = await source("domain/longpress.ts");
const chooseAll = await source("components/ChooseAll.vue");
const actionGroup = await source("components/ActionGroup.vue");

describe("a held finger on a list of many", () => {
  test("chooses the row under it and every one it is dragged across", () => {
    expect(HOLD_MS).toBe(500);
    expect(gesture).toContain("useLongPress({");
    expect(gesture).toContain("draggedSelection(");
    expect(gesture).toContain('surface.addEventListener("touchmove", onTouchMove, { passive: false })');
  });

  test("scrolls the list while it stands at an edge, and a move before the hold is a scroll", () => {
    expect(gesture).toContain("edgeScroll(drag.y");
    expect(longPress).toContain("> HOLD_SLOP_PX");
  });
});

// The states, the press and the name are decided once and every list that chooses is given the same
// control.
describe("the control that chooses every row", () => {
  const nodes = elements(template(chooseAll));

  test("is a checkbox standing at the three states of the choice", () => {
    const box = nodes.find((node) => node.tag === "UCheckbox");

    expect(box).toBeDefined();
    expect(attribute(box!, "model-value")?.exp?.content).toBe("state");
    expect(chooseAll).toContain("chooseAllState(props.selected, props.keys)");
  });

  test("stands in a cell a finger can aim at, which carries the hover and the press", () => {
    // The cell's shape is the choosing module's, so the control over a list and the mark on its rows
    // are given it from one place and stand on one vertical line.
    expect(chooseAll).toContain("CHOOSE_CELL");
    expect(CHOOSE_CELL).toContain("size-9");
    expect(CHOOSE_CELL).toContain("pointer-coarse:size-10");
    expect(chooseAll).toContain("hover:bg-elevated active:bg-elevated");
    // A press that landed on the box is the box's own; the cell takes only what missed it.
    expect(chooseAll).toContain(`closest("[role='checkbox']") !== null`);
  });

  test("names itself the end a press would take it to, in its tooltip and its accessible name", () => {
    const tip = nodes.find((node) => node.tag === "UTooltip");
    const box = nodes.find((node) => node.tag === "UCheckbox");

    expect(attribute(tip!, "text")?.exp?.content).toBe("label");
    expect(attribute(box!, "aria-label")?.exp?.content).toBe("label");
    expect(chooseAll).toContain("chooseAllLabel(t, state.value)");
  });
});

describe("a bar of actions", () => {
  // A list's bar stands in a panel, in one half of a splitter or over a reading column and is as
  // narrow as that part however wide the window is. A bar that read the window would stand its whole
  // row of actions where there is no room for them and run off its own edge.
  test("gathers by the room it has and not by the window's width", () => {
    expect(actionGroup).toContain("useBarGathers");
  });
});
