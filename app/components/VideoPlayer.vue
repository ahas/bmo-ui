<template>
  <!-- A video, in one of two sizes (`docs/components.md`, "The video player").

       The full player: the browser's video, its subtitles laid over it as text tracks, and its own controls under
       it — play, ten-second skips, the next item, the volume, the subtitle and the speed, turning the picture, and
       full screen. A finger on the picture takes the player's gestures, its cue standing over the picture. It
       stands on a black ground of its own whatever the theme, so its words and marks are fixed light ones. The
       keys answer while it stands and nothing is open over it: space and k, the arrows, j and l, f, m, c and r.
       The host may stand controls of its own before full screen, each with the key that presses it. Escape and
       the back gesture leave full screen, and the player stays standing as its host hands it another video.
       Where the host asks for the next video to follow, a long video offers it on a card near its end.

       The still, the size a message holds: the first frame, a play mark over its middle and the length at its top
       corner, with no corners or edge of its own, so the box it stands in cuts it. Its shape stands from the first
       frame where the host knows it, no taller than the cap. A press opens the full player large, over the
       screen, playing. -->
  <template v-if="still">
    <button
      v-bind="$attrs"
      type="button"
      data-video-still
      class="group focus-inset relative block w-full cursor-pointer overflow-hidden bg-black text-white"
      :aria-label="$t('common.aria.play_named', { name: props.title })"
      :aria-busy="framing"
      @click.stop="large = true"
    >
      <video
        :key="props.src"
        :src="firstFrameOf(props.src)"
        :poster="props.poster ?? undefined"
        preload="metadata"
        playsinline
        muted
        tabindex="-1"
        aria-hidden="true"
        data-video-frame
        class="pointer-events-none mx-auto block max-w-full"
        :class="stillStyle === null ? 'max-h-80 w-auto' : 'h-auto object-contain'"
        :style="stillStyle ?? undefined"
        @loadedmetadata="onStillMetadata"
        @error="stillFailed = true"
      />
      <SkeletonBar v-if="framing" data-video-skeleton class="absolute inset-0 size-full rounded-none" />
      <p v-if="stillFailed" data-video-failed class="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-sm">{{ $t("common.error.video_failed") }}</p>
      <span
        v-else
        data-video-play
        aria-hidden="true"
        class="absolute inset-0 m-auto flex size-12 items-center justify-center rounded-md bg-black/60 transition-colors group-hover:bg-black/75 group-active:bg-black/90"
      >
        <UIcon name="i-material-symbols-play-arrow" class="size-8" />
      </span>
      <span v-if="length !== null" data-video-length aria-hidden="true" class="absolute start-1 top-1 rounded-sm bg-black/60 px-2 text-sm leading-5 tabular-nums">{{ playClock(length) }}</span>
    </button>

    <UModal v-model:open="large" :title="props.title" fullscreen :ui="{ body: 'flex min-h-0 flex-1 bg-black p-0 sm:p-0' }">
      <template #close="{ ui }">
        <ShellClose :class="ui.close({ class: 'static' })" @close="large = false" />
      </template>

      <template #body>
        <VideoPlayer
          v-model:track="track"
          :video="props.video"
          :src="props.src"
          :poster="props.poster"
          :title="props.title"
          :tracks="props.tracks"
          :start="props.start"
          :next="props.next"
          autoplay
          @position="(video, seconds) => emit('position', video, seconds)"
          @leaving="(video, seconds) => emit('leaving', video, seconds)"
          @ended="(video, seconds) => emit('ended', video, seconds)"
          @next="emit('next')"
        />
      </template>
    </UModal>
  </template>

  <div
    v-else
    ref="root"
    v-bind="$attrs"
    role="region"
    data-video-player
    :aria-label="$t('common.aria.player_named', { name: props.title })"
    class="video-player relative flex size-full items-center justify-center overflow-hidden bg-black text-white"
    :class="controlsShown ? '' : 'cursor-none'"
    @pointermove="wake"
    @pointerdown.capture="onPress"
    @focusin="wake"
  >
    <video
      ref="video"
      :key="props.src"
      data-player
      :src="props.src"
      :poster="props.poster ?? undefined"
      playsinline
      preload="metadata"
      class="video-picture size-full object-contain"
      :style="videoStyle"
      @click="onVideoPress"
      @dblclick="onVideoDoubleClick"
      @loadedmetadata="onMetadata"
      @timeupdate="onTime"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      @waiting="waiting = true"
      @playing="waiting = false"
      @canplay="waiting = false"
      @error="failed = true"
    >
      <track v-for="one in props.tracks" :key="one.id" kind="subtitles" :src="one.src" :srclang="one.language" :label="one.label" :data-track="one.id" @load="placeCues" />
    </video>

    <!-- Before the first play the picture stands with one large way to start. -->
    <IconButton
      v-if="!started && !failed"
      data-video-start
      :label="$t('common.action.play')"
      :portal="portal"
      icon="i-material-symbols-play-arrow"
      class="absolute inset-0 m-auto flex size-18 items-center justify-center bg-black/70 text-white hover:bg-black/85 hover:text-white active:bg-black"
      :ui="{ leadingIcon: 'size-12' }"
      @click="toggle"
    />

    <UIcon v-if="waiting && started && !failed" name="i-material-symbols-progress-activity" class="absolute inset-0 m-auto size-12 animate-spin motion-reduce:animate-none" aria-hidden="true" />

    <!-- What a finger on the picture is doing, over the picture. The live region under the player says the same
         once a gesture has ended, so this stands out of the reader's way. -->
    <Transition name="video-cue">
      <div v-if="cueView" data-video-cue class="pointer-events-none absolute inset-x-0 top-1/2 z-10 mx-auto flex w-fit max-w-[calc(100%-2rem)] -translate-y-1/2 items-center gap-2 rounded-lg bg-black/75 px-4 py-2 text-base text-white" aria-hidden="true">
        <UIcon :name="cueView.icon" class="size-6 shrink-0" />
        <span class="truncate tabular-nums">{{ cueView.text }}</span>
      </div>
    </Transition>

    <p v-if="failed" role="alert" class="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-base">{{ $t("common.error.video_failed") }}</p>

    <!-- The next video, offered near the end of a long one: what it is, the seconds left turning down, and a way
         to play it now or to stay. It stands in the picture's top trailing corner, clear of the controls and of
         the subtitles at the foot. -->
    <div
      v-if="nextCard"
      data-video-next
      class="absolute end-3 top-3 z-10 flex w-[min(20rem,calc(100%-1.5rem))] flex-col gap-2 rounded-lg bg-black/90 p-3 text-white"
    >
      <p class="flex flex-col gap-1">
        <RollingSentence keypath="common.status.next_in" :figures="{ n: secondsLeft }" class="text-sm text-white/80 tabular-nums" />
        <span class="truncate text-base font-medium">{{ props.next }}</span>
      </p>
      <div class="flex items-center justify-end gap-2">
        <UButton data-video-next-cancel size="sm" color="neutral" variant="ghost" class="text-white hover:bg-white/15 hover:text-white active:bg-white/25" :label="$t('common.action.cancel')" @click="dismissNext" />
        <UButton data-video-next-now size="sm" class="badge-ink" icon="i-material-symbols-skip-next" :label="$t('common.action.play_now')" @click="emit('next')" />
      </div>
    </div>

    <div
      data-video-controls
      class="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-black/75 px-2 pt-1 pb-[max(0.25rem,var(--bmo-safe-bottom,0px))] transition-opacity sm:px-3"
      :class="controlsShown ? 'opacity-100' : 'pointer-events-none opacity-0'"
      :aria-hidden="controlsShown ? undefined : 'true'"
    >
      <div class="flex items-center gap-3 px-1 text-sm tabular-nums">
        <USlider
          :model-value="current"
          :min="0"
          :max="Math.max(1, length ?? 1)"
          :step="1"
          size="sm"
          class="video-seek min-w-0 flex-1"
          :ui="{ thumb: THUMB }"
          :aria-label="$t('common.label.play_position')"
          :aria-valuetext="`${playClock(current)} / ${playClock(length ?? 0)}`"
          aria-keyshortcuts="ArrowLeft ArrowRight"
          :disabled="length === null"
          @update:model-value="seek"
        />
        <span data-video-clock class="shrink-0 text-white">{{ playClock(current) }} / {{ playClock(length ?? 0) }}</span>
      </div>

      <div class="flex min-w-0 items-center gap-1">
        <IconButton
          data-video-toggle
          :icon="playing ? 'i-material-symbols-pause' : 'i-material-symbols-play-arrow'"
          v-bind="BUTTON"
          :portal="portal"
          :label="$t(playing ? 'common.action.pause' : 'common.action.play')"
          :kbds="['space']"
          @click="toggle"
        />
        <IconButton icon="i-material-symbols-replay-10" v-bind="BUTTON" :portal="portal" :label="$t('common.action.skip_back', { n: SKIP_SECONDS })" :kbds="['j']" @click="skip(-SKIP_SECONDS)" />
        <IconButton icon="i-material-symbols-forward-10" v-bind="BUTTON" :portal="portal" :label="$t('common.action.skip_forward', { n: SKIP_SECONDS })" :kbds="['l']" @click="skip(SKIP_SECONDS)" />
        <IconButton v-if="props.next" icon="i-material-symbols-skip-next" v-bind="BUTTON" :portal="portal" :label="props.next" @click="emit('next')" />
        <IconButton
          :icon="muteIcon"
          v-bind="BUTTON"
          :portal="portal"
          :label="$t(volume.loudness.value.muted ? 'common.action.unmute' : 'common.action.mute')"
          :kbds="['m']"
          @click="volume.toggleMute()"
        />
        <USlider
          v-if="!gathers"
          :model-value="volume.heard.value * 100"
          :min="0"
          :max="100"
          :step="5"
          size="sm"
          class="video-seek w-24 shrink-0"
          :ui="{ thumb: THUMB }"
          :aria-label="$t('common.label.volume')"
          aria-keyshortcuts="ArrowUp ArrowDown"
          @update:model-value="(level) => volume.slide((Number(level) || 0) / 100)"
        />

        <span class="flex-1" />

        <UDropdownMenu v-if="gathers" :modal="false" :ui="{ item: 'pointer-coarse:min-h-11' }" :items="moreItems" :content="{ align: 'end', side: 'top' }" :portal="portal">
          <IconButton data-video-more icon="i-material-symbols-more-vert" v-bind="BUTTON" :portal="portal" :label="$t('common.action.more')" />
        </UDropdownMenu>
        <UDropdownMenu v-if="!gathers && props.tracks.length" :modal="false" :ui="{ item: 'pointer-coarse:min-h-11' }" :items="trackItems" :content="{ align: 'end', side: 'top' }" :portal="portal">
          <IconButton
            :icon="track === null ? 'i-material-symbols-subtitles-off-outline' : 'i-material-symbols-subtitles'"
            v-bind="BUTTON"
            :portal="portal"
            :label="$t('common.action.subtitles')"
            :kbds="['c']"
          />
        </UDropdownMenu>
        <UDropdownMenu v-if="!gathers" :modal="false" :ui="{ item: 'pointer-coarse:min-h-11' }" :items="speedItems" :content="{ align: 'end', side: 'top' }" :portal="portal">
          <IconButton icon="i-material-symbols-speed-outline" v-bind="BUTTON" :portal="portal" :label="$t('common.aria.speed_named', { speed: speedText(speed) })" />
        </UDropdownMenu>
        <IconButton v-if="!gathers" icon="i-material-symbols-screen-rotation-outline" v-bind="BUTTON" :portal="portal" :label="$t('common.action.turn_picture')" :kbds="['r']" @click="turn" />
        <template v-if="!gathers">
          <IconButton
            v-for="one in props.controls"
            :key="one.id"
            :data-video-control="one.id"
            :icon="one.icon"
            v-bind="BUTTON"
            :portal="portal"
            :label="one.label"
            :kbds="one.key ? [one.key] : undefined"
            @click="one.onSelect()"
          />
        </template>
        <IconButton
          data-video-fullscreen
          :icon="fullscreen ? 'i-material-symbols-fullscreen-exit' : 'i-material-symbols-fullscreen'"
          v-bind="BUTTON"
          :portal="portal"
          :label="$t(fullscreen ? 'common.action.exit_fullscreen' : 'common.action.fullscreen')"
          :kbds="['f']"
          @click="toggleFullscreen"
        />
      </div>
    </div>

    <!-- What a key or a press changed, said once it has changed. -->
    <p class="sr-only" aria-live="polite" aria-atomic="true" data-video-said>{{ announced }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import { useBarGathers } from "../domain/actionbar";
import { knownLength, playAlone, playClock } from "../domain/player";
import { useNarrow } from "../domain/screen";
import { closeLayer, listenForBack, openLayer } from "../domain/layers";
import { CONTROLS_IDLE_MS, CUE_LINE_OVER_CONTROLS, NUDGE_SECONDS, SAVE_EVERY_MS, SKIP_SECONDS, SPEEDS, VOLUME_STEP, firstFrameOf, hostControlFor, keyAction, nextCardLead, nextTurn, otherOrientation, skipTo, speedText, steppedVolume, stillBox, toggledTrack, turnedBox } from "../domain/video";
import { overlayOpen, usePlayerGestures } from "../domain/video-gestures";
import { useVolume } from "../domain/volume";

import type { PlayerControl, PlayerTrack, VideoShape } from "../domain/video";
import type { PlayerCue } from "../domain/video-gestures";

import type { DropdownMenuItem } from "@nuxt/ui";

interface Props {
  /** What the video is to its host, handed back with everything the player tells of it. */
  video?: number | string;
  src: string;
  poster?: string | null;
  /** The video's name, which the player is named by. */
  title: string;
  tracks?: PlayerTrack[];
  /** Where it starts, in seconds. */
  start?: number;
  /** Whether it starts as soon as it can, as the next of a playlist does. */
  autoplay?: boolean;
  /** The next video's words, where there is one to go on to. */
  next?: string | null;
  /** Whether the next video follows on its own: offered on a card near the end of a long video, asked for as it ends. */
  autoNext?: boolean;
  /** The full player, or the still a message holds, which opens the full player large. Chosen once. */
  size?: "full" | "still";
  /** The video's shape where the host knows it before the file answers, so the still stands in it from the start. */
  shape?: VideoShape | null;
  /** The host's own controls, standing in the bar after turning the picture and before full screen. */
  controls?: PlayerControl[];
}

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<Props>(), { video: 0, poster: null, tracks: () => [], start: 0, autoplay: false, next: null, autoNext: false, size: "full", shape: null, controls: () => [] });

const emit = defineEmits<{
  /**
   * Where the video stands, every few seconds while it plays, as it pauses and as the player is left, named by the
   * `video` this player stands for, since the screen may already have moved on to another as it is left.
   */
  position: [video: number | string, seconds: number];
  /** The same as the page itself goes away, when only a call that outlives the page lands. */
  leaving: [video: number | string, seconds: number];
  ended: [video: number | string, seconds: number];
  next: [];
}>();

/** The subtitle shown, or none. */
const track = defineModel<number | null>("track", { default: null });

const still = props.size === "still";

// The control buttons stand on the player's own black ground in its fixed light words, a square a finger aims
// at on a touch screen.
const BUTTON = {
  class: "text-white hover:bg-white/15 active:bg-white/25 hover:text-white pointer-coarse:size-11 pointer-coarse:justify-center"
} as const;

// A slider's thumb is aimed at over a reach a finger has, wider than the mark it draws.
const THUMB = "relative after:absolute after:-inset-4";

const rootRef = useTemplateRef<HTMLDivElement>("root");
const videoRef = useTemplateRef<HTMLVideoElement>("video");

const { t } = useI18n();
const narrow = useNarrow();
const volume = useVolume();
// A player short of room for its whole bar keeps the volume slider off it and gathers the subtitles, the speed and
// turning into one more menu, by the room the player itself has.
const gathers = useBarGathers(() => rootRef.value);

const announced = ref("");
const current = ref(0);
const length = ref<number | null>(null);
const speed = ref(1);
const remembered = ref<number | null>(null);
const playing = ref(false);
const started = ref(false);
const waiting = ref(false);
const failed = ref(false);
const awake = ref(true);
const fullscreen = ref(false);
const brightness = ref(1);
const cue = ref<PlayerCue | null>(null);
// Whether the still has opened the full player over the screen.
const large = ref(false);
// The shape the still's file said, where the host did not know it.
const fileShape = ref<VideoShape | null>(null);
// Whether the still's file has said what it is, or refused to.
const stillRead = ref(false);
const stillFailed = ref(false);
// The still's picture keeps its place as a skeleton until its file first answers.
const framing = computed(() => !stillRead.value && !stillFailed.value);
// Where a touch last landed, so the browser's own double-click after two taps opens no full screen.
let lastTouchAt = Number.NEGATIVE_INFINITY;

const stillStyle = computed(() => stillBox(props.shape ?? fileShape.value));
// Whether the reader sent the card offering the next video away; moving back before its moment brings it again.
const nextDismissed = ref(false);
// How long before the end the next video is offered, where it follows on its own and the video is long enough.
const nextLead = computed(() => (props.autoNext && props.next ? nextCardLead(length.value) : null));
const secondsLeft = computed(() => Math.max(0, Math.ceil((length.value ?? 0) - current.value)));
const nextCard = computed(() => nextLead.value !== null && started.value && !failed.value && !nextDismissed.value && secondsLeft.value > 0 && secondsLeft.value <= nextLead.value);
// A menu or a tooltip opened in full screen stands inside the player, which is all the browser shows.
const portal = computed(() => (fullscreen.value ? (rootRef.value ?? true) : true));
const controlsShown = computed(() => !playing.value || awake.value || failed.value);
const muteIcon = computed(() => (volume.heard.value === 0 ? "i-material-symbols-volume-off" : volume.heard.value < 0.5 ? "i-material-symbols-volume-down" : "i-material-symbols-volume-up"));

// What the cue over the picture says of the gesture under the finger, and the mark that names it.
const cueView = computed<{ icon: string; text: string } | null>(() => {
  const shown = cue.value;

  if (shown === null) return null;

  if (shown.kind === "seek") {
    const forward = shown.by !== null ? shown.by >= 0 : shown.seconds >= shown.from;
    const byTap = shown.by !== null;

    return {
      icon: byTap ? (forward ? "i-material-symbols-forward-10" : "i-material-symbols-replay-10") : forward ? "i-material-symbols-fast-forward" : "i-material-symbols-fast-rewind",
      text: byTap ? t(forward ? "common.status.went_forward" : "common.status.went_back", { n: String(Math.abs(shown.by ?? 0)) }) : `${playClock(shown.seconds)} / ${playClock(shown.length ?? 0)}`
    };
  }

  if (shown.kind === "hold") return { icon: "i-material-symbols-fast-forward", text: t("common.status.speed", { speed: speedText(shown.speed) }) };

  if (shown.kind === "brightness") return { icon: "i-material-symbols-light-mode", text: t("common.status.brightness", { n: String(Math.round(shown.level * 100)) }) };

  return {
    icon: shown.level === 0 ? "i-material-symbols-volume-off" : shown.level < 0.5 ? "i-material-symbols-volume-down" : "i-material-symbols-volume-up",
    text: t("common.status.volume", { n: String(Math.round(shown.level * 100)) })
  };
});

const trackItems = computed<DropdownMenuItem[]>(() => [
  { label: t("common.label.subtitles_off"), type: "checkbox", checked: track.value === null, onSelect: () => chooseTrack(null) },
  ...props.tracks.map((one) => ({ label: one.label, type: "checkbox" as const, checked: track.value === one.id, onSelect: () => chooseTrack(one.id) }))
]);

const speedItems = computed<DropdownMenuItem[]>(() =>
  SPEEDS.map((one) => ({ label: one === 1 ? t("common.label.speed_normal", { speed: speedText(one) }) : speedText(one), type: "checkbox" as const, checked: speed.value === one, onSelect: () => setSpeed(one) }))
);

const moreItems = computed<DropdownMenuItem[]>(() => [
  ...(props.tracks.length ? [{ label: t("common.action.subtitles"), icon: track.value === null ? "i-material-symbols-subtitles-off-outline" : "i-material-symbols-subtitles", children: trackItems.value }] : []),
  { label: t("common.aria.speed_named", { speed: speedText(speed.value) }), icon: "i-material-symbols-speed-outline", children: speedItems.value },
  { label: t("common.action.turn_picture"), icon: "i-material-symbols-screen-rotation-outline", onSelect: () => void turn() },
  ...props.controls.map((one) => ({ label: one.label, icon: one.icon, ...(one.key ? { kbds: [one.key] } : {}), onSelect: () => one.onSelect() }))
]);

// The still learns its length, and its shape where the host did not give one, from what the file says first.
function onStillMetadata(event: Event): void {
  const element = event.target as HTMLVideoElement;

  stillRead.value = true;
  length.value = knownLength(element.duration);

  if (element.videoWidth > 0 && element.videoHeight > 0) fileShape.value = { width: element.videoWidth, height: element.videoHeight };
}

watch(
  () => volume.heard.value,
  (heard) => {
    const element = videoRef.value;

    if (element) {
      element.volume = volume.loudness.value.level;
      element.muted = heard === 0;
    }
  }
);

watch(track, () => showTrack());

watch(current, (now) => {
  if (nextLead.value !== null && length.value !== null && length.value - now > nextLead.value) nextDismissed.value = false;
});

watch(nextCard, (shown) => {
  if (shown && props.next) say(props.next);
});

function dismissNext(): void {
  nextDismissed.value = true;
}

watch(controlsShown, () => placeCues());

// Another video handed to the standing player: the one it leaves is told where it stood, named by what it was to the
// host, before the player starts over on the new one; full screen, the volume and the speed stay as they are.
watch(
  () => [props.src, props.video] as const,
  (_now, [, left]) => {
    if (started.value) emit("position", left, videoRef.value?.currentTime ?? current.value);

    stopSaving();
    playing.value = false;
    waiting.value = false;
    started.value = false;
    failed.value = false;
    current.value = 0;
    length.value = null;
    nextDismissed.value = false;
    fileShape.value = null;
    stillRead.value = false;
    stillFailed.value = false;
    brightness.value = 1;
    cue.value = null;
  }
);

function say(words: string): void {
  announced.value = words;
}

function showTrack(): void {
  const element = videoRef.value;

  if (!element) return;

  for (const node of element.querySelectorAll("track")) node.track.mode = Number(node.dataset.track) === track.value ? "showing" : "disabled";
}

// The subtitles stand above the controls while the controls stand, and at the foot of the picture once they go.
function placeCues(): void {
  const element = videoRef.value;

  if (!element) return;

  const line = controlsShown.value ? CUE_LINE_OVER_CONTROLS : "auto";

  for (const node of element.querySelectorAll("track")) for (const one of Array.from(node.track.cues ?? [])) (one as VTTCue).line = line;
}

function chooseTrack(id: number | null): void {
  if (track.value !== null) remembered.value = track.value;

  track.value = id;

  const chosen = props.tracks.find((one) => one.id === id);

  say(chosen ? t("common.status.subtitles_on", { name: chosen.label }) : t("common.status.subtitles_off"));
}

function setSpeed(value: number): void {
  speed.value = value;
  if (videoRef.value) videoRef.value.playbackRate = value;
  say(t("common.status.speed", { speed: speedText(value) }));
}

let idle: ReturnType<typeof setTimeout> | null = null;
let hiddenAtPress = false;

function wake(): void {
  awake.value = true;

  if (idle !== null) clearTimeout(idle);

  idle = setTimeout(() => {
    idle = null;
    // The controls stay while a control holds the keyboard's focus.
    if (!rootRef.value?.querySelector(":focus-visible")) awake.value = false;
  }, CONTROLS_IDLE_MS);
}

function toggle(): void {
  const element = videoRef.value;

  if (!element) return;

  if (element.paused) void element.play().catch(() => undefined);
  else element.pause();
}

// A press is read before it brings the controls, so what it finds is whether they were standing. It is read as the
// press comes down through the player, ahead of the picture's gesture reader, which brings the controls itself.
function onPress(event: PointerEvent): void {
  hiddenAtPress = !controlsShown.value;

  if (event.pointerType === "touch") lastTouchAt = performance.now();

  wake();
}

// A press on the picture plays or pauses with a mouse. A finger's tap is read by the gesture reader, which shows
// or hides the controls once it knows the tap was not the first of a double tap.
function onVideoPress(event: MouseEvent): void {
  if ((event as PointerEvent).pointerType === "touch") return;

  toggle();
}

// A touch screen raises a double click of its own after two taps, which is the gesture's and not full screen's.
function onVideoDoubleClick(): void {
  if (performance.now() - lastTouchAt < 1_000) return;

  void toggleFullscreen();
}

// What a finished gesture says to a reader who cannot see the cue.
function announceGesture(settled: PlayerCue): void {
  if (settled.kind === "seek") {
    if (settled.by !== null) say(t(settled.by < 0 ? "common.status.went_back" : "common.status.went_forward", { n: String(Math.abs(settled.by)) }));
    else say(`${playClock(settled.seconds)} / ${playClock(settled.length ?? 0)}`);

    return;
  }

  if (settled.kind === "hold") {
    say(t("common.status.speed", { speed: speedText(settled.speed) }));

    return;
  }

  say(t(settled.kind === "brightness" ? "common.status.brightness" : "common.status.volume", { n: String(Math.round(settled.level * 100)) }));
}

usePlayerGestures({
  surface: () => videoRef.value,
  length: () => length.value,
  speed: () => speed.value,
  volume: () => volume.heard.value,
  setVolume: (level) => volume.slide(level),
  brightness: () => brightness.value,
  setBrightness: (level) => {
    brightness.value = level;
  },
  onTime: (seconds) => {
    current.value = seconds;
  },
  onCue: (next) => {
    cue.value = next;
  },
  onSettled: announceGesture,
  onTap: () => {
    if (!hiddenAtPress) awake.value = false;
  },
  wake,
  blocked: () => overlayOpen(document, rootRef.value)
});

function skip(by: number): void {
  const element = videoRef.value;

  if (!element) return;

  element.currentTime = skipTo(element.currentTime, by, length.value);
  current.value = element.currentTime;
  say(t(by < 0 ? "common.status.went_back" : "common.status.went_forward", { n: String(Math.abs(by)) }));
}

function seek(value: number | undefined): void {
  const element = videoRef.value;

  if (!element || value === undefined) return;

  element.currentTime = value;
  current.value = value;
}

// The picture's own quarter turns, and the player's size it is fitted to, where the screen's orientation cannot turn it.
const turned = ref(0);
const box = ref({ width: 0, height: 0 });
const turnedStyle = computed(() => turnedBox(turned.value, box.value.width, box.value.height));
// The picture as it stands: turned by its own quarter where the screen cannot turn it, and drawn at the brightness
// a finger on its left half last set.
const videoStyle = computed(() => ({ ...turnedStyle.value, filter: brightness.value === 1 ? undefined : `brightness(${brightness.value})` }));
let boxWatch: ResizeObserver | null = null;

function turnPicture(): void {
  const root = rootRef.value;

  if (root) box.value = { width: root.clientWidth, height: root.clientHeight };

  turned.value = nextTurn(turned.value);
  say(t("common.status.turned", { degrees: turned.value }));
}

// On a phone the screen turns: full screen first, since a browser locks the orientation only there. A browser that
// offers no lock, or refuses it, turns the picture itself.
async function turn(): Promise<void> {
  // A picture turned by its own quarter comes back at the next press on a phone, where it only ever goes on its side.
  if (narrow.value && turned.value !== 0) {
    turned.value = 0;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);

    return;
  }

  const orientation = screen.orientation as (ScreenOrientation & { lock?: (to: string) => Promise<void> }) | undefined;

  if (narrow.value && orientation?.lock) {
    try {
      if (!document.fullscreenElement) await rootRef.value?.requestFullscreen?.();
      await orientation.lock(otherOrientation(orientation.type));
      turned.value = 0;

      return;
    } catch {
      // Falls to turning the picture.
    }
  }

  turnPicture();
}

async function toggleFullscreen(): Promise<void> {
  const root = rootRef.value;
  const element = videoRef.value as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;

  if (!root) return;

  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (root.requestFullscreen) await root.requestFullscreen();
    else element?.webkitEnterFullscreen?.();
  } catch {
    // A browser that refuses full screen leaves the player where it stands.
  }
}

function onMetadata(): void {
  const element = videoRef.value;

  if (!element) return;

  length.value = knownLength(element.duration);
  element.playbackRate = speed.value;
  element.volume = volume.loudness.value.level;
  element.muted = volume.heard.value === 0;

  if (props.start > 0 && (length.value === null || props.start < length.value)) element.currentTime = props.start;

  current.value = element.currentTime;
  showTrack();

  if (props.autoplay) void element.play().catch(() => undefined);
}

function onTime(): void {
  current.value = videoRef.value?.currentTime ?? 0;
}

let saving: ReturnType<typeof setInterval> | null = null;

function stopSaving(): void {
  if (saving !== null) clearInterval(saving);

  saving = null;
}

function tell(): void {
  if (started.value) emit("position", props.video, videoRef.value?.currentTime ?? current.value);
}

// One thing plays at a time: the video that starts takes the sound from every other player on the page.
function onPlay(): void {
  const element = videoRef.value;

  if (element) playAlone(element, document.querySelectorAll<HTMLMediaElement>("[data-player]"));

  started.value = true;
  playing.value = true;
  wake();
  say(t("common.action.play"));
  stopSaving();
  saving = setInterval(tell, SAVE_EVERY_MS);
}

function onPause(): void {
  playing.value = false;
  stopSaving();
  if (!videoRef.value?.ended) say(t("common.action.pause"));
  tell();
}

function onEnded(): void {
  playing.value = false;
  stopSaving();
  emit("ended", props.video, length.value ?? current.value);

  // The next video follows where the host asked for it and the reader did not send its card away.
  if (props.autoNext && props.next && !nextDismissed.value) emit("next");
}

// Whether a key's target keeps the key for itself: a field, a control that reads the arrows, or a layer of its own
// that does not hold the player.
function keptBy(target: HTMLElement | null): boolean {
  const holder = target?.closest("input, textarea, select, [contenteditable], [role='slider'], [role='menu'], [role='dialog'], [role='listbox']");

  if (!holder) return false;

  return !(holder.matches("[role='dialog']") && rootRef.value !== null && holder.contains(rootRef.value));
}

function onKey(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

  const target = event.target as HTMLElement | null;

  // A key meant for a field, a control holding it, or something open over the player is left to that.
  if (keptBy(target) || overlayOpen(document, rootRef.value)) return;
  if ((event.key === " " || event.key === "Enter") && target?.closest("button, a")) return;

  // Escape leaves the player's full screen, as the browser's own does; anywhere else it is not the player's key.
  if (event.key === "Escape") {
    if (fullscreen.value) {
      event.preventDefault();
      void leaveFullscreen();
    }

    return;
  }

  const action = keyAction(event.key);

  if (action === null) {
    const control = hostControlFor(event.key, props.controls);

    if (control === null) return;

    event.preventDefault();
    wake();
    control.onSelect();

    return;
  }

  event.preventDefault();
  wake();

  switch (action) {
    case "toggle":
      toggle();
      break;
    case "back":
      skip(-SKIP_SECONDS);
      break;
    case "forward":
      skip(SKIP_SECONDS);
      break;
    case "nudge-back":
      skip(-NUDGE_SECONDS);
      break;
    case "nudge-forward":
      skip(NUDGE_SECONDS);
      break;
    case "louder":
    case "quieter": {
      const level = steppedVolume(volume.heard.value, action === "louder" ? VOLUME_STEP : -VOLUME_STEP);

      volume.slide(level);
      say(t("common.status.volume", { n: String(Math.round(level * 100)) }));
      break;
    }
    case "mute":
      volume.toggleMute();
      say(t(volume.loudness.value.muted ? "common.status.muted" : "common.status.unmuted"));
      break;
    case "fullscreen":
      void toggleFullscreen();
      break;
    case "turn":
      void turn();
      break;
    case "captions":
      if (!props.tracks.length) break;

      chooseTrack(toggledTrack(track.value, remembered.value, props.tracks));
      break;
  }
}

function freeOrientation(): void {
  try {
    (screen.orientation as (ScreenOrientation & { unlock?: () => void }) | undefined)?.unlock?.();
  } catch {
    // A browser that locked nothing has nothing to give back.
  }
}

function onFullscreen(): void {
  fullscreen.value = document.fullscreenElement !== null && document.fullscreenElement === rootRef.value;

  // Leaving full screen gives the orientation back.
  if (!document.fullscreenElement) {
    freeOrientation();
    turned.value = 0;
  }
}

// Full screen is a place the player has gone into, which the back gesture leaves as it closes any layer. Its layer
// stands at the address the player stood at as it went in; a host that moves to another address and hands the player
// the video there stands it again at the new one, so going back leaves full screen and stays where the host went.
let fullscreenLayer: number | null = null;

function standFullscreenLayer(): void {
  if (fullscreenLayer !== null) closeLayer(fullscreenLayer);

  listenForBack();
  fullscreenLayer = openLayer(() => void leaveFullscreen());
}

function dropFullscreenLayer(): void {
  if (fullscreenLayer !== null) closeLayer(fullscreenLayer);

  fullscreenLayer = null;
}

if (!still) {
  watch(fullscreen, (standing) => (standing ? standFullscreenLayer() : dropFullscreenLayer()));
  watch(
    () => props.src,
    () => {
      if (fullscreen.value) standFullscreenLayer();
    },
    { flush: "post" }
  );
}

async function leaveFullscreen(): Promise<void> {
  if (rootRef.value !== null && document.fullscreenElement === rootRef.value) await document.exitFullscreen().catch(() => undefined);
}

function onLeave(): void {
  if (started.value) emit("leaving", props.video, videoRef.value?.currentTime ?? current.value);
}

// The still holds no player of its own until it is opened, so only the full player listens to the page.
onMounted(() => {
  if (still) return;

  window.addEventListener("keydown", onKey);
  window.addEventListener("pagehide", onLeave);
  document.addEventListener("fullscreenchange", onFullscreen);
  boxWatch = new ResizeObserver(() => {
    const root = rootRef.value;

    if (root) box.value = { width: root.clientWidth, height: root.clientHeight };
  });
  if (rootRef.value) boxWatch.observe(rootRef.value);
});

onBeforeUnmount(() => {
  if (still) return;

  tell();
  stopSaving();
  window.removeEventListener("keydown", onKey);
  window.removeEventListener("pagehide", onLeave);
  document.removeEventListener("fullscreenchange", onFullscreen);
  dropFullscreenLayer();
  // Going back from a turned player leaves no lock and no full screen behind on the screen it goes to.
  freeOrientation();
  if (rootRef.value !== null && document.fullscreenElement === rootRef.value) void document.exitFullscreen().catch(() => undefined);
  boxWatch?.disconnect();

  if (idle !== null) clearTimeout(idle);
});
</script>

<style scoped>
/* The seek and volume bars stand on the player's own black ground: the done part in the accent and the rest in
   one dimmed light, meeting at a hard edge. */
.video-seek :deep([data-slot="track"]) {
  background-color: rgb(255 255 255 / 0.3);
}

/* A finger on the picture belongs to the player's gestures: the page under it neither scrolls nor selects, and the
   phone's own menu does not come up while a finger rests. */
.video-picture {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

/* The cue is a thing that comes and goes on its own, so it fades where it stands. */
.video-cue-enter-active,
.video-cue-leave-active {
  transition: opacity var(--bmo-motion-quick) var(--bmo-ease-move);
}

.video-cue-enter-from,
.video-cue-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .video-cue-enter-active,
  .video-cue-leave-active {
    transition: none;
  }
}

.video-player video::cue {
  font-size: 1.1em;
}
</style>
