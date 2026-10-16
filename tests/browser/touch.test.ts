import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { BROWSER_HOOK_MS, openTouch, touchReady } from "./touch";

// That a finger driven this way really is a finger. Everything a touch check claims afterwards
// stands on this one: the page is asked what it saw, and what it saw has to be what a handset
// would have sent it — the touch events themselves, the pointer events marked as touch, and
// isTrusted true, which a script dispatching its own events cannot produce.
//
// The page is the test's own rather than a component's: what is measured here is the driving, and
// a screen would only bring its own reasons for an event to go missing.
//
// Skipped where the browser build is not on the machine, so a checkout without the cache runs its
// tests and says nothing about touch rather than failing over a missing download.

const recorder = `<div id="scrolls" style="width:300px;height:200px;background:#eee"></div>
<div id="holds" style="width:300px;height:200px;background:#ddd;touch-action:none"></div>
<script>
  window.seen = [];

  for (const box of [document.getElementById("scrolls"), document.getElementById("holds")]) {
    for (const kind of ["touchstart", "touchmove", "touchend", "pointerdown", "pointermove", "pointerup", "pointercancel"]) {
      box.addEventListener(kind, (event) => {
        window.seen.push({ on: box.id, type: event.type, pointerType: event.pointerType ?? null, trusted: event.isTrusted, at: performance.now() });
      });
    }
  }
</script>`;

interface Seen {
  on: string;
  type: string;
  pointerType: string | null;
  trusted: boolean;
  // When the page saw it, which is how a hold is told from a tap.
  at: number;
}

// One browser for the file rather than one for each check. Three launches and three teardowns in
// one process contend with each other — the second is opened while the first is still going down,
// and under any load at all the new renderer wedges and every call into it waits for ever. The
// checks do not need a browser apiece: each lays out its own page, and a page laid out again is a
// document made again, so nothing one of them saw is still standing when the next one looks.
let touch: Awaited<ReturnType<typeof openTouch>>;

describe.skipIf(!touchReady())("a finger on the screen", () => {
  beforeAll(async () => {
    touch = await openTouch();
  }, BROWSER_HOOK_MS);

  afterAll(async () => {
    await touch?.close();
  }, BROWSER_HOOK_MS);

  test("lands as a touch the page believes", async () => {
    await touch.page.setContent(recorder);
    await touch.tap({ x: 150, y: 100 });
    await touch.page.waitForTimeout(100);

    const seen = (await touch.page.evaluate(() => (window as unknown as { seen: Seen[] }).seen)) as Seen[];
    const down = seen.find((one) => one.type === "pointerdown");

    expect(down?.pointerType).toBe("touch");
    expect(down?.trusted).toBe(true);
    // The touch event itself, which is the one an emulated click never sends at all.
    expect(seen.some((one) => one.type === "touchstart" && one.trusted)).toBe(true);
  }, 60_000);

  test("travels, and the browser reads the travel as a gesture of its own", async () => {
    await touch.page.setContent(recorder);
    await touch.swipe({ x: 150, y: 60 }, { x: 150, y: 180 });
    await touch.page.waitForTimeout(100);

    const seen = (await touch.page.evaluate(() => (window as unknown as { seen: Seen[] }).seen)) as Seen[];
    const onScroller = seen.filter((one) => one.on === "scrolls");

    expect(onScroller.some((one) => one.type === "touchmove")).toBe(true);
    // A drag the browser decided was a scroll takes the pointer stream away rather than ending
    // it: pointercancel and no pointerup. That decision is the browser's own, and it is the
    // whole reason a touch path cannot be checked with a dispatched event.
    expect(onScroller.some((one) => one.type === "pointercancel")).toBe(true);
    expect(onScroller.some((one) => one.type === "pointerup")).toBe(false);
  }, 60_000);

  test("stays down when it is held, which is what a menu opened by a long press waits for", async () => {
    await touch.page.setContent(recorder);
    await touch.press({ x: 150, y: 100 }, { holdMs: 400 });
    await touch.page.waitForTimeout(100);

    const seen = (await touch.page.evaluate(() => (window as unknown as { seen: Seen[] }).seen)) as Seen[];
    const down = seen.find((one) => one.type === "touchstart");
    const up = seen.find((one) => one.type === "touchend");

    expect(down?.pointerType ?? null).toBeNull();
    expect(seen.find((one) => one.type === "pointerdown")?.pointerType).toBe("touch");
    expect(down?.at).toBeDefined();
    expect(up?.at).toBeDefined();
    // The finger was down for the time it was asked to be, which is real time the browser waited
    // through rather than a gesture named in an event.
    expect((up?.at ?? 0) - (down?.at ?? 0)).toBeGreaterThanOrEqual(350);
    // It never travelled, so nothing took the stream away for a scroll.
    expect(seen.some((one) => one.type === "pointercancel")).toBe(false);
  }, 60_000);

  test("and where the page says the gesture is its own, the stream is left whole", async () => {
    await touch.page.setContent(recorder);
    await touch.swipe({ x: 150, y: 260 }, { x: 150, y: 380 });
    await touch.page.waitForTimeout(100);

    const seen = (await touch.page.evaluate(() => (window as unknown as { seen: Seen[] }).seen)) as Seen[];
    const onHolder = seen.filter((one) => one.on === "holds");

    // touch-action: none is what the library's drag handle wears, and this is what it buys: the
    // press is followed to its end and lifts as a pointerup the handler can act on.
    expect(onHolder.some((one) => one.type === "pointermove" && one.pointerType === "touch")).toBe(true);
    expect(onHolder.some((one) => one.type === "pointerup")).toBe(true);
    expect(onHolder.some((one) => one.type === "pointercancel")).toBe(false);
  }, 60_000);
});
