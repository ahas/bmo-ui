import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, nextTick, onScopeDispose, ref, watch } from "vue";
import { createI18n } from "vue-i18n";

import UApp from "@nuxt/ui/components/App.vue";

import VideoPlayer from "../../app/components/VideoPlayer.vue";
import { watchInputModality } from "../../app/domain/modality";
import { watchOverlays } from "../../app/domain/overlays";
import { TOOLTIP_PROVIDER } from "../../app/domain/tooltip";
import sheet from "./video-harness.css?inline";

import type { Ref } from "vue";

// The video player (`docs/components.md`, "The video player") on a page that says nothing else, in the size the
// page's address names. As a still it stands in four message bubbles — a wide video and a tall one whose shapes
// the page knows, one whose shape only its file says, and one whose file refuses — beside a sound already playing;
// full, it fills a stage of a video's own shape,
// with a switch of the page's own in its bar and a way to hand it the next video. Every media element's clock, length, shape and playing are the
// page's own, so nothing is fetched and nothing is played: a picture's file answers its metadata the moment it
// stands, the refusing one excepted, and what the player tells its host is written down where the test reads it.
// The page stands outside Nuxt, so it wires itself as a host's page is wired: the library's app root holding the
// boundary's tooltip setting, the overlays the back gesture closes, and the words handed over here.

const states = new Map<string, Ref<unknown>>();

Object.assign(globalThis, {
  watch,
  nextTick,
  onScopeDispose,
  useState: (key: string, start: () => unknown) => {
    if (!states.has(key)) states.set(key, ref(start()));

    return states.get(key);
  },
  useRouter: () => ({ options: {}, beforeEach: () => undefined })
});

const WORDS = {
  common: {
    action: {
      close: "Close",
      more: "More",
      exit_fullscreen: "Exit full screen",
      fullscreen: "Full screen",
      mute: "Mute",
      pause: "Pause",
      play: "Play",
      skip_back: "Back {n} seconds",
      skip_forward: "Forward {n} seconds",
      subtitles: "Subtitles",
      turn_picture: "Turn the picture",
      unmute: "Unmute"
    },
    aria: { play_named: "Play {name}", player_named: "{name} player", speed_named: "Playback speed {speed}" },
    error: { video_failed: "The video could not be played" },
    label: { play_position: "Playback position", speed_normal: "{speed} normal", subtitles_off: "Off", volume: "Volume" },
    status: {
      brightness: "Brightness {n}%",
      muted: "Muted",
      speed: "Speed {speed}",
      subtitles_off: "Subtitles off",
      subtitles_on: "Subtitles {name}",
      turned: "Turned to {degrees} degrees",
      unmuted: "Unmuted",
      volume: "Volume {n}%",
      went_back: "Back {n} seconds",
      went_forward: "Forward {n} seconds"
    }
  }
};

/** The length every media element on the page says it has, in seconds. */
const LENGTH_SECONDS = 100;

/** The shape every video file on the page says it has. */
const FILE_SHAPE = { width: 1280, height: 720 };

export interface VideoCall {
  name: string;
  args: unknown[];
}

declare global {
  interface Window {
    videoCalls: VideoCall[];
    /** Hands the standing full player the next video, as a host going on to it does. */
    handOn: () => void;
  }
}

window.videoCalls = [];

// What one media element holds in place of a file: its clock, its rate and whether it plays.
interface Held {
  time: number;
  rate: number;
  paused: boolean;
}

const held = new WeakMap<HTMLMediaElement, Held>();

function heldBy(element: HTMLMediaElement): Held {
  let one = held.get(element);

  if (one === undefined) {
    one = { time: 0, rate: 1, paused: true };
    held.set(element, one);
  }

  return one;
}

const media = HTMLMediaElement.prototype;

Object.defineProperty(media, "duration", { configurable: true, get: () => LENGTH_SECONDS });
Object.defineProperty(media, "ended", { configurable: true, get: () => false });
Object.defineProperty(media, "paused", {
  configurable: true,
  get(this: HTMLMediaElement) {
    return heldBy(this).paused;
  }
});
Object.defineProperty(media, "currentTime", {
  configurable: true,
  get(this: HTMLMediaElement) {
    return heldBy(this).time;
  },
  set(this: HTMLMediaElement, seconds: number) {
    heldBy(this).time = seconds;
  }
});
Object.defineProperty(media, "playbackRate", {
  configurable: true,
  get(this: HTMLMediaElement) {
    return heldBy(this).rate;
  },
  set(this: HTMLMediaElement, rate: number) {
    heldBy(this).rate = rate;
  }
});
Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, get: () => FILE_SHAPE.width });
Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, get: () => FILE_SHAPE.height });

media.play = function play(this: HTMLMediaElement): Promise<void> {
  if (heldBy(this).paused) {
    heldBy(this).paused = false;
    this.dispatchEvent(new Event("play"));
    this.dispatchEvent(new Event("playing"));
  }

  return Promise.resolve();
};

media.pause = function pause(this: HTMLMediaElement): void {
  if (!heldBy(this).paused) {
    heldBy(this).paused = true;
    this.dispatchEvent(new Event("pause"));
  }
};

// The browser's own attempt at an address nothing answers is not the page's failure, so it never reaches the player;
// only the bubble standing for a broken file lets it through.
const BROKEN = "[data-bubble='broken']";

window.addEventListener(
  "error",
  (event) => {
    if (event.target instanceof HTMLMediaElement && event.target.closest(BROKEN) === null) event.stopImmediatePropagation();
  },
  true
);

// A video answers its metadata the moment it stands on the page, its listeners already bound.
new MutationObserver((changes) => {
  for (const change of changes) {
    for (const node of change.addedNodes) {
      const videos = node instanceof HTMLVideoElement ? [node] : node instanceof Element ? Array.from(node.querySelectorAll("video")) : [];

      for (const video of videos) if (video.closest(BROKEN) === null) video.dispatchEvent(new Event("loadedmetadata"));
    }
  }
}).observe(document.body, { childList: true, subtree: true });

function called(name: string, ...args: unknown[]): void {
  window.videoCalls.push({ name, args });
}

// A message bubble as a host draws one: a box of the large tier's corners that cuts what stands in it, the
// caption under the video in the bubble's inner room.
function bubble(name: string, shape: { width: number; height: number } | null): ReturnType<typeof h> {
  return h("div", { "data-bubble": name, class: "w-fit max-w-80 overflow-hidden rounded-lg bg-elevated" }, [
    h(VideoPlayer, { size: "still", src: `/videos/${name}.mp4`, title: `${name}.mp4`, shape, onPosition: (...args: unknown[]) => called("position", ...args) }),
    h("p", { "data-caption": "", class: "px-3 py-2 text-sm" }, "A walk by the sea")
  ]);
}

const still = new URLSearchParams(window.location.search).get("size") === "still";

const Page = defineComponent(() => {
  const track = ref<number | null>(null);
  // The video the full player stands for: the walk, and the harbour once the page hands it on.
  const shown = ref({ video: 7, src: "/videos/walk.mp4", title: "walk.mp4" });
  // A switch of the page's own in the player's bar, which names what a press does now.
  const wide = ref(false);

  window.handOn = () => {
    shown.value = { video: 8, src: "/videos/harbour.mp4", title: "harbour.mp4" };
  };

  return () =>
    h(UApp, { tooltip: TOOLTIP_PROVIDER }, () =>
      still
        ? h("div", { class: "flex flex-col items-start gap-4 p-4" }, [
            h("audio", { "data-player": "", "data-sound": "" }),
            bubble("wide", { width: 1280, height: 720 }),
            bubble("tall", { width: 720, height: 1280 }),
            bubble("unknown", null),
            bubble("broken", { width: 1280, height: 720 })
          ])
        : h("div", { "data-stage": "", class: "aspect-video w-full max-w-3xl" }, [
            h(VideoPlayer, {
              ...shown.value,
              next: "harbour.mp4",
              controls: [
                {
                  id: "wide",
                  label: wide.value ? "Narrow view" : "Wide view",
                  icon: wide.value ? "i-material-symbols-width-normal-outline" : "i-material-symbols-width-wide-outline",
                  key: "t",
                  onSelect: () => {
                    wide.value = !wide.value;
                    called("control", "wide");
                  }
                }
              ],
              tracks: [{ id: 1, src: "/videos/walk.en.vtt", label: "English", language: "en" }],
              track: track.value,
              "onUpdate:track": (value: number | null) => (track.value = value),
              onPosition: (...args: unknown[]) => called("position", ...args),
              onNext: () => called("next")
            })
          ])
    );
});

const style = document.createElement("style");

style.textContent = sheet;
document.head.append(style);

watchInputModality(document);
watchOverlays();

Object.assign(useAppConfig(), { bmoUi: { zone: "UTC" } });

createApp(Page)
  .use(createI18n({ legacy: false, locale: "en", messages: { en: WORDS }, missingWarn: false, fallbackWarn: false }))
  .use(ui)
  .mount("#page");
