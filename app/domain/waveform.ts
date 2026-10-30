// A sound's waveform as an audio player draws it: how loud each stretch of the sound is, read from the
// sound itself in the browser, so each recording stands its own shape.

// How finely a sound is read: enough stretches for the widest player to stand a bar on each, and
// for the aura to follow syllables where it reads the waveform rather than the sound playing.
export const WAVE_DETAIL = 512;

// The largest file read for its waveform. A voice recording is a few hundred kilobytes; a file past
// this is fetched again whole only to be drawn, so it stands with even bars instead. A server that
// does not say the length is read no further than this.
export const WAVE_FETCH_LIMIT = 16 * 1024 * 1024;

// The height a bar never falls under, as a share of the tallest, so silence still reads as a row.
export const WAVE_FLOOR = 0.12;

// The share of the bars taken as a sound's quiet end: the bars run from the loudness under which
// this share of them stand to the loudest, so a voice spoken at an even loudness still shows its words
// and pauses rather than a row of bars all near the top.
const WAVE_QUIET_SHARE = 0.1;

export interface Waveform {
  // Each stretch's loudness, from nought to one against the loudest.
  levels: number[];
  // The length the decoded sound runs, for a file that does not say it before it is played.
  seconds: number;
}

// How loud each stretch is: the root mean square of its samples across every channel, against the
// loudest stretch. The loudest sample alone reads almost every stretch of speech near the top, since a
// voice peaks in nearly every syllable. A silent sound reads nought throughout rather than dividing by
// nothing.
export function levelsOf(channels: readonly Float32Array[], count: number = WAVE_DETAIL): number[] {
  const length = channels[0]?.length ?? 0;
  const levels = Array.from({ length: count }, () => 0);

  if (length === 0 || channels.length === 0) {
    return levels;
  }

  for (let stretch = 0; stretch < count; stretch += 1) {
    const from = Math.floor((stretch * length) / count);
    const to = Math.min(length, Math.max(from + 1, Math.floor(((stretch + 1) * length) / count)));
    let sum = 0;

    for (const channel of channels) {
      for (let sample = from; sample < to; sample += 1) {
        const level = channel[sample] ?? 0;

        sum += level * level;
      }
    }

    levels[stretch] = Math.sqrt(sum / ((to - from) * channels.length));
  }

  const top = Math.max(...levels);

  return top === 0 ? levels : levels.map((level) => level / top);
}

// The bars a player of a given count stands: each the mean of the stretches under it, run from the
// sound's quiet end to its loudest bar and raised to the floor. A sound even throughout stands every
// bar at its full height, a silent one at the floor, and a sound not yet read at the floor too.
export function waveBars(levels: readonly number[] | null, count: number): number[] {
  if (count <= 0) {
    return [];
  }

  if (levels === null || levels.length === 0) {
    return Array.from({ length: count }, () => WAVE_FLOOR);
  }

  const means = Array.from({ length: count }, (_, bar) => {
    const from = Math.floor((bar * levels.length) / count);
    const to = Math.max(from + 1, Math.floor(((bar + 1) * levels.length) / count));
    let sum = 0;

    for (let stretch = from; stretch < to; stretch += 1) {
      sum += levels[stretch] ?? 0;
    }

    return sum / (to - from);
  });
  const ranked = means.toSorted((one, two) => one - two);
  const quiet = ranked[Math.floor((count - 1) * WAVE_QUIET_SHARE)] ?? 0;
  const loud = ranked[count - 1] ?? 0;
  const span = loud - quiet;

  return means.map((mean) => {
    const share = span > 0 ? Math.min(1, Math.max(0, (mean - quiet) / span)) : loud > 0 ? 1 : 0;

    return WAVE_FLOOR + (1 - WAVE_FLOOR) * share;
  });
}

// How many bars fit a width, each bar and the gap after it one pitch, the last with no gap.
export function barCount(width: number, bar: number, gap: number): number {
  return Math.max(0, Math.floor((width + gap) / (bar + gap)));
}

// How loud the sound is at a share of its length, read off its waveform.
export function loudnessAt(levels: readonly number[], share: number): number {
  if (levels.length === 0) {
    return 0;
  }

  const stretch = Math.min(levels.length - 1, Math.max(0, Math.floor(share * levels.length)));

  return levels[stretch] ?? 0;
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

// The file's bytes, or null once they pass the fetch limit: at once where the server says a length
// past it, and as they arrive where it says none.
async function bytesOf(answer: Response, stop: AbortController): Promise<ArrayBuffer | null> {
  if (Number(answer.headers.get("content-length") ?? 0) > WAVE_FETCH_LIMIT) {
    stop.abort();

    return null;
  }

  if (answer.body === null) {
    return answer.arrayBuffer();
  }

  const reader = answer.body.getReader();
  const parts: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      return new Blob(parts).arrayBuffer();
    }

    size += value.byteLength;

    if (size > WAVE_FETCH_LIMIT) {
      stop.abort();

      return null;
    }

    parts.push(value);
  }
}

// A waveform not read stands with even bars; in development the reason is said once for its address,
// since each address is read once.
function unread(src: string, reason: string): null {
  if (import.meta.dev) {
    console.warn(`The waveform of ${src} was not read: ${reason}`);
  }

  return null;
}

async function fetched(src: string): Promise<Waveform | null> {
  if (typeof OfflineAudioContext === "undefined") {
    return unread(src, "the browser has no offline audio context");
  }

  const stop = new AbortController();

  try {
    const answer = await fetch(src, { signal: stop.signal });

    if (!answer.ok) {
      stop.abort();

      return unread(src, `the server answered ${answer.status}`);
    }

    const bytes = await bytesOf(answer, stop);

    if (bytes === null) {
      return unread(src, `the file is larger than ${WAVE_FETCH_LIMIT} bytes`);
    }

    const sound = await decoded(bytes);

    if (sound === null) {
      return unread(src, "the browser could not decode it");
    }

    const channels = Array.from({ length: sound.numberOfChannels }, (_, channel) => sound.getChannelData(channel));

    return { levels: levelsOf(channels), seconds: sound.duration };
  } catch (error) {
    return unread(src, error instanceof Error ? error.message : String(error));
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
