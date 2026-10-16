import { describe, expect, test } from "bun:test";
import { createRenderer, defineComponent, nextTick, ref, type Ref } from "vue";
import { useFootInView } from "~/domain/foot";

// A renderer that draws to nothing, so the composable hangs on a real mount without a browser.
const nothing = {} as never;
const { createApp } = createRenderer<object, object>({
  insert: () => undefined,
  remove: () => undefined,
  patchProp: () => undefined,
  createElement: () => nothing,
  createText: () => nothing,
  createComment: () => nothing,
  setText: () => undefined,
  setElementText: () => undefined,
  parentNode: () => null,
  nextSibling: () => null
});

// An observer this file answers for: whatever it is watching is reported as in view or not when
// the test says so, and each time it is asked to watch an element it says what it sees then.
class FakeObserver {
  observed = 0;
  sees = true;

  constructor(private readonly callback: IntersectionObserverCallback) {}

  observe(): void {
    this.observed += 1;
    this.report();
  }

  unobserve(): void {}

  disconnect(): void {}

  report(): void {
    this.callback([{ isIntersecting: this.sees } as IntersectionObserverEntry], this as never);
  }
}

function mounted(busy: Ref<boolean>): { inView: Ref<boolean>; observer: FakeObserver; unmount: () => void } {
  let inView!: Ref<boolean>;
  let observer!: FakeObserver;
  const foot = ref({} as HTMLElement);
  const app = createApp(defineComponent({
    setup() {
      inView = useFootInView(foot, busy, { observer: (callback) => (observer = new FakeObserver(callback)) });

      return () => null;
    }
  }));

  app.mount({});

  return { inView, observer, unmount: () => app.unmount() };
}

describe("the foot of a list asking for the next page", () => {
  test("the foot standing under the placeholder is not taken for reached once the rows land", async () => {
    const busy = ref(true);
    const { inView, observer, unmount } = mounted(busy);

    await nextTick();
    expect(inView.value).toBe(true);

    // The rows land and push the foot out of view; at the moment the read ends nothing has been
    // measured against them yet, so a caller asking then must not see the old answer.
    observer.sees = false;
    busy.value = false;
    expect(inView.value).toBe(false);

    await nextTick();
    expect(inView.value).toBe(false);
    unmount();
  });

  test("a page that does not fill the screen still pulls the next one", async () => {
    const busy = ref(true);
    const { inView, observer, unmount } = mounted(busy);

    await nextTick();
    const before = observer.observed;

    busy.value = false;
    await nextTick();

    // Measured afresh against the rows that landed, and still in view.
    expect(observer.observed).toBe(before + 1);
    expect(inView.value).toBe(true);
    unmount();
  });
});
