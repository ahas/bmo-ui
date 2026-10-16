// Reading how loud a sound is while it plays, for whatever on the screen moves with it: a
// visualiser a host draws and the aura round an audio player's button.

// The page's one audio context, which every tap reads through. It is made with the first sound
// tapped and kept, since a browser holds only a few of them.
let pageAudio: AudioContext | null = null;

// The spectrum is cut at 256 samples, so a bin is under 200 Hz wide at the rates a browser plays at,
// and a voice lives in the first twenty or so.
export const TAP_FFT = 256;

export interface Tap {
  // Fills the spectrum in, and says whether it could: a context the browser has not let run yet
  // reads nothing.
  levels: (into: Uint8Array<ArrayBuffer>) => boolean;
  // Fills the last stretch of the sound itself in, its samples around the middle of the byte, the
  // same way.
  wave: (into: Uint8Array<ArrayBuffer>) => boolean;
  release: () => void;
}

// The sound's spectrum and its samples, read off a copy of the element's output rather than the output itself, so
// what is heard never passes through the context: a browser that has not yet let the page's audio
// run costs the reading and nothing else. A browser that gives no copy gives no tap.
export function tapOf(element: HTMLMediaElement): Tap | null {
  const capture = (element as HTMLMediaElement & { captureStream?: () => MediaStream }).captureStream;

  if (capture === undefined || typeof AudioContext === "undefined") {
    return null;
  }

  try {
    const context = (pageAudio ??= new AudioContext());
    const stream = capture.call(element);
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();

    analyser.fftSize = TAP_FFT;
    analyser.smoothingTimeConstant = 0.7;
    source.connect(analyser);

    if (context.state !== "running") {
      context.resume().catch(() => undefined);
    }

    return {
      levels: (into) => {
        if (context.state !== "running") {
          return false;
        }

        analyser.getByteFrequencyData(into);

        return true;
      },
      wave: (into) => {
        if (context.state !== "running") {
          return false;
        }

        analyser.getByteTimeDomainData(into);

        return true;
      },
      release: () => {
        source.disconnect();

        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
    };
  } catch {
    return null;
  }
}
