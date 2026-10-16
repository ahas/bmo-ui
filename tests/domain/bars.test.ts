import { describe, expect, test } from "bun:test";

import { BAR_SIZE, FOLDED_LEGEND, INLINE_LEGEND, STACKED_LEGEND } from "~/domain/bars";

// Every segmented bar wears one look, read from the bars module rather than spelt by each place that
// draws one. What is held here is the shape of each legend the module offers.

describe("what every segmented bar wears", () => {
  test("the shape for a block that has a row to spare for each part", () => {
    // The theme's own column, tightened to the size the text around such a block reads at. The
    // figure stays at the far end of its row, which is what makes a column of them line up.
    expect(STACKED_LEGEND.list).not.toContain("flex-row");
    expect(STACKED_LEGEND.itemTrailing).not.toContain("ms-0");
    expect(BAR_SIZE).toBe("sm");
  });

  test("and the shape for a place with one line to spare", () => {
    // Laid across the line and wrapped when it runs out of room, with each figure beside the word
    // it belongs to rather than pushed to the far end, where somebody else's word is standing.
    expect(INLINE_LEGEND.list).toContain("flex-row");
    expect(INLINE_LEGEND.list).toContain("flex-wrap");
    expect(INLINE_LEGEND.itemTrailing).toContain("ms-0");
  });

  test("and that shape again for a row of a list, where a phone has no line to spare", () => {
    // Four parts across a row of a list at a phone's width wrap to four lines, and a row of a
    // list that is four lines tall is a paragraph. Below the small breakpoint, the track stands
    // alone; above it, this is the inline legend and nothing else.
    expect(FOLDED_LEGEND.list).toContain("hidden");
    expect(FOLDED_LEGEND.list).toContain("sm:flex");
    expect(FOLDED_LEGEND.list).toContain(INLINE_LEGEND.list);
    expect({ ...FOLDED_LEGEND, list: INLINE_LEGEND.list }).toEqual(INLINE_LEGEND);
  });
});
