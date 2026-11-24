import { describe, expect, test } from "bun:test";
import { Glob } from "bun";

// The island is a pill drawn over every screen, so what holds it is read off the file that ships:
// where it stands, what it is made of, and that it is the layer's only way of saying anything at
// all (`docs/components.md`, "Messages"). Two roads for news is one road nobody watches, and a
// message sent down the unwatched one is simply lost.

const island = await Bun.file(new URL("../../app/components/MessageIsland.vue", import.meta.url)).text();
const root = new URL("../../", import.meta.url);

async function layerSources(): Promise<{ path: string; source: string }[]> {
  const found: { path: string; source: string }[] = [];

  for (const pattern of ["app/**/*.vue", "app/**/*.ts", "shared/**/*.ts"]) {
    for await (const path of new Glob(pattern).scan({ cwd: root.pathname })) {
      found.push({ path, source: await Bun.file(new URL(path, root)).text() });
    }
  }

  return found.sort((one, two) => one.path.localeCompare(two.path));
}

describe("the layer has one way of saying something and no other", () => {
  test("the sweep found the files to sweep, so nothing below passes on an empty list", async () => {
    expect((await layerSources()).length).toBeGreaterThan(50);
  });

  test("no part of the layer raises a toast of the library's", async () => {
    const found = (await layerSources()).filter(({ source }) => /\buseToast\b|\btoast\.add\b/.test(source));

    expect(found.map(({ path }) => path)).toEqual([]);
  });

  // The browser's own dialogs are the other road: unstyled, outside every rule the rest of the
  // layer is held to, and on a phone a system sheet that says nothing about where it came from.
  test("no part of the layer asks with the browser's own dialog", async () => {
    const found = (await layerSources()).filter(({ source }) => /(^|[^.\w])(confirm|alert|prompt)\(/m.test(source.replace(/\bwindow\./g, "")));

    expect(found.map(({ path }) => path)).toEqual([]);
  });
});

describe("where the island stands", () => {
  test("at the top of the screen, centred, and clear of whatever the device puts up there", () => {
    expect(island).toContain("fixed inset-x-0");
    expect(island).toContain("flex justify-center");
    expect(island).toContain("env(safe-area-inset-top, 0px)");
    // The same offset the shell is laid out from, so a browser pushing its page up to reveal a
    // focused box does not push the island off the top of the window with it.
    expect(island).toContain("SCREEN_TOP_PROPERTY");
  });

  // The app's root is an isolated stacking context and what the library floats goes into the
  // body beside it, so a number alone does not put the island over a dialog: it has to be in
  // the body too.
  test("above everything else on the screen, since a notice under a dialog is a notice unread", () => {
    expect(island).toContain("z-[100]");
    expect(island).toContain('<Teleport to="body">');
  });

  test("it never takes a press meant for the page: only the pill itself is pressed", () => {
    expect(island).toContain("pointer-events-none fixed");
    expect(island).toContain("pointer-events-auto");
  });

  test("and it stands within a phone's width with a gutter either side", () => {
    expect(island).toContain("max-w-[calc(100vw-2rem)]");
    expect(island).toContain(`class="pointer-events-none fixed inset-x-0 z-[100] flex justify-center px-4"`);
  });
});

// It tells and never asks (`docs/components.md`, "Messages"): a notice goes on its own, so the pill
// is announced as a status and takes no entry of the back gesture.
describe("what it is to a reader", () => {
  test("a status, never a dialog, and registered with nothing of the back gesture", () => {
    expect(island).toContain('role="status"');
    expect(island).not.toContain("alertdialog");
    expect(island).not.toContain("openLayer");
  });
});

describe("under a dialog", () => {
  // A dialog or a drawer hides everything outside it from assistive technology except what carries
  // aria-live when it opens; the region the pill stands in is there before any pill is.
  test("the region it stands in is never hidden from a screen reader by a dialog opening", () => {
    expect(island).toContain(`aria-live="off"\n        data-over-layers\n        class="pointer-events-none fixed inset-x-0 z-[100] flex justify-center px-4"`);
  });
});

describe("the shape it stands as", () => {
  test("one radius at every size, which is a pill at one line and a rounded card grown", () => {
    expect(island).toContain("border-radius: 26px");
  });

  test("it moves between two sizes rather than jumping, and is measured to have a size to move to", () => {
    expect(island).toContain("transition:\n    width var(--bmo-motion-unfold) var(--bmo-ease-move)");
    expect(island).toContain("useHeldSize(body)");
    expect(island).toContain("width: `${size.width}px`");
  });

  // It comes from no place in particular, so it neither grows out of one nor drops in from an edge:
  // it opens sideways on its own centre, the row it stands in centring it, and folds back the same
  // way. Its words are laid out at their full width inside it from the first frame and only they
  // fade, so a pill still narrower hides them rather than squeezing, cutting or wrapping them.
  test("it unfolds from no width on its own centre, and only its words fade", () => {
    expect(island).toContain("width: 0 !important;");
    expect(island).toContain("flex items-start justify-center overflow-hidden");
    expect(island).toContain(`class="bmo-island-content w-max max-w-[calc(100vw-2rem)] shrink-0"`);
    expect(island).toContain(".bmo-island-enter-from .bmo-island-content,\n  .bmo-island-leave-to .bmo-island-content {\n    opacity: 0;");
    expect(island).not.toContain("scale(");
    expect(island).not.toContain("translateY(");
  });

  test("and a reader who asked for less movement is given none of it", () => {
    expect(island).toContain("@media (prefers-reduced-motion: no-preference) {\n  .bmo-island-enter-active {");
    expect(island).toContain("@media (prefers-reduced-motion: reduce)");
  });

  test("its surface is fixed dark in both themes, so its text and marks are fixed with it", () => {
    expect(island).toContain("bg-zinc-900");
    expect(island).toContain("dark:bg-zinc-800");
    expect(island).toContain("text-white");
    expect(island).toContain("text-zinc-300");
  });
});

describe("what pressing it does", () => {
  test("the whole of its words is the press, not a button standing beside them", () => {
    expect(island).toContain('<button\n                type="button"');
    expect(island).toContain("await navigateTo(now.to)");
  });

  // The colour is the whole pill's, so no block of the words' own ends against a key beside them.
  test("and being pressable it carries a hover and a press colour over the whole pill, neither its resting one", () => {
    expect(island).toContain(".bmo-island:has(.bmo-island-words:hover)");
    expect(island).toContain(".bmo-island:has(.bmo-island-words:active)");
    expect(island).not.toContain("hover:bg-white/10 active:bg-white/20");
    expect(island).toContain("focus-inset");
  });

  test("how many are still behind it stands on it, in figures that do not shift as they change", () => {
    expect(island).toContain("tabular-nums");
    expect(island).toContain("countText(waiting)");
  });
});

describe("the presses it holds", () => {
  // A white word on the light theme's fill shade reads at 2.4:1; the badges' darker step brings
  // it past 4.5:1, measured at 7.5:1 on the bench.
  test("a filled press on it takes the darker step every badge takes, so its word reads", () => {
    expect(island).toContain("? 'badge-ink pointer-coarse:min-h-11' : ''");
  });

  // A notice of one line keeps its keys on that line, centred on it, at the small size a pointer reads.
  test("a one-line notice holds its keys on its line, and a key is a finger's height on touch alone", () => {
    expect(island).toContain("message.value.description === null && message.value.actions.length > 0");
    expect(island).toContain("inline ? 'flex items-center' : ''");
    expect(island).not.toContain("base: 'min-h-11");
  });

  test("a notice goes with the press taken on it, on its words or on a press it offers", () => {
    expect(island).toContain("  away(now.key);\n\n  if (now.to !== null) {");
    expect(island).toContain("if (now !== null) {\n    away(now.key);\n  }\n\n  await action.press();");
  });
});
