<template>
  <!-- A kept sound (`docs/components.md`, "Skeletons and loading"): a round play and pause button
       at its leading edge and beside it, as one group, the sound's own waveform, which is its
       progress bar, running to the trailing edge over one meta line that ends in the volume and the
       download. It has no frame of its own and stands on whatever ground holds it. The browser's own
       player is never shown; the element under it plays the sound and nothing else. One sound or video
       plays at a time across the screen. -->
  <div ref="root" data-attachment role="group" :aria-label="props.name" class="flex min-w-0 items-center gap-3" @click.stop>
    <audio
      ref="element"
      data-player
      :src="props.src"
      preload="metadata"
      class="hidden"
      @loadstart="fetching = true"
      @loadedmetadata="measure"
      @durationchange="measure"
      @timeupdate="ticked"
      @play="started"
      @playing="playingNow"
      @waiting="hear('waiting')"
      @pause="hear('pause')"
      @ended="ended"
      @error="failed"
    />

    <!-- The aura stands behind the button, so only the ring of it past the button's edge shows. -->
    <span class="relative grid shrink-0 place-items-center">
      <span ref="aura" aria-hidden="true" class="audio-aura absolute inset-0 rounded-full" :data-on="playing ? '' : undefined" />
      <UTooltip :text="playing ? $t('common.action.pause') : $t('common.action.play')">
        <UButton
          :icon="playing ? 'i-material-symbols-pause-rounded' : 'i-material-symbols-play-arrow-rounded'"
          color="primary"
          size="xl"
          square
          class="relative rounded-full"
          :loading="button === 'starting'"
          :disabled="broken"
          :aria-label="playing ? $t('common.action.pause') : $t('common.action.play')"
          @click="toggle"
        />
      </UTooltip>
    </span>

    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <!-- The waveform is the bar that seeks. A drag on it is its own: a held finger there must not
           choose the row, and a tap on it must not open the row's menu. The bars stand dimmed, and the
           same bars in the accent lie over them, cut off at a hard edge at the place playing. -->
      <div
        ref="wave"
        role="slider"
        :tabindex="seekable ? 0 : -1"
        :aria-label="$t('common.label.play_position')"
        :aria-valuemin="0"
        :aria-valuemax="Math.round(length ?? 0)"
        :aria-valuenow="Math.round(shownAt)"
        :aria-valuetext="playClock(shownAt)"
        :aria-disabled="seekable ? undefined : 'true'"
        class="group relative flex h-6 min-w-0 touch-pan-y items-center justify-between"
        :class="[seekable ? 'cursor-pointer' : '', broken ? 'opacity-50' : '']"
        @pointerdown.stop="grab"
        @pointermove="drag"
        @pointerup="letGo"
        @pointercancel="dropped"
        @touchstart.stop
        @contextmenu.stop.prevent
        @keydown="stepped"
      >
        <span
          v-for="(bar, index) in bars"
          :key="index"
          class="w-0.5 shrink-0 rounded-full transition-colors"
          :class="seekable ? 'bg-primary/30 group-hover:bg-primary/50 group-active:bg-primary/50' : 'bg-primary/30'"
          :style="{ height: barHeight(bar) }"
        />
        <span ref="played" aria-hidden="true" class="audio-played pointer-events-none absolute inset-0 flex items-center justify-between">
          <span
            v-for="(bar, index) in bars"
            :key="index"
            class="w-0.5 shrink-0 rounded-full bg-primary"
            :style="{ height: barHeight(bar) }"
          />
        </span>
      </div>

      <!-- The meta line, with the volume and the download at its trailing end held to the line's own
           height, and past them the blank whatever stands over the player's foot asks to keep there. Its
           parts keep the meta line's own step, so a phone's narrowest player holds the place while it
           plays, the buttons and the time on one line; a clock longer still never breaks, and what
           follows it takes the line under. -->
      <div class="flex min-w-0 flex-wrap items-center gap-1 text-sm">
        <p v-if="broken" class="min-w-0 text-error">{{ $t("common.label.unplayable") }}</p>
        <p v-else class="flex min-w-0 items-center whitespace-nowrap text-muted tabular-nums">
          <template v-if="moved && length !== null">{{ playClock(shownAt) }} / {{ playClock(length) }}</template>
          <template v-else>
            <span v-if="length !== null">{{ playClock(length) }}</span>
            <ContentSkeleton v-else-if="fetching">
              <SkeletonBar class="h-4 w-10" />
            </ContentSkeleton>
            <span v-if="props.size !== null">{{ length !== null || fetching ? `, ${props.size}` : props.size }}</span>
          </template>
        </p>

        <!-- The buttons stand centred in a holder one line tall, so the line keeps its own height. The
             volume opens over the screen, a mute toggle and a slider in a popover on its button; it is
             the page's one volume, so moving it here moves every player. -->
        <span class="ms-auto flex h-5 items-center">
          <UPopover v-model:open="volumeOpen" :content="{ align: 'end' }">
            <UTooltip :text="$t('common.label.volume')">
              <UButton
                data-volume
                size="xs"
                color="neutral"
                :variant="volumeOpen ? 'soft' : 'ghost'"
                :icon="volumeIcon"
                :aria-label="$t('common.label.volume')"
              />
            </UTooltip>

            <template #content>
              <div class="flex items-center gap-2 p-2">
                <UTooltip :text="silent ? $t('common.action.unmute') : $t('common.action.mute')">
                  <UButton
                    size="sm"
                    color="neutral"
                    variant="ghost"
                    :icon="silent ? VOLUME_OFF_ICON : VOLUME_UP_ICON"
                    :aria-label="silent ? $t('common.action.unmute') : $t('common.action.mute')"
                    @click="volume.toggleMute()"
                  />
                </UTooltip>
                <USlider
                  class="w-32"
                  size="sm"
                  :min="0"
                  :max="100"
                  :step="VOLUME_STEP"
                  :model-value="Math.round(volume.heard.value * 100)"
                  :aria-label="$t('common.label.volume')"
                  @update:model-value="slideTo"
                />
              </div>
            </template>
          </UPopover>

          <UTooltip :text="$t('common.aria.download_named', { name: props.name })">
            <UButton
              :to="props.download"
              external
              download
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-material-symbols-download"
              :aria-label="$t('common.aria.download_named', { name: props.name })"
            />
          </UTooltip>
        </span>

        <span v-if="props.trailRoom !== null" data-trail-room class="shrink-0" :style="{ width: `${props.trailRoom}px` }" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { auraOf, AURA_STILL, buttonAfter, easedLoudness, knownLength, loudnessOf, playAlone, playClock } from "../domain/player";
import { useNarrow } from "../domain/screen";
import { TAP_FFT, tapOf } from "../domain/sound-tap";
import { useVolume } from "../domain/volume";
import { barCount, loudnessAt, waveBars, waveformOf } from "../domain/waveform";

import type { PlayerButton, PlayerSignal } from "../domain/player";
import type { Tap } from "../domain/sound-tap";

interface Props {
  // Where the sound is played from, and where it is taken to be saved.
  src: string;
  download: string;
  // The file's name: the player's accessible name, and said in the download's tooltip.
  name: string;
  // The stored size, already said the way the screen around the player says sizes.
  size: string | null;
  // Whether it starts the moment it stands, for a player spread by a press that asked to hear it.
  autoplay?: boolean;
  // How wide a blank the meta line keeps at its trailing end for whatever its holder lays over the
  // player's foot there, in pixels; null keeps none.
  trailRoom?: number | null;
}

const props = withDefaults(defineProps<Props>(), { autoplay: false, trailRoom: null });

// The waveform's measures: a bar and the gap after it, the tallest a bar stands, and the least, so
// silence still reads as a row.
const BAR_PX = 2;
const GAP_PX = 1;
const WAVE_HEIGHT_PX = 24;
const BAR_MIN_PX = 2;
// How far an arrow key moves the place, in seconds.
const KEY_STEP_S = 5;
// How far an arrow key moves the volume, in hundredths.
const VOLUME_STEP = 5;
// The volume button's icon says how loud the players play: off, low below half, or up.
const VOLUME_OFF_ICON = "i-material-symbols-volume-off-rounded";
const VOLUME_DOWN_ICON = "i-material-symbols-volume-down-rounded";
const VOLUME_UP_ICON = "i-material-symbols-volume-up-rounded";

const root = useTemplateRef<HTMLElement>("root");
const element = useTemplateRef<HTMLAudioElement>("element");
const wave = useTemplateRef<HTMLElement>("wave");
const played = useTemplateRef<HTMLElement>("played");
const aura = useTemplateRef<HTMLElement>("aura");

const button = ref<PlayerButton>("play");
// Where the clock stood when the sound was asked to start, so its running on says the sound is heard.
let startedFrom = 0;
const broken = ref(false);
const fetching = ref(false);
const position = ref(0);
const told = ref<number | null>(null);
// Where the waveform is being dragged to; the sound moves there once the drag lets go, so the clock
// follows the finger without the sound stuttering along behind it.
const scrub = ref<number | null>(null);
const peaks = ref<number[] | null>(null);
const decodedSeconds = ref<number | null>(null);
const count = ref(0);

const volume = useVolume();
const volumeOpen = ref(false);
const silent = computed<boolean>(() => volume.heard.value === 0);
const volumeIcon = computed<string>(() => {
  if (silent.value) {
    return VOLUME_OFF_ICON;
  }

  return volume.heard.value < 0.5 ? VOLUME_DOWN_ICON : VOLUME_UP_ICON;
});

// The slider answers one value, in hundredths, or none while it is let go of.
function slideTo(value: number | number[] | undefined): void {
  const level = Array.isArray(value) ? value[0] : value;

  if (level !== undefined) {
    volume.slide(level / 100);
  }
}

// The page's volume stands on the element as it mounts and whenever it moves.
function standVolume(): void {
  const audio = element.value;

  if (audio !== null) {
    audio.volume = volume.loudness.value.level;
    audio.muted = volume.loudness.value.muted;
  }
}

watch(volume.loudness, standVolume);

// Whether the sound is heard: the pause button stands, the aura rings and the accent follows it.
const playing = computed<boolean>(() => button.value === "pause");
// The length the file says, or the one its decoding found where it says none before it plays.
const length = computed<number | null>(() => told.value ?? decodedSeconds.value);
const shownAt = computed<number>(() => scrub.value ?? position.value);
// Whether the sound has left its start: from then the meta line says where it stands.
const moved = computed<boolean>(() => playing.value || shownAt.value > 0);
const bars = computed<number[]>(() => waveBars(peaks.value, count.value));
// Whether the waveform takes a press: only once the length it seeks across is known.
const seekable = computed<boolean>(() => length.value !== null && !broken.value);

function barHeight(bar: number): string {
  return `${Math.max(BAR_MIN_PX, Math.round(bar * WAVE_HEIGHT_PX))}px`;
}

function measure(): void {
  told.value = knownLength(element.value?.duration ?? Number.NaN);
  fetching.value = false;
}

function toggle(): void {
  const audio = element.value;

  if (audio === null) {
    return;
  }

  if (audio.paused) {
    startedFrom = audio.currentTime;
    hear("pressed");
    audio.play().catch(() => {
      hear("refused");
    });
  } else {
    audio.pause();
  }
}

function hear(signal: PlayerSignal): void {
  button.value = buttonAfter(button.value, signal);
}

function ticked(): void {
  const audio = element.value;

  position.value = audio?.currentTime ?? 0;

  if (audio !== null && !audio.paused && !audio.seeking && audio.currentTime > startedFrom) {
    hear("moved");
  }
}

// The tap is taken once the sound plays, since the copy of a sound that has not started carries
// nothing to read.
let tap: Tap | null = null;

function started(): void {
  if (button.value === "play") {
    startedFrom = element.value?.currentTime ?? 0;
  }

  hear("play");
  // Only the elements marked as players: a picture that loops as a video is never a sound to stop.
  playAlone(element.value!, document.querySelectorAll<HTMLMediaElement>("[data-player]"));
}

function playingNow(): void {
  hear("playing");
  tap ??= element.value === null ? null : tapOf(element.value);
}

function ended(): void {
  hear("ended");

  if (element.value !== null) {
    element.value.currentTime = 0;
  }

  position.value = 0;
}

function failed(): void {
  broken.value = true;
  fetching.value = false;
  hear("error");
}

function seekTo(seconds: number): void {
  const audio = element.value;

  if (audio === null || length.value === null) {
    return;
  }

  const at = Math.min(length.value, Math.max(0, seconds));

  audio.currentTime = at;
  position.value = at;
}

// Where along the waveform a pointer stands, as a place in the sound.
function placeOf(event: PointerEvent): number {
  const box = wave.value?.getBoundingClientRect();

  if (box === undefined || box.width === 0 || length.value === null) {
    return 0;
  }

  return Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)) * length.value;
}

function grab(event: PointerEvent): void {
  if (!seekable.value || event.button !== 0) {
    return;
  }

  wave.value?.setPointerCapture(event.pointerId);
  scrub.value = placeOf(event);
}

function drag(event: PointerEvent): void {
  if (scrub.value !== null) {
    scrub.value = placeOf(event);
  }
}

function letGo(): void {
  if (scrub.value !== null) {
    seekTo(scrub.value);
  }

  scrub.value = null;
}

function dropped(): void {
  scrub.value = null;
}

function stepped(event: KeyboardEvent): void {
  if (!seekable.value || length.value === null) {
    return;
  }

  const to: Record<string, number> = {
    ArrowRight: position.value + KEY_STEP_S,
    ArrowUp: position.value + KEY_STEP_S,
    ArrowLeft: position.value - KEY_STEP_S,
    ArrowDown: position.value - KEY_STEP_S,
    Home: 0,
    End: length.value
  };
  const place = to[event.key];

  if (place !== undefined) {
    event.preventDefault();
    seekTo(place);
  }
}

// The accent's reach along the waveform: where a drag stands, else where the element is. It is
// written on the played layer itself, since a share set through the template would draw every bar
// again at each frame.
function standPlayed(): void {
  const at = scrub.value ?? element.value?.currentTime ?? position.value;
  const share = length.value === null || length.value === 0 ? 0 : Math.min(1, Math.max(0, at / length.value));

  played.value?.style.setProperty("--played", String(share));
}

if (import.meta.client) {
  watch([shownAt, length], standPlayed, { flush: "post" });
}

// Each frame while the sound plays, the accent moves to the place playing and the aura takes the
// loudness heard — off the tapped sound, or the waveform at the place playing where the browser
// gives no tap — eased into the last. The accent says where the sound is, so it follows every
// reader's frames; a reader who asked for less movement is given a still ring.
const still = useNarrow("(prefers-reduced-motion: reduce)");
const samples = new Uint8Array(TAP_FFT);
let loudness = 0;
let frame: number | null = null;

function standAura(level: number | null): void {
  const ring = aura.value;

  if (ring === null) {
    return;
  }

  if (level === null) {
    ring.style.removeProperty("scale");
    ring.style.removeProperty("opacity");

    return;
  }

  const { scale, glow } = auraOf(level);

  ring.style.scale = String(scale);
  ring.style.opacity = String(glow);
}

function heard(): number {
  if (tap?.wave(samples) === true) {
    return loudnessOf(samples);
  }

  const audio = element.value;

  if (peaks.value !== null && audio !== null && length.value !== null) {
    return loudnessAt(peaks.value, audio.currentTime / length.value);
  }

  return AURA_STILL;
}

function draw(): void {
  frame = null;

  if (!playing.value) {
    return;
  }

  standPlayed();

  if (!still.value) {
    loudness = easedLoudness(loudness, heard());
    standAura(loudness);
  }

  frame = requestAnimationFrame(draw);
}

if (import.meta.client) {
  watch(
    [playing, still],
    () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }

      loudness = 0;

      standPlayed();

      if (!playing.value) {
        standAura(null);

        return;
      }

      if (still.value) {
        standAura(AURA_STILL);
      }

      frame = requestAnimationFrame(draw);
    },
    { flush: "post" }
  );
}

// The waveform is read once the player comes near the screen, and as many bars stand as its width
// holds.
let near: IntersectionObserver | null = null;
let sized: ResizeObserver | null = null;

onMounted(() => {
  standVolume();

  if (props.autoplay) {
    toggle();
  }

  if (wave.value !== null) {
    sized = new ResizeObserver(() => {
      count.value = barCount(wave.value?.clientWidth ?? 0, BAR_PX, GAP_PX);
    });
    sized.observe(wave.value);
  }

  if (root.value !== null) {
    near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        near?.disconnect();
        near = null;
        void waveformOf(props.src).then((read) => {
          if (read !== null) {
            peaks.value = read.peaks;
            decodedSeconds.value = knownLength(read.seconds);
          }
        });
      },
      { rootMargin: "50%" }
    );
    near.observe(root.value);
  }
});

// Leaving the screen takes the player with it, and a sound going stops there.
onBeforeUnmount(() => {
  element.value?.pause();
  near?.disconnect();
  sized?.disconnect();
  tap?.release();
  tap = null;

  if (frame !== null) {
    cancelAnimationFrame(frame);
  }
});
</script>

<style scoped>
/* The aura: a soft disc behind the button whose light runs unevenly round it and turns slowly, so
   the ring past the button's edge drifts as an aurora does. Its reach and brightness are stood on it
   frame by frame while the sound plays, each eased by the quick step; stopped, it fades away. */
.audio-aura {
  pointer-events: none;
  opacity: 0;
  background: conic-gradient(
    color-mix(in oklab, var(--ui-primary) 70%, transparent),
    color-mix(in oklab, var(--ui-primary) 25%, transparent),
    color-mix(in oklab, color-mix(in oklab, var(--ui-primary) 60%, white) 90%, transparent),
    color-mix(in oklab, var(--ui-primary) 20%, transparent),
    color-mix(in oklab, var(--ui-primary) 70%, transparent)
  );
  filter: blur(1px);
  transition:
    opacity var(--bmo-motion-quick) var(--bmo-ease-move),
    scale var(--bmo-motion-quick) var(--bmo-ease-move);
  animation: audio-aura-turn 6s linear infinite paused;
}

/* The played layer, cut off at a hard edge at the share of the sound played: solid accent before it,
   none after it, and no gradient between. */
.audio-played {
  clip-path: inset(0 calc((1 - var(--played, 0)) * 100%) 0 0);
}

.audio-aura[data-on] {
  animation-play-state: running;
}

@keyframes audio-aura-turn {
  to {
    rotate: 1turn;
  }
}

@media (prefers-reduced-motion: reduce) {
  .audio-aura {
    animation: none;
  }
}
</style>
