import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, ref } from "vue";
import { createI18n } from "vue-i18n";

import AvatarGroup from "../../app/components/AvatarGroup.vue";
import UnfoldingBox from "../../app/components/UnfoldingBox.vue";
import sheet from "./faces-harness.css?inline";

import type { Component } from "vue";

import type { AvatarFace, FaceSize } from "../../app/domain/avatar-group";

// A row of faces and the words after it, held in one unfolding box (`docs/components.md`, "Avatar
// groups" and "A box that follows what it holds"), on a page that shows nothing else. What is under
// test is how they move under the layer's own stylesheet, frame by frame: so every frame drawn while
// they move is written down — where each face stands and how wide it is, how wide the box and what
// it holds are, and how opaque each is drawn. The row's size can be changed, so where each face
// stands on the row's height is read at every size the group draws.

export interface FacesSeen {
  // The frame's number since recording began.
  frame: number;
  // Every face by its id, and the cap, the box and what it holds under their own names.
  boxes: Record<string, { left: number; top: number; width: number; height: number; opacity: number }>;
}

export interface FacesPage {
  setFaces: (ids: string[]) => void;
  setWords: (words: string) => void;
  setSize: (size: FaceSize) => void;
  record: () => void;
  // The frames written down since the last record, once nothing moves or is running any more.
  settled: () => Promise<FacesSeen[]>;
}

declare global {
  interface Window {
    faces: FacesPage;
  }
}

// The most faces the row draws before it counts the rest.
export const MOST = 3;

// The group's props reach the library's avatar props, whose types are too deep for the render
// function's overloads to work through, so the group is handed to it as any component.
const Group = AvatarGroup as Component;

function face(id: string): AvatarFace {
  return { id, avatar: { alt: id.toUpperCase() } };
}

const faces = ref<AvatarFace[]>(["a", "b"].map(face));
const words = ref("Writing");
const size = ref<FaceSize>("md");

const Page = defineComponent(() => () =>
  h("div", { style: "padding:16px", "data-page": "" }, [
    h(UnfoldingBox, { class: "rounded-full bg-neutral-900", "data-box": "box" }, () =>
      h("div", { class: "flex items-center gap-2 py-1 px-2", "data-box": "held" }, [
        h(Group, { faces: faces.value, max: MOST, size: size.value, ui: { ground: "bg-neutral-900" } }),
        h("span", { class: "text-sm text-white", "data-box": "words" }, words.value)
      ])
    )
  ])
);

const style = document.createElement("style");

style.textContent = sheet;
document.head.append(style);

// The library's build answers its own app configuration, which holds none of the layer's settings;
// the locale counts are written in is set on it as a host's configuration sets it.
Object.assign(useAppConfig(), { bmoUi: { locale: "en" } });

createApp(Page)
  .use(createI18n({ legacy: false, locale: "en", messages: { en: { common: { aria: { others_count: "{n} others" } } } }, missingWarn: false, fallbackWarn: false }))
  .use(ui)
  .mount("#page");

let frames: FacesSeen[] = [];
let recording = false;
// Called with each frame as it is written down, while a settle is waited for.
let onFrame: (() => void) | null = null;

// Once the next frame is drawn: a frame is laid out again after its animation callbacks, where the
// box takes the size its content measured, so it is read in a task after them rather than in them.
function drawn(then: () => void): void {
  requestAnimationFrame(() => setTimeout(then, 0));
}

function look(frame: number): void {
  const boxes: FacesSeen["boxes"] = {};
  const named = (key: string, element: Element): void => {
    const rect = element.getBoundingClientRect();

    boxes[key] = { left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height), opacity: Number(getComputedStyle(element).opacity) };
  };

  for (const element of document.querySelectorAll<HTMLElement>("[data-box]")) named(element.dataset.box!, element);
  // A face is named by the letter its avatar draws, its id written large.
  for (const element of document.querySelectorAll("[data-face]")) named(element.textContent!.trim().toLowerCase(), element);
  for (const element of document.querySelectorAll("[data-face-cap]")) named("cap", element);

  frames.push({ frame, boxes });
  onFrame?.();

  if (recording) drawn(() => look(frame + 1));
}

window.faces = {
  setFaces: (ids) => {
    faces.value = ids.map(face);
  },
  setWords: (given) => {
    words.value = given;
  },
  setSize: (given) => {
    size.value = given;
  },
  record: () => {
    frames = [];
    recording = true;
    drawn(() => look(0));
  },
  settled: () =>
    new Promise((resolve) => {
      // A movement begins a frame or two after the change, so it is waited for, or for long enough
      // that one would have begun; then nothing running on the page any more, and the last frames all
      // alike. It is judged as each frame is written down, so the last frame written is what the page
      // stands at.
      const page = document.querySelector("[data-page]")!;
      let began = false;
      const still = (): boolean => {
        // An item that comes or goes keeps its list's classes until the list has let it go.
        const running = page.getAnimations({ subtree: true }).length > 0 || page.querySelector(".bmo-list-enter-active, .bmo-list-leave-active") !== null;
        const last = frames.slice(-3).map((one) => JSON.stringify(one.boxes));

        began ||= running;

        return (began || frames.length > 30) && !running && last.length === 3 && new Set(last).size === 1;
      };

      onFrame = () => {
        if (still() || frames.length > 600) {
          recording = false;
          onFrame = null;
          resolve(frames);
        }
      };
    })
};
