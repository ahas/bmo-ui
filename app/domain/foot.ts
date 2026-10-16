import { nextTick, onMounted, onScopeDispose, ref, watch, type Ref } from "vue";

type Observer = Pick<IntersectionObserver, "observe" | "unobserve" | "disconnect">;
type MakeObserver = (callback: IntersectionObserverCallback, options: IntersectionObserverInit) => Observer;

export interface FootOptions {
  // How far ahead of the end the foot counts as reached, so the next page is already coming as
  // the last rows are read.
  rootMargin?: string;
  // Where the observer comes from; a test hands in its own.
  observer?: MakeObserver;
}

// Whether the foot of a list stands in view. What asks for the next page is the foot standing
// there rather than the moment it arrives, so a first page that does not fill the screen still
// pulls the next one.
//
// The answer is only true of the list it was measured against. While a read is going, the foot
// stands right under the placeholder and is in view; the rows that land push it away, but the
// observer says so only after the screen has been drawn, and a caller asking at the moment the
// read ends would take the foot for reached and fetch a page nobody scrolled to — a second
// placeholder standing at once under the first one's rows. So the answer is put back to not
// reached as each read ends, and the foot is measured afresh once the rows are drawn.
export function useFootInView(foot: Ref<HTMLElement | null | undefined>, busy: Ref<boolean>, options: FootOptions = {}): Ref<boolean> {
  const inView = ref(false);
  const make: MakeObserver = options.observer ?? ((callback, init) => new IntersectionObserver(callback, init));
  let observer: Observer | null = null;
  let observed: HTMLElement | null = null;

  const measure = (): void => {
    if (observer === null || observed === null) return;

    observer.unobserve(observed);
    observer.observe(observed);
  };

  watch(busy, (now, before) => {
    if (before && !now) {
      inView.value = false;
      void nextTick(measure);
    }
  }, { flush: "sync" });

  onMounted(() => {
    observer = make((entries) => {
      inView.value = entries.some((entry) => entry.isIntersecting);
    }, { rootMargin: options.rootMargin ?? "0px" });

    watch(foot, (element) => {
      if (observed !== null) observer?.unobserve(observed);

      observed = element ?? null;

      if (observed !== null) observer?.observe(observed);
    }, { immediate: true, flush: "post" });
  });

  onScopeDispose(() => observer?.disconnect());

  return inView;
}
