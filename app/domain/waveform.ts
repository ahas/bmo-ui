// A sound's waveform as an audio player draws it: the loudest stretch under each bar, read from the
// sound itself in the browser, so each recording stands its own shape.

// How finely a sound is read: enough stretches for the widest player to stand a bar on each, and
// for the aura to follow syllables where it reads the waveform rather than the sound playing.
export const WAVE_DETAIL = 512;

// The largest file read for its waveform. A voice recording is a few hundred kilobytes; a file past
// this is fetched again whole only to be drawn, so it stands with even bars instead.
export const WAVE_FETCH_LIMIT = 16 * 1024 * 1024;

// The height a bar never falls under, as a share of the tallest, so silence still reads as a row.
export const WAVE_FLOOR = 0.12;

export interface Waveform {
  // Each stretch's loudness, from nought to one against the loudest.
  peaks: number[];
  // The length the decoded sound runs, for a file that does not say it before it is played.
  seconds: number;
}

// The loudest sample of each stretch, across every channel, against the loudest of all. A silent
// sound reads nought throughout rather than dividing by nothing.
export function peaksOf(channels: readonly Float32Array[], count: number = WAVE_DETAIL): number[] {
  const length = channels[0]?.length ?? 0;
  const peaks = Array.from({ length: count }, () => 0);

  if (length === 0) {
    return peaks;
  }

  for (let stretch = 0; stretch < count; stretch += 1) {
    const from = Math.floor((stretch * length) / count);
    const to = Math.max(from + 1, Math.floor(((stretch + 1) * length) / count));
    let loudest = 0;

    for (const channel of channels) {
      for (let sample = from; sample < to && sample < length; sample += 1) {
        const level = Math.abs(channel[sample] ?? 0);

        if (level > loudest) {
          loudest = level;
        }
      }
    }

    peaks[stretch] = loudest;
  }

  const top = Math.max(...peaks);

  return top === 0 ? peaks : peaks.map((peak) => peak / top);
}

// The bars a player of a given count stands: each the loudest of the stretches under it, raised to
// the floor. A sound not yet read stands every bar at the floor.
export function waveBars(peaks: readonly number[] | null, count: number): number[] {
  if (count <= 0) {
    return [];
  }

  if (peaks === null || peaks.length === 0) {
    return Array.from({ length: count }, () => WAVE_FLOOR);
  }

  return Array.from({ length: count }, (_, bar) => {
    const from = Math.floor((bar * peaks.length) / count);
    const to = Math.max(from + 1, Math.floor(((bar + 1) * peaks.length) / count));
    let loudest = 0;

    for (let stretch = from; stretch < to; stretch += 1) {
      loudest = Math.max(loudest, peaks[stretch] ?? 0);
    }

    return WAVE_FLOOR + (1 - WAVE_FLOOR) * loudest;
  });
}

// How many bars fit a width, each bar and the gap after it one pitch, the last with no gap.
export function barCount(width: number, bar: number, gap: number): number {
  return Math.max(0, Math.floor((width + gap) / (bar + gap)));
}

// How loud the sound is at a share of its length, read off its waveform.
export function loudnessAt(peaks: readonly number[], share: number): number {
  if (peaks.length === 0) {
    return 0;
  }

  const stretch = Math.min(peaks.length - 1, Math.max(0, Math.floor(share * peaks.length)));

  return peaks[stretch] ?? 0;
}

// What has been read already, by address, so a row drawn again or a sound standing twice on a
// screen is fetched and decoded once.
const read = new Map<string, Promise<Waveform | null>>();

// The rates tried for decoding, lowest first: a low one keeps a long sound small in memory, and a
// browser that refuses it decodes at an ordinary one.
const DECODE_RATES = [8000, 44100];

async function decoded(bytes: ArrayBuffer): Promise<AudioBuffer | null> {
  for (const rate of DECODE_RATES) {
    try {
      return await new OfflineAudioContext(1, 1, rate).decodeAudioData(bytes.slice(0));
    } catch {
      // The next rate, or none.
    }
  }

  return null;
}

async function fetched(src: string): Promise<Waveform | null> {
  if (typeof OfflineAudioContext === "undefined") {
    return null;
  }

  const stop = new AbortController();

  try {
    const answer = await fetch(src, { signal: stop.signal });
    const length = Number(answer.headers.get("content-length"));

    if (!answer.ok || length > WAVE_FETCH_LIMIT) {
      stop.abort();

      return null;
    }

    const sound = await decoded(await answer.arrayBuffer());

    if (sound === null) {
      return null;
    }

    const channels = Array.from({ length: sound.numberOfChannels }, (_, channel) => sound.getChannelData(channel));

    return { peaks: peaksOf(channels), seconds: sound.duration };
  } catch {
    return null;
  }
}

// The waveform of the sound at an address, or null where the browser cannot read it or the file is
// too large to fetch for it.
export function waveformOf(src: string): Promise<Waveform | null> {
  let reading = read.get(src);

  if (reading === undefined) {
    reading = fetched(src);
    read.set(src, reading);
  }

  return reading;
}
