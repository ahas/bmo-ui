import { describe, expect, test } from "bun:test";
import { ref } from "vue";

import { PREVIEW_ITEM, useListPreview } from "~/domain/list-preview";

// A list of three items as the select draws it: each item an option holding its swatch, which
// carries the item's value.
function drawList(): { list: HTMLElement; items: HTMLElement[] } {
  const list = document.createElement("div");

  list.setAttribute("role", "listbox");
  const items = ["teal", "sea", "sunset"].map((value) => {
    const item = document.createElement("div");
    const swatch = document.createElement("span");

    item.setAttribute("role", "option");
    swatch.setAttribute(PREVIEW_ITEM, value);
    item.append(swatch);
    list.append(item);

    return item;
  });

  document.body.append(list);

  return { list, items };
}

function focusOn(preview: ReturnType<typeof useListPreview>, target: HTMLElement): void {
  const event = new FocusEvent("focusin", { bubbles: true });

  Object.defineProperty(event, "target", { value: target });
  (preview.list.onFocusin as (event: FocusEvent) => void)(event);
}

describe("the preview beside a list of choices", () => {
  test("stands in the item the focus rests on while the list is open, and the chosen one once it closes", () => {
    const chosen = ref("teal");
    const preview = useListPreview(chosen);
    const { items } = drawList();

    preview.onOpen(true);
    focusOn(preview, items[1]!);
    expect(preview.shown.value).toBe("sea");

    chosen.value = "sea";
    preview.onOpen(false);
    expect(preview.shown.value).toBe("sea");
  });

  test("is not moved by the focus a closing list hands to its own element, which holds every item", () => {
    const chosen = ref("teal");
    const preview = useListPreview(chosen);
    const { list, items } = drawList();

    preview.onOpen(true);
    focusOn(preview, items[2]!);
    chosen.value = "sunset";
    preview.onOpen(false);
    focusOn(preview, list);
    expect(preview.shown.value).toBe("sunset");

    // Nor, while open, does a focus on the list itself stand for its first item.
    preview.onOpen(true);
    focusOn(preview, list);
    expect(preview.shown.value).toBe("sunset");
  });

  test("follows the item a select highlights without moving the focus, and no highlight while the list is shut", () => {
    const chosen = ref("teal");
    const preview = useListPreview(chosen);
    const { items } = drawList();

    preview.onHighlight({ ref: items[2]! });
    expect(preview.shown.value).toBe("teal");

    preview.onOpen(true);
    preview.onHighlight({ ref: items[1]! });
    expect(preview.shown.value).toBe("sea");

    // A highlight that names no item leaves the preview where it was.
    preview.onHighlight(undefined);
    expect(preview.shown.value).toBe("sea");
  });
});
