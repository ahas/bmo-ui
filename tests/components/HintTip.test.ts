import { describe, expect, test } from "bun:test";

import { PAGE_TIP_UI } from "~/domain/page-tip";
import { TOOLTIP_PROVIDER, TOOLTIP_UI } from "~/domain/tooltip";

// The layer's one tooltip for words that say more than what they stand on. Read off the file that
// ships: what a rendered screen would not name is how a finger, which has no hover, brings it up.

const tip = await Bun.file(new URL("../../app/components/HintTip.vue", import.meta.url)).text();
const layers = await Promise.all(["CutLineTip", "MarkupButtonTip"].map((name) => Bun.file(new URL(`../../app/components/${name}.vue`, import.meta.url)).text()));

describe("the shared tooltip", () => {
  test("rests on the layer's one long press where a tap acts, and puts itself away on the next touch", () => {
    expect(tip).toContain('import { useLongPress } from "../domain/longpress";');
    expect(tip).toContain("surface: () => (props.press && !props.disabled ? element() : null)");
    expect(tip).toContain('if (by === "touch" && !props.press) showForFinger();');
    expect(tip).toContain('{ once: true, capture: true }');
  });

  test("switched off, it opens for nothing, a finger's tap included", () => {
    expect(tip).toContain("if (value && props.disabled) return;");
    expect(tip.indexOf("if (value && props.disabled) return;")).toBeLessThan(tip.indexOf('if (value) emit("ask");'));
  });

  test("names a cut name only where its box actually cuts it", () => {
    expect(tip).toContain("box.scrollWidth > box.clientWidth");
    expect(tip).toContain("if (value && props.cut && !isCut()) return;");
  });

  // A closing dialog hands the focus back to the control it was opened from; on a phone that focus
  // would leave the control's name standing over the screen the reader returned to.
  test("comes up for no focus the keyboard did not bring, as the setting a host hands the library says", () => {
    expect(TOOLTIP_PROVIDER).toEqual({ ignoreNonKeyboardFocus: true });
    expect(tip).toContain(':ignore-non-keyboard-focus="TOOLTIP_PROVIDER.ignoreNonKeyboardFocus"');
    expect(tip).toContain('event.target.matches(":focus-visible")');
  });

  test("wraps long words rather than cutting them, as every page layer's tooltip does", () => {
    expect(TOOLTIP_UI.text).toBe("whitespace-normal break-words");
    expect(tip).toContain(':ui="TOOLTIP_UI"');
    expect(PAGE_TIP_UI.text).toBe(TOOLTIP_UI.text);
    expect(PAGE_TIP_UI.content.startsWith(TOOLTIP_UI.content)).toBe(true);

    for (const layer of layers) expect(layer).toContain(':ui="PAGE_TIP_UI"');
  });
});
