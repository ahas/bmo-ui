import { ref, watch } from "vue";

import type { Ref } from "vue";

// What opens over another stands over it (`docs/components.md`, "Floating things"). A floating thing
// is drawn into the page's body at the place its component took when it was mounted, not when it
// opened, so one mounted ahead of every screen stands ahead of every floating thing a screen mounts
// after it — a drawer it is opened from included — and is drawn under it. Keyed by this count, such
// a thing is mounted afresh at each opening and lands after everything standing. The count moves
// before the render the opening causes, so the fresh one is the one that opens, and it stands still
// while the thing closes, so the closing is drawn by the one that was open.
export function useOpenings(open: () => boolean): Readonly<Ref<number>> {
  const openings = ref(open() ? 1 : 0);

  watch(open, (standing) => {
    if (standing) {
      openings.value += 1;
    }
  });

  return openings;
}
