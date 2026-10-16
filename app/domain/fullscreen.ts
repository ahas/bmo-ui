// Where the parts around a video stood before it went full screen, and how they get back there.
//
// Taking a player to full screen takes the layout with it: the video leaves the flow, the window
// grows or a phone turns on its side, and every part scrolling around the player clamps to a
// shorter end or is anchored somewhere else. Letting go brings the video back, but not the reader's
// place. Asking where the reader stood once full screen has begun is too late — reading an offset
// then lays the page out without the video and hands back the clamped one — so the place is
// written down at the press or key that reached the video, which comes before anything moved.
//
// A part puts back its offset unless it says for itself what its place is: a list that follows its
// end says so (`docs/design.md`, "The vertical").

// Puts a part back where it was written down. It is called on every frame of the settling, so it
// must land in the same place however often it runs.
export type PutBack = () => void;

// Writes down where a part stands now, answering what puts it back there.
export type TakePlace = (part: HTMLElement) => PutBack;

// How long the window is given to settle after full screen is let go. A desktop animates its way
// out, and the resize that ends it arrives after the change is announced.
const SETTLE_MS = 1000;

const places = new WeakMap<HTMLElement, TakePlace>();

// The default: the part's own offset, which is right wherever the layout after full screen is the
// layout before it.
const offsetPlace: TakePlace = (part) => {
  const top = part.scrollTop;

  return () => {
    part.scrollTop = top;
  };
};

// A part that knows its place better than its offset says so here, for as long as it stands.
export function keepPlace(part: HTMLElement, take: TakePlace): () => void {
  places.set(part, take);

  return () => {
    if (places.get(part) === take) {
      places.delete(part);
    }
  };
}

function scrolls(element: HTMLElement): boolean {
  const overflow = getComputedStyle(element).overflowY;

  return (overflow === "auto" || overflow === "scroll") && element.scrollHeight > element.clientHeight;
}

// Every part scrolling around the element, nearest first.
function scrollingParts(element: Element): HTMLElement[] {
  const parts: HTMLElement[] = [];

  for (let at = element.parentElement; at !== null; at = at.parentElement) {
    if (scrolls(at)) {
      parts.push(at);
    }
  }

  return parts;
}

function takePlaces(video: Element): PutBack[] {
  return scrollingParts(video).map((part) => (places.get(part) ?? offsetPlace)(part));
}

interface Frames {
  now: () => number;
  next: (step: () => void) => number;
  cancel: (handle: number) => void;
}

const browserFrames: Frames = {
  now: () => performance.now(),
  next: (step) => requestAnimationFrame(step),
  cancel: (handle) => cancelAnimationFrame(handle),
};

// Full screen as a browser announces it: the standard change and its WebKit prefix on the document,
// and — an iPhone playing full screen outside the page altogether — the begin and end its own player
// announces on the video, which do not bubble and are caught on the way down.
export function holdThroughFullscreen(root: Document, frames: Frames = browserFrames): () => void {
  let taken: PutBack[] = [];
  let held: PutBack[] | null = null;
  let outside = false;
  let settling: number | null = null;

  const full = (): boolean =>
    outside || root.fullscreenElement != null || (root as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement != null;

  function stopSettling(): void {
    if (settling !== null) {
      frames.cancel(settling);
      settling = null;
    }
  }

  // A press or a key is the reader's: it ends any settling, and where it reaches a video it is
  // the last moment before full screen can move anything.
  function pressed(event: Event): void {
    stopSettling();

    if (event.target instanceof HTMLVideoElement && held === null && !full()) {
      taken = takePlaces(event.target);
    }
  }

  function enter(): void {
    stopSettling();
    held ??= taken;
  }

  function leave(): void {
    const back = held ?? [];
    const until = frames.now() + SETTLE_MS;

    held = null;
    taken = [];
    stopSettling();

    if (back.length === 0) {
      return;
    }

    const step = (): void => {
      back.forEach((put) => put());
      settling = frames.now() < until ? frames.next(step) : null;
    };

    step();
  }

  function changed(): void {
    if (full()) {
      enter();
    } else if (held !== null) {
      leave();
    }
  }

  function begin(): void {
    outside = true;
    enter();
  }

  function end(): void {
    outside = false;
    changed();
  }

  // The reader scrolling ends the settling as a press does: from then on the place is theirs.
  const listening: [string, EventListener][] = [
    ["pointerdown", pressed],
    ["keydown", pressed],
    ["fullscreenchange", changed],
    ["webkitfullscreenchange", changed],
    ["webkitbeginfullscreen", begin],
    ["webkitendfullscreen", end],
    ["wheel", stopSettling],
    ["touchstart", stopSettling],
  ];

  for (const [name, listener] of listening) {
    root.addEventListener(name, listener, { capture: true, passive: true });
  }

  return () => {
    stopSettling();

    for (const [name, listener] of listening) {
      root.removeEventListener(name, listener, { capture: true });
    }
  };
}
