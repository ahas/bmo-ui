import { computed, onMounted, readonly, ref } from "vue";

import type { ComputedRef, DeepReadonly, Ref } from "vue";

// How loud the players on a page play (`docs/components.md`, "Skeletons and loading"). The volume is
// the reader's and one for the page: every player stands on the same one, it is kept in the browser's
// storage, and each player reads it back as it mounts.

// How loud, from nought to one, and whether the sound is muted over it.
export interface Loudness {
  level: number;
  muted: boolean;
}

// The storage entry the volume is kept under, in the layer's own namespace.
export const VOLUME_KEY = "bmo-ui.volume";

// Where a reader with nothing kept starts.
export const FULL_VOLUME: Loudness = { level: 1, muted: false };

// Where unmuting a volume slid to nothing brings it back to, since nothing would stay silent.
export const UNMUTED_LEVEL = 0.5;

function clamped(level: number): number {
  return Math.min(1, Math.max(0, level));
}

// The volume once the slider stands at a level: nothing is muted, and anything above it is heard.
export function slid(level: number): Loudness {
  const to = clamped(level);

  return { level: to, muted: to === 0 };
}

// The volume once the mute is pressed: muting keeps the level to come back to, and unmuting a level
// of nothing comes back to half.
export function muteToggled(now: Loudness): Loudness {
  if (!now.muted) {
    return { level: now.level, muted: true };
  }

  return { level: now.level > 0 ? now.level : UNMUTED_LEVEL, muted: false };
}

type Kept = Pick<Storage, "getItem" | "setItem">;

// What is kept, or null where storage cannot be reached or holds nothing a volume reads from. Reaching
// the storage at all may throw, as a browser refusing a page its storage does.
function recalled(storage: () => Kept): Loudness | null {
  try {
    const kept: unknown = JSON.parse(storage().getItem(VOLUME_KEY) ?? "null");

    if (typeof kept !== "object" || kept === null) {
      return null;
    }

    const { level, muted } = kept as Partial<Record<keyof Loudness, unknown>>;

    if (typeof level !== "number" || !Number.isFinite(level) || typeof muted !== "boolean") {
      return null;
    }

    return { level: clamped(level), muted };
  } catch {
    return null;
  }
}

function kept(storage: () => Kept, loudness: Loudness): void {
  try {
    storage().setItem(VOLUME_KEY, JSON.stringify(loudness));
  } catch {
    // Storage refused: the volume holds for the page alone.
  }
}

// One page's volume: what it stands at, what a slider shows of it, and the two ways a reader moves it.
// `recall` stands what storage keeps on it, and leaves it as it is where storage keeps nothing.
export interface Volume {
  loudness: DeepReadonly<Ref<Loudness>>;
  heard: ComputedRef<number>;
  slide: (level: number) => void;
  toggleMute: () => void;
  recall: () => void;
}

export function createVolume(storage: () => Kept = () => window.localStorage): Volume {
  const loudness = ref<Loudness>({ ...FULL_VOLUME });

  function stand(to: Loudness): void {
    loudness.value = to;
    kept(storage, to);
  }

  return {
    loudness: readonly(loudness),
    heard: computed(() => (loudness.value.muted ? 0 : loudness.value.level)),
    slide: (level) => stand(slid(level)),
    toggleMute: () => stand(muteToggled(loudness.value)),
    recall: () => {
      const read = recalled(storage);

      if (read !== null) {
        loudness.value = read;
      }
    }
  };
}

// The page's one volume. Storage is read only on mount, so a server's render and the browser's first
// frame both stand at full, and every player moves to the kept volume together once the page is the
// browser's.
const pageVolume = createVolume();

export function useVolume(volume: Volume = pageVolume): Volume {
  onMounted(volume.recall);

  return volume;
}
