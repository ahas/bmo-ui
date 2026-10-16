import { onScopeDispose, ref, watch, type Ref } from "vue";

// What a thing floating over the screen shows while it is going away (`docs/components.md`,
// "Floating things").
//
// A modal, a sheet, a drawer or a popover does not leave the moment it is dismissed: the component
// library animates it out, and it is on the screen for the whole of that. A screen that draws the
// floating thing's contents from what was open — the row being read, the file being looked at —
// empties them the instant the dismissal is recorded, so what slides away is an empty frame, and the
// reader watches the thing they were reading disappear before the thing they closed does.
//
// So what a floating element was showing is held for as long as the element can still be seen.
// Nothing about closing changes: the element is told to close at once and closes at once. Only
// what it draws inside itself waits, and it is let go of once the screen is rid of it.
//
// Reopening cancels the wait. A dialog dismissed and opened again on another row shows that row
// straight away rather than the one it had been holding.

// How long the wait is: the longest of the library's own closing animations, which is a sheet's
// half-second. A dialog's is shorter, and holding its contents a little past its own animation
// costs nothing — they are behind a thing that is no longer on the screen.
export const OVERLAY_CLOSE_MS = 500;

// Holds the last thing a floating element was showing until the element itself is gone. Answers
// what the element is showing now while one stands, and what it was showing while it leaves.
export function useHeldWhileClosing<T>(read: () => T | null, ms: number = OVERLAY_CLOSE_MS): Ref<T | null> {
  const held = ref(read()) as Ref<T | null>;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const stop = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  // Read as it happens rather than on the next turn of the screen: what is drawn from it must
  // never be empty for even one frame between the dismissal and the wait beginning.
  watch(read, (now) => {
    stop();

    if (now !== null) {
      held.value = now;

      return;
    }

    timer = setTimeout(() => {
      timer = null;
      held.value = null;
    }, ms);
  }, { flush: "sync" });

  onScopeDispose(stop);

  return held;
}
