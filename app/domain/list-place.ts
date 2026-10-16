import { onActivated, onBeforeUnmount, onDeactivated, onMounted } from "vue";

// Where a list stood when the reader left it for something it opened, and how it gets back there.
//
// Going from a list into one of its rows and back is one move, not two places: what the reader
// expects on their return is the list they left — the same scroll, the same choice, the same rows
// read so far — and a list drawn again from nothing gives them the top of it instead.
//
// The first answer is not to take the list down at all: the detail stands over the list, or the
// router is told to keep the page rather than build it again. That much is the screen's own to
// arrange. What no such arrangement gives back is the scroll, because a kept page's element is
// detached while it is away and a browser hands a detached element's offset back as nothing, and
// because a list drawn again is drawn empty and grows into its height over several frames.
//
// So this is the scroll, and it is the whole of what a list needs beyond not being taken down.
// The offset is written down when the list leaves and put back when it returns, once there are
// rows enough to stand at it.

// Where each list stood, by the name it goes under. It lives for as long as the page is open,
// which is as long as a return to a list can be a return rather than an arrival.
const places = new Map<string, number>();

// How many frames the rows are waited for before the offset is given up on. A list reads its rows
// back over a few frames; one that never grows tall enough has nothing to go back to.
const WAIT_FRAMES = 60;

// The offset a container can actually stand at: its own, capped by how far it can scroll.
export function scrollable(top: number, scrollHeight: number, clientHeight: number): number {
  return Math.max(0, Math.min(top, scrollHeight - clientHeight));
}

// A pixel of slack: the two heights are fractional, and an offset short by a rounding is the
// offset.
const REACHED_TOLERANCE_PX = 1;

// Whether the container has grown tall enough to hold the offset it is going back to.
export function reached(top: number, scrollHeight: number, clientHeight: number): boolean {
  return scrollHeight - clientHeight >= top - REACHED_TOLERANCE_PX;
}

// The container scrolled as far toward the offset as it can reach, and whether that was the offset.
function putBack(element: HTMLElement, top: number): boolean {
  element.scrollTop = scrollable(top, element.scrollHeight, element.clientHeight);

  return reached(top, element.scrollHeight, element.clientHeight);
}

function frame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function useListPlace(key: string, scroller: () => HTMLElement | null): void {
  if (import.meta.server) {
    return;
  }

  let standing = true;
  let goingBack = false;

  // The offset is written down as it is made rather than as the list leaves. A list the router
  // keeps is moved off the page before it is told it has left, and a browser reads a detached
  // element's offset as nothing, so a list asked on its way out answers zero every time.
  function onScroll(): void {
    const element = scroller();

    if (element !== null && !goingBack) {
      places.set(key, element.scrollTop);
    }
  }

  function listen(): void {
    scroller()?.addEventListener("scroll", onScroll, { passive: true });
  }

  function stopListening(): void {
    scroller()?.removeEventListener("scroll", onScroll);
  }

  async function goBack(): Promise<void> {
    const top = places.get(key);

    if (top === undefined || top === 0) {
      return;
    }

    goingBack = true;

    try {
      for (let waited = 0; waited < WAIT_FRAMES && standing; waited += 1) {
        const element = scroller();

        if (element !== null && putBack(element, top)) {
          return;
        }

        await frame();
      }
    } finally {
      goingBack = false;
    }
  }

  function arrive(): void {
    listen();
    void goBack();
  }

  onMounted(arrive);
  onActivated(arrive);
  onDeactivated(stopListening);
  onBeforeUnmount(() => {
    standing = false;
    stopListening();
  });
}
