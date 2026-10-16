import { describe, expect, test } from "bun:test";

import { allOf, baseName, fileTabLabel, lastSeen, moveTab, openInTabs, othersOf, pinnedFirst, pinTab, rightOf } from "~/domain/tabs";

// How every screen's open tabs move (`docs/components.md`, "Tab bar and toolbar").

describe("opening a tab", () => {
  const same = (id: string) => (tab: { id: string }) => tab.id === id;

  test("keeps an open tab in its place and closes the one looked at longest ago past the cap", () => {
    let tabs = openInTabs([], same("a"), { id: "a", seenAt: 1 }, 2);

    tabs = openInTabs(tabs, same("b"), { id: "b", seenAt: 2 }, 2);
    tabs = openInTabs(tabs, same("a"), { id: "a", seenAt: 3 }, 2);
    expect(tabs).toEqual([
      { id: "a", seenAt: 3 },
      { id: "b", seenAt: 2 }
    ]);

    tabs = openInTabs(tabs, same("c"), { id: "c", seenAt: 4 }, 2);
    expect(tabs.map((tab) => tab.id)).toEqual(["a", "c"]);
  });

  test("never closes a pinned tab for room, and keeps the pin of a tab opened again", () => {
    let tabs = [
      { id: "a", seenAt: 1, pinned: true },
      { id: "b", seenAt: 2 }
    ];

    tabs = openInTabs(tabs, same("c"), { id: "c", seenAt: 3 }, 2);
    expect(tabs.map((tab) => tab.id)).toEqual(["a", "c"]);

    tabs = openInTabs(tabs, same("a"), { id: "a", seenAt: 4 }, 2);
    expect(tabs[0]).toEqual({ id: "a", seenAt: 4, pinned: true });

    const held = openInTabs([{ id: "a", seenAt: 1, pinned: true }], same("b"), { id: "b", seenAt: 2 }, 1);

    expect(held.map((tab) => tab.id)).toEqual(["a", "b"]);
  });

  test("the tab to stand after a close is the one looked at last", () => {
    expect(lastSeen([{ id: "a", seenAt: 5 }, { id: "b", seenAt: 9 }, { id: "c", seenAt: 1 }])?.id).toBe("b");
    expect(lastSeen([])).toBeNull();
  });
});

describe("dragging a tab", () => {
  test("drops it before the tab it was let go on, counted in the row as it stood", () => {
    expect(moveTab(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "a", "c", "d"]);
    expect(moveTab(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
    expect(moveTab(["a", "b", "c", "d"], 1, 4)).toEqual(["a", "c", "d", "b"]);
    expect(moveTab(["a", "b"], 1, 1)).toEqual(["a", "b"]);
    expect(moveTab(["a", "b"], 5, 0)).toEqual(["a", "b"]);
  });
});

describe("pinning a tab", () => {
  const ids = (tabs: Array<{ id: string }>): string[] => tabs.map((tab) => tab.id);

  test("moves it to the left end after the tabs pinned before it, and a tab let go stands first after them", () => {
    const row = [{ id: "a" }, { id: "b", pinned: true }, { id: "c" }, { id: "d" }];
    const pinned = pinTab(row, 3, true);

    expect(ids(pinned)).toEqual(["b", "d", "a", "c"]);
    expect(pinned[1]?.pinned).toBe(true);
    expect(ids(pinTab(pinned, 0, false))).toEqual(["d", "b", "a", "c"]);
    expect(pinnedFirst(["x", "p", "y"], (id) => id === "p")).toEqual(["p", "x", "y"]);
  });

  test("keeps a drag on its own side of the edge between pinned tabs and the rest", () => {
    const pinned = (id: string): boolean => id === "p" || id === "q";

    expect(moveTab(["p", "q", "a", "b"], 3, 0, pinned)).toEqual(["p", "q", "b", "a"]);
    expect(moveTab(["p", "q", "a", "b"], 0, 4, pinned)).toEqual(["q", "p", "a", "b"]);
    expect(moveTab(["p", "q", "a", "b"], 1, 0, pinned)).toEqual(["q", "p", "a", "b"]);
    expect(moveTab(["p", "q", "a", "b"], 2, 4, pinned)).toEqual(["p", "q", "b", "a"]);
  });
});

describe("the bar's menu", () => {
  test("closes the others, those to the right or all of them, and never a pinned tab", () => {
    expect(othersOf([false, false, false, false], 1)).toEqual([0, 2, 3]);
    expect(rightOf([false, false, false, false], 1)).toEqual([2, 3]);
    expect(rightOf([false, false, false, false], 3)).toEqual([]);
    expect(othersOf([true, false, false], 2)).toEqual([1]);
    expect(rightOf([true, false, true, false], 0)).toEqual([1, 3]);
    expect(allOf([true, false, false])).toEqual([1, 2]);
  });
});

describe("a file tab's label", () => {
  test("is the file's name, or its path where another open file has the same name", () => {
    const paths = ["server/a/index.ts", "server/b/index.ts", "server/main.ts"];

    expect(fileTabLabel(paths, "server/main.ts")).toBe("main.ts");
    expect(fileTabLabel(paths, "server/a/index.ts")).toBe("server/a/index.ts");
    expect(baseName("README.md")).toBe("README.md");
  });
});
