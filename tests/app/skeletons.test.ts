import { describe, expect, test } from "bun:test";

import { ATTRIBUTE, attribute, ELEMENT, elements, sources, staticClasses, template } from "./sources";

// A skeleton keeps the place of content that is still being fetched, and the whole of what it is
// worth is that the place is the right one (`docs/components.md`, "Skeletons and loading"). The
// shape of one piece is the caller's own — only what draws the real item knows what one looks like
// — so ContentSkeleton takes it as the slot and draws nothing of its own. A caller that forgets the
// slot therefore keeps no place at all and says nothing about it: the region simply stands empty
// and then jumps. That is the one failure this arrangement can have, and it is read here off the
// files that ship.
//
// The two rules underneath are the same kind: a bar that says nothing about itself is read out to
// somebody who cannot see it, and a bar that keeps moving is read by somebody who asked for less
// movement. Both are settled once, on the bar, so neither is restated where a bar is drawn — and a
// second bar stood up beside it would be the place they are both forgotten.

const files = (await sources("components/**/*.vue")).map(({ path, text }) => ({ path, text, nodes: elements(template(text)) }));
const bar = files.find((one) => one.path === "components/SkeletonBar.vue")!;

describe("the layer's loading skeletons", () => {
  test("every place kept for an answer says what shape it is keeping", () => {
    const kept = files.flatMap((one) => one.nodes.filter((node) => node.tag === "ContentSkeleton").map((node) => ({ path: one.path, node })));
    const empty = kept.filter(({ node }) => (node.children ?? []).every((child) => child.type !== ELEMENT));

    // The sweep found places to sweep, so it is saying something.
    expect(kept.length).toBeGreaterThan(0);
    expect(empty.map((one) => one.path)).toEqual([]);
  });

  test("a shimmering bar is drawn only by the one component that settles what a bar is", () => {
    const raw = files.filter((one) => one.path !== bar.path && one.nodes.some((node) => node.tag === "USkeleton"));

    expect(bar.nodes.some((node) => node.tag === "USkeleton")).toBe(true);
    expect(raw.map((one) => one.path)).toEqual([]);
  });

  // The layer's reads are the browser's, so the page a server draws has asked for nothing. A bar or a
  // busy status in that picture says a read is going that has not begun; what keeps both out of it is
  // that they are drawn only by parts waiting for the browser.
  test("the bar keeps its place and draws nothing before the browser has taken the page over", () => {
    expect(bar.text).toContain("usePainted()");
    expect(bar.text).toContain("invisible: !painted");
  });

  test("a place says it is busy only through the two parts that wait for the browser", () => {
    const waiting = ["components/ContentSkeleton.vue", "components/SkeletonStatus.vue"];

    for (const path of waiting) {
      const busy = files.find((one) => one.path === path)!.nodes.flatMap((node) => attribute(node, "aria-busy") ?? []);

      expect(busy.map((one) => one.exp?.content)).toEqual(["painted ? 'true' : undefined"]);
    }

    const raw = files.filter(
      (one) =>
        !waiting.includes(one.path) &&
        (one.nodes.some((node) => {
          const busy = attribute(node, "aria-busy");

          return busy?.type === ATTRIBUTE && busy.value?.content === "true";
        }) ||
          one.text.includes("animate-pulse"))
    );

    expect(raw.map((one) => one.path)).toEqual([]);
  });

  test("that component hides itself from a reader who cannot see it and stands still for one who asked", () => {
    const drawn = bar.nodes.find((node) => node.tag === "USkeleton")!;

    expect(attribute(drawn, "aria-hidden")?.value?.content).toBe("true");
    expect(staticClasses(drawn)).toContain("motion-reduce:animate-none");
  });
});
