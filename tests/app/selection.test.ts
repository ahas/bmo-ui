import { describe, expect, test } from "bun:test";

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

  test("is one pressable control with its words, whose hover fills its own rounded shape", () => {
    const box = nodes.find((node) => node.tag === "UCheckbox");

    expect(attribute(box!, "ui")?.exp?.content).toBe("CONTROL_UI");
    expect(chooseAll).toMatch(/root: "[^"]*rounded-md[^"]*hover:bg-elevated active:bg-elevated/);
    expect(chooseAll).toContain('@click="aroundBox"');
    // A press on the box or on its words is the checkbox's own; the shape takes only what missed both.
    expect(chooseAll).toContain(`closest("[role='checkbox'], label") !== null`);
  });

  test("shows the end a press would take it to as its words, which are its accessible name", () => {
    const box = nodes.find((node) => node.tag === "UCheckbox");

    expect(attribute(box!, "label")?.exp?.content).toBe("label");
    expect(nodes.some((node) => node.tag === "UTooltip")).toBe(false);
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
