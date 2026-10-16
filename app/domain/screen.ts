import type { Ref } from "vue";

// How wide a screen has to be before it is not a phone. It is Tailwind's own sm, which is the
// width every other rule in this app changes its mind at, so a dialog that opens as a sheet
// opens as a sheet exactly where the rest of the layout goes narrow.
export const NARROW_MAX_PX = 639;

export const NARROW_QUERY = `(max-width: ${NARROW_MAX_PX}px)`;

// Whether this screen is a narrow one. A server render knows no width, so it answers false; the
// browser corrects it once it has taken the page over, and not a moment before.
//
// The waiting is the whole of it. A browser that read the width while it was still setting up
// would draw its first frame narrow over a page the server drew wide, and the two would not
// match — which is not a cosmetic complaint: the framework answers a mismatch by throwing away
// what it was handed and drawing that part again from nothing. Reading it on mount instead means
// the first frame is the one that arrived, and the width changes it on the tick after, as any
// other change would.
export function useNarrow(query: string = NARROW_QUERY): Ref<boolean> {
  const narrow = ref(false);

  if (import.meta.client) {
    const media = window.matchMedia(query);
    const read = (): void => {
      narrow.value = media.matches;
    };

    onMounted(() => {
      read();
      media.addEventListener("change", read);
    });

    onScopeDispose(() => media.removeEventListener("change", read));
  }

  return narrow;
}

// How much of the window a person can actually see and reach. The window's own height is not that
// number on a phone: a virtual keyboard is laid over the page rather than cut out of it, and a
// browser that does so leaves `innerHeight` exactly as it was while the bottom of the screen has
// gone behind the keys. What is standing at the foot of a full-height layout — the box a message
// is typed into — is then under the keyboard that was opened to type in it.
//
// The visual viewport is where a browser reports what is left. It reports the offset with it,
// since a browser may push its own page up to keep the focused box in sight, and a shell pinned to
// the top of the window would be pushed up with it.

// A tolerance rather than an equality. The two heights are fractional, and a difference of a
// pixel is a rounding rather than something covering the screen.
const VISIBLE_TOLERANCE_PX = 1;

// What the browser says about the visible part of itself, and the window height to read it
// against.
export interface VisibleReading {
  windowHeight: number;
  height: number;
  offsetTop: number;
  scale: number;
}

// Where the page's shell stands when something is covering the window. Nothing at all when the
// whole window is visible, because then the shell fills the window on its own and a number written
// over that would only fight the browser's own address bar as it comes and goes.
export interface VisibleFrame {
  top: number;
  height: number;
}

export function visibleFrame(reading: VisibleReading | null): VisibleFrame | null {
  // A pinched screen is a magnified one, not a covered one: the visible part is small because the
  // reader asked for it to be, and standing the whole page inside that would take the rest away.
  if (reading === null || reading.scale > 1) {
    return null;
  }

  const height = Math.round(reading.height);
  const top = Math.round(reading.offsetTop);
  const whole = height >= reading.windowHeight - VISIBLE_TOLERANCE_PX;

  return whole && top === 0 ? null : { top, height };
}

// The two properties the shell is laid out from. They are custom properties rather than a style
// bound on the element because more than the shell reads them: anything that must not grow past
// what is on the screen — a stack of cards over the box being typed in — takes its ceiling from the
// same number, and one number is what keeps them from disagreeing.
export const SCREEN_HEIGHT_PROPERTY = "--bmo-screen";
export const SCREEN_TOP_PROPERTY = "--bmo-screen-top";

// Where a frame standing for the whole screen is laid: from where the visible part begins, as tall
// as it is. The shell stands by it and so does the frame of a screen with no shell.
export const SCREEN_FRAME = { top: `var(${SCREEN_TOP_PROPERTY})`, height: `var(${SCREEN_HEIGHT_PROPERTY})` } as const;

// Keeps those two properties saying what is visible, for as long as the page is open. Unset is
// a meaningful state and is written as one: the stylesheet's own default is the whole window, and
// removing the property is how the shell is handed back to it.
export function useVisibleScreen(): void {
  if (!import.meta.client) {
    return;
  }

  const read = (): void => {
    const visual = window.visualViewport;
    const frame = visibleFrame(
      visual === null
        ? null
        : {
            windowHeight: window.innerHeight,
            height: visual.height,
            offsetTop: visual.offsetTop,
            scale: visual.scale
          }
    );
    const style = document.documentElement.style;

    if (frame === null) {
      style.removeProperty(SCREEN_HEIGHT_PROPERTY);
      style.removeProperty(SCREEN_TOP_PROPERTY);

      return;
    }

    style.setProperty(SCREEN_HEIGHT_PROPERTY, `${frame.height}px`);
    style.setProperty(SCREEN_TOP_PROPERTY, `${frame.top}px`);
  };

  // Both, and for the reason the offset is read at all: a keyboard opening resizes the visible
  // part, and a browser pushing its page up to reveal the focused box scrolls it without resizing
  // anything.
  onMounted(() => {
    read();
    window.visualViewport?.addEventListener("resize", read);
    window.visualViewport?.addEventListener("scroll", read);
  });

  onScopeDispose(() => {
    window.visualViewport?.removeEventListener("resize", read);
    window.visualViewport?.removeEventListener("scroll", read);
  });
}

// What a scrolling body does about its own scrollbar, where something outside that body has to
// line up with what stands inside it — a bar over a list lining up with the list's own rows.
//
// A scrollbar takes its width off the box the body lays out in, and a reading column centred in
// that box therefore moves half a scrollbar sideways the moment the content grows past a
// screenful. A bar outside the scroll never moves with it, so the two fall out of line by that
// half, and the reader sees a column of marks that bends.
//
// So the body keeps its gutter whether the content needs it or not, and what stands outside the
// scroll keeps the same room at its trailing edge. Both boxes are then the same width with the
// same leading edge, and a column centred in either stands in the same place.
export const STABLE_GUTTER = "[scrollbar-gutter:stable]";

// How wide an element is, watched, and what stands in its place while there is no element to measure.
// The element is watched whenever it appears rather than at the first mount alone: a part drawn
// only once there is something to put in it arrives after that moment, and one never measured would
// be laid out for a width it does not have.
export function useWidth(element: () => HTMLElement | null | undefined, unmeasured: number): Ref<number> {
  const width = ref(unmeasured);

  if (import.meta.server) {
    return width;
  }

  const watching = new ResizeObserver(([entry]) => {
    width.value = entry?.contentRect.width ?? width.value;
  });

  watchPostEffect((onCleanup) => {
    const watched = element();

    if (watched === null || watched === undefined) {
      width.value = unmeasured;

      return;
    }

    watching.observe(watched);
    onCleanup(() => watching.unobserve(watched));
  });

  onScopeDispose(() => watching.disconnect());

  return width;
}

// How much room that gutter takes, watched. A stylesheet cannot read a scrollbar's width and it
// differs by platform and by pointer, so it is measured off the box that reserves it.
export function useScrollGutter(scroller: () => HTMLElement | null | undefined): Ref<number> {
  const gutter = ref(0);

  if (import.meta.server) {
    return gutter;
  }

  const read = (box: HTMLElement): void => {
    gutter.value = box.offsetWidth - box.clientWidth;
  };

  const watching = new ResizeObserver(([entry]) => {
    if (entry !== undefined) read(entry.target as HTMLElement);
  });

  watchPostEffect((onCleanup) => {
    const box = scroller();

    if (box === null || box === undefined) {
      gutter.value = 0;

      return;
    }

    read(box);
    watching.observe(box);
    onCleanup(() => watching.unobserve(box));
  });

  onScopeDispose(() => watching.disconnect());

  return gutter;
}
