import { createApp, defineComponent, h, ref, Transition, TransitionGroup } from "vue";

import { foldItem, settleItem, unfoldItem } from "../../app/domain/moving-list";
import { useSlideDirection } from "../../app/domain/tab-slide";

// A moving list and a tab's panel, wired the way MovingList and TabSlide wire them, and nothing else
// on the page. What is under test is how the two move under the layer's own stylesheet, frame by
// frame: so the list's items and the panels carry nothing of their own but a size and a frame, and
// every frame drawn while they move is written down — where each stands, how tall it is, and how
// opaque it is drawn.

export interface Seen {
  // The frame's number since recording began.
  frame: number;
  // Every list item and panel on the page in that frame, by its key.
  boxes: Record<string, { left: number; top: number; height: number; opacity: number }>;
}

export interface MotionPage {
  setItems: (keys: string[]) => void;
  setTab: (at: number, key: string) => void;
  record: () => void;
  // The frames written down since the last record, once nothing moves or is running any more.
  settled: () => Promise<Seen[]>;
}

export const PANEL_WIDTH = 300;

export function mountMotion(box: HTMLElement, options: { items: string[]; tab: { at: number; key: string } }): MotionPage {
  const items = ref(options.items);
  const tab = ref(options.tab);

  const slide = defineComponent({
    props: { at: { type: Number, required: true } },
    setup(props, { slots }) {
      const direction = useSlideDirection(() => props.at);

      return () =>
        h(
          "div",
          { style: `position:relative;overflow:hidden;width:${PANEL_WIDTH}px;height:120px` },
          h(
            Transition,
            { name: direction.value === null ? undefined : `bmo-slide-${direction.value}`, css: direction.value !== null },
            { default: () => slots.default?.() }
          )
        );
    }
  });

  const view = defineComponent({
    setup() {
      return () =>
        h("div", { style: "display:flex;flex-direction:column;gap:16px;padding:8px" }, [
          h(
            TransitionGroup,
            {
              tag: "ul",
              name: "bmo-list",
              onEnter: unfoldItem,
              onAfterEnter: settleItem,
              onLeave: foldItem,
              style: `display:flex;flex-direction:column;gap:4px;margin:0;padding:0;list-style:none;width:${PANEL_WIDTH}px`
            },
            {
              default: () =>
                items.value.map((key) =>
                  h("li", { key, "data-box": key }, key)
                )
            }
          ),
          h(slide, { at: tab.value.at }, {
            default: () => h("div", { key: tab.value.key, "data-box": tab.value.key, style: "height:100%;background:#eee" }, tab.value.key)
          })
        ]);
    }
  });

  createApp(view).mount(box);

  let frames: Seen[] = [];
  let recording = false;

  function look(frame: number): void {
    const boxes: Seen["boxes"] = {};

    for (const element of box.querySelectorAll<HTMLElement>("[data-box]")) {
      const rect = element.getBoundingClientRect();

      boxes[element.dataset.box!] = { left: Math.round(rect.left), top: Math.round(rect.top), height: Math.round(rect.height), opacity: Number(getComputedStyle(element).opacity) };
    }

    frames.push({ frame, boxes });

    if (recording) {
      requestAnimationFrame(() => look(frame + 1));
    }
  }

  return {
    setItems: (keys) => {
      items.value = keys;
    },
    setTab: (at, key) => {
      tab.value = { at, key };
    },
    record: () => {
      frames = [];
      recording = true;
      requestAnimationFrame(() => look(0));
    },
    settled: () =>
      new Promise((resolve) => {
        // A movement begins a frame or two after the change, so it is waited for, or for long enough
        // that one would have begun; then nothing running on the box any more, and the last frames all
        // alike.
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
