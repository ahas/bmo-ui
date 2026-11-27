import { createApp, defineComponent, h, ref } from "vue";

import { MovingListGroup } from "../../app/domain/moving-list-group";

// A moving list as `MovingList` draws it, under a head whose height the test sets in the same change as the
// list's items, and nothing else on the page. Every frame drawn while it moves is written down: where each item
// stands, its height, and how opaque it is drawn.

export interface Seen {
  frame: number;
  boxes: Record<string, { top: number; height: number; opacity: number; offset: number }>;
}

export interface ArrivalPage {
  set: (head: number, keys: string[]) => void;
  record: () => void;
  settled: () => Promise<Seen[]>;
}

export function mountArrival(box: HTMLElement): ArrivalPage {
  const head = ref(40);
  const items = ref<string[]>([]);
  const view = defineComponent({
    setup() {
      return () =>
        h("div", { style: "display:flex;flex-direction:column;width:300px" }, [
          h("div", { "data-head": "", style: `height:${head.value}px;background:#ddd` }),
          h(
            MovingListGroup,
            { tag: "ul", style: "display:flex;flex-direction:column;gap:4px;margin:0;padding:0;list-style:none" },
            { default: () => items.value.map((key) => h("li", { key, "data-box": key }, key)) }
          )
        ]);
    }
  });

  createApp(view).mount(box);

  let frames: Seen[] = [];
  let recording = false;

  function look(frame: number): void {
    const boxes: Seen["boxes"] = {};
    const list = box.querySelector("ul")!.getBoundingClientRect();

    for (const element of box.querySelectorAll<HTMLElement>("[data-box]")) {
      const rect = element.getBoundingClientRect();

      boxes[element.dataset.box!] = {
        top: Math.round(rect.top),
        height: Math.round(rect.height),
        opacity: Number(getComputedStyle(element).opacity),
        offset: Math.round(rect.top - list.top)
      };
    }

    frames.push({ frame, boxes });

    if (recording) requestAnimationFrame(() => look(frame + 1));
  }

  return {
    set: (height, keys) => {
      head.value = height;
      items.value = keys;
    },
    record: () => {
      frames = [];
      recording = true;
      requestAnimationFrame(() => look(0));
    },
    settled: () =>
      new Promise((resolve) => {
        let began = false;
        const still = (): boolean => {
          const running = box.getAnimations({ subtree: true }).length > 0;
          const last = frames.slice(-3).map((one) => JSON.stringify(one.boxes));

          began ||= running;

          return (began || frames.length > 30) && !running && last.length === 3 && new Set(last).size === 1;
        };
        const wait = (): void => {
          if (still() || frames.length > 600) {
            recording = false;
            resolve(frames);
          } else {
            requestAnimationFrame(wait);
          }
        };

        requestAnimationFrame(wait);
      })
  };
}
