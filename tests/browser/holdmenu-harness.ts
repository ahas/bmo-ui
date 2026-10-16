import { createApp, defineComponent, h, ref } from "vue";

import { useHoldMenu } from "../../app/domain/holdmenu";

// A scrolling list of bare rows whose menu a held finger asks for, and nothing else on the page.
// What is under test is the one long press as a menu reads it, so the menu here is only the
// request: every menu event that reaches the page unrefused is a menu that would have opened,
// counted with the row it was asked over, and every click is a tap that went through.

export interface HoldMenuPage {
  // The rows a menu was asked over, in order.
  menus: () => string[];
  clicks: () => string[];
}

export function mountHoldMenu(box: HTMLElement, options: { rows: number; rowHeight: number; height: number }): HoldMenuPage {
  const keys = Array.from({ length: options.rows }, (_, at) => `r${at + 1}`);
  const menus: string[] = [];
  const clicks: string[] = [];
  const rowOf = (target: EventTarget | null): string => (target instanceof Element ? (target.closest("[data-row]")?.getAttribute("data-row") ?? "") : "");

  window.addEventListener("contextmenu", (event) => {
    if (!event.defaultPrevented) {
      menus.push(rowOf(event.target));
      event.preventDefault();
    }
  });
  window.addEventListener("click", (event) => clicks.push(rowOf(event.target)));

  const view = defineComponent({
    setup() {
      const list = ref<HTMLElement | null>(null);

      useHoldMenu({ surface: () => list.value });

      return () =>
        h(
          "div",
          { ref: list, style: `height:${options.height}px;overflow-y:auto;background:#fff` },
          keys.map((key) =>
            h(
              "div",
              {
                "data-row": key,
                style: `box-sizing:border-box;height:${options.rowHeight}px;line-height:${options.rowHeight}px;border-bottom:1px solid #ccc`
              },
              key
            )
          )
        );
    }
  });

  createApp(view).mount(box);

  return { menus: () => [...menus], clicks: () => [...clicks] };
}
