import { describe, expect, test } from "bun:test";

import { NARROW_MAX_PX, NARROW_QUERY, SCREEN_HEIGHT_PROPERTY, SCREEN_TOP_PROPERTY, visibleFrame } from "~/domain/screen";

// When this browser is allowed to look at its own width. A server render knows no width and
// answers false; if the browser read the real width while it was still setting up, its first
// frame would be the narrow layout drawn over a page the server drew wide, and the two would not
// match. A mismatch is not a cosmetic complaint — the framework answers one by throwing away the
// markup it was handed and drawing that part again from nothing — so the reading waits until the
// browser has taken the page over. That is a rule about when a line runs, which a rendered screen
// would name as neither, so it is read off the file that ships.

const source = await Bun.file(new URL("../../app/domain/screen.ts", import.meta.url)).text();

describe("the width a screen admits to", () => {
  test("there is a file to read, so nothing below passes on an empty string", () => {
    expect(source).toContain("window.matchMedia");
    expect(NARROW_QUERY).toBe(`(max-width: ${NARROW_MAX_PX}px)`);
  });

  test("starts as the one thing a server render can say, which is not narrow", () => {
    expect(source).toContain("const narrow = ref(false)");
  });

  test("is read once the browser has the page and not while it is setting up", () => {
    const mounted = source.indexOf("onMounted(");
    const reading = source.indexOf("read();");

    expect(mounted).toBeGreaterThan(-1);
    expect(reading).toBeGreaterThan(mounted);
  });

  test("and the listening starts there too, so nothing moves it earlier", () => {
    const mounted = source.indexOf("onMounted(");
    const listening = source.indexOf('addEventListener("change"');

    expect(listening).toBeGreaterThan(mounted);
  });
});

// How much of the window is on the screen. A phone lays its keyboard over the page rather than
// cutting it out, so the window keeps the height it always had while its bottom has gone behind
// the keys — and the box at the foot of a full-height layout is under the keyboard opened to type
// in it. What the browser will say about that is on the visual viewport, and these are the
// readings that have to be told apart: something covering the window, the page pushed up to keep
// the focused box in sight, a screen magnified by two fingers, and a window with nothing over it
// at all.

const visible = await Bun.file(new URL("../../app/domain/screen.ts", import.meta.url)).text();

describe("how much of the window is on the screen", () => {
  test("is nothing to say where the browser has no visual viewport to ask", () => {
    expect(visibleFrame(null)).toBeNull();
  });

  test("is nothing to say where the whole window is visible", () => {
    expect(visibleFrame({ windowHeight: 851, height: 851, offsetTop: 0, scale: 1 })).toBeNull();
  });

  test("is nothing to say for a pixel of rounding, which is not something covering the screen", () => {
    expect(visibleFrame({ windowHeight: 851, height: 850.4, offsetTop: 0, scale: 1 })).toBeNull();
  });

  test("is the visible height where a keyboard has taken the bottom of the window", () => {
    expect(visibleFrame({ windowHeight: 851, height: 531, offsetTop: 0, scale: 1 })).toEqual({ top: 0, height: 531 });
  });

  test("carries the offset where the browser pushed its page up to show the box being typed in", () => {
    expect(visibleFrame({ windowHeight: 851, height: 531, offsetTop: 120, scale: 1 })).toEqual({ top: 120, height: 531 });
  });

  test("is said in whole pixels, since it is written into a length", () => {
    expect(visibleFrame({ windowHeight: 851, height: 530.6, offsetTop: 119.7, scale: 1 })).toEqual({ top: 120, height: 531 });
  });

  test("is nothing to say while two fingers are magnifying the page", () => {
    // The visible part is small because the reader asked for it to be, and standing the whole page
    // inside it would take away the rest of what they zoomed in on.
    expect(visibleFrame({ windowHeight: 851, height: 300, offsetTop: 40, scale: 2.4 })).toBeNull();
  });

  test("says so again once the keyboard is down, rather than leaving the smaller number standing", () => {
    expect(visibleFrame({ windowHeight: 851, height: 851, offsetTop: 0, scale: 1 })).toBeNull();
  });
});

describe("how the page is told what is on the screen", () => {
  test("there is a file to read, so nothing below passes on an empty string", () => {
    expect(visible).toContain("window.visualViewport");
    expect(SCREEN_HEIGHT_PROPERTY).toBe("--bmo-screen");
    expect(SCREEN_TOP_PROPERTY).toBe("--bmo-screen-top");
  });

  test("hands the shell back to the stylesheet rather than writing the window height itself", () => {
    // The stylesheet's own default is the whole window, and it is written in the units a browser
    // animates its address bar in. A number copied over it would be a still picture of a height
    // that moves.
    expect(visible).toContain("style.removeProperty(SCREEN_HEIGHT_PROPERTY)");
    expect(visible).toContain("style.removeProperty(SCREEN_TOP_PROPERTY)");
  });

  test("listens for the resizing and for the scrolling, which are two different keyboards", () => {
    // One browser shrinks the visible part when the keys come up; another leaves it alone and
    // scrolls the page under it to reveal the focused box. Hearing one and not the other leaves
    // the shell standing wrong on half the phones there are.
    expect(visible).toContain('window.visualViewport?.addEventListener("resize", read)');
    expect(visible).toContain('window.visualViewport?.addEventListener("scroll", read)');
  });

  test("is read once the browser has the page, as every other reading of the window here is", () => {
    const mounted = visible.indexOf("onMounted(() => {\n    read();");

    expect(mounted).toBeGreaterThan(-1);
  });

  test("and stops listening with the screen that asked", () => {
    expect(visible).toContain('window.visualViewport?.removeEventListener("resize", read)');
    expect(visible).toContain('window.visualViewport?.removeEventListener("scroll", read)');
  });
});
