import { createApp, defineComponent, h, ref } from "vue";

import { useDragSelect } from "../../app/domain/dragselect";

import type { PressKind } from "../../app/domain/dragselect";

// A list of bare rows driven by the one choosing gesture, and nothing else on the page.
// What is under test is the gesture rather than a screen, so a row here is a key, a height and a
// mark when it is chosen; a screen would only bring its own reasons for a touch to go missing.
//
// The one thing a screen does decide is its policy — whether a hold on a row already chosen is the
// list's or the browser's — so that is what this takes, and both answers are driven from the same
// page. A tap on a row while the list is choosing takes it or gives it up, as it does on every
// screen that chooses, since what the gesture leaves behind is read by the tap that follows it.

export interface DragList {
  chosen: () => string[];
  choosing: () => boolean;
}

export interface DragListOptions {
  rows: number;
  rowHeight: number;
  height: number;
  // Whether a hold on a row already chosen is left to the browser, the way a list whose rows carry
  // words a reader may want to select leaves it.
  reserveChosen: boolean;
}

export function mountDragList(box: HTMLElement, options: DragListOptions): DragList {
  const keys = Array.from({ length: options.rows }, (_, at) => `r${at + 1}`);
  const selected = ref(new Set<string>());
  const choosing = ref(false);

  const view = defineComponent({
    setup() {
      const rows = ref<HTMLElement | null>(null);

      useDragSelect({
        surface: () => rows.value,
        scroller: () => rows.value,
        rowMark: "data-row",
        keys: () => keys,
        selected,
        press: (key): PressKind => (options.reserveChosen && choosing.value && selected.value.has(key) ? "browser" : "hold"),
        hold: (key) => {
          selected.value = choosing.value ? new Set([...selected.value, key]) : new Set([key]);
          choosing.value = true;
        }
      });

      return () =>
        h(
          "div",
          { ref: rows, style: `height:${options.height}px;overflow-y:auto;background:#fff` },
          keys.map((key) =>
            h(
              "div",
              {
                "data-row": key,
                "data-chosen": selected.value.has(key) ? "" : undefined,
                onClick: () => {
                  if (!choosing.value) {
                    return;
                  }

                  const next = new Set(selected.value);

                  if (!next.delete(key)) {
                    next.add(key);
                  }

                  selected.value = next;
                },
                style: `box-sizing:border-box;height:${options.rowHeight}px;line-height:${options.rowHeight}px;border-bottom:1px solid #ccc;background:${selected.value.has(key) ? "#cde" : "#fff"}`
              },
              key
            )
          )
        );
    }
  });

  createApp(view).mount(box);

  return { chosen: () => [...selected.value], choosing: () => choosing.value };
}
