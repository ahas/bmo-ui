import { describe, expect, test } from "bun:test";

import { draggedSelection, edgeScroll } from "~/domain/dragselect";

const keys = ["m1", "m2", "m3", "m4", "m5"];

describe("choosing rows with a held finger", () => {
  test("the rows between the pressed one and the one under the finger are chosen, either way up", () => {
    expect([...draggedSelection(keys, new Set(["m2"]), "m2", "m4")]).toEqual(["m2", "m3", "m4"]);
    expect([...draggedSelection(keys, new Set(["m4"]), "m4", "m1")].sort()).toEqual(["m1", "m2", "m3", "m4"]);
  });

  test("going back gives the passed rows up, and what was chosen before stays", () => {
    const before = new Set(["m5", "m2"]);

    expect([...draggedSelection(keys, before, "m2", "m4")].sort()).toEqual(["m2", "m3", "m4", "m5"]);
    expect([...draggedSelection(keys, before, "m2", "m2")].sort()).toEqual(["m2", "m5"]);
  });

  test("a row the list does not hold changes nothing", () => {
    expect([...draggedSelection(keys, new Set(["m2"]), "m2", "out1")]).toEqual(["m2"]);
  });
});

describe("scrolling while the finger stands at an edge", () => {
  test("nothing in the middle, up near the top, down near the bottom, faster the deeper", () => {
    expect(edgeScroll(400, 100, 900, 60, 20)).toBe(0);
    expect(edgeScroll(130, 100, 900, 60, 20)).toBe(-10);
    expect(edgeScroll(50, 100, 900, 60, 20)).toBe(-20);
    expect(edgeScroll(885, 100, 900, 60, 20)).toBe(15);
  });
});
