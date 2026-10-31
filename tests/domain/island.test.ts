import { describe, expect, test } from "bun:test";

import * as islandModule from "~/domain/island";
import { emptyIsland, expands, messageOf, raise, settle, TONE_ICONS, TONE_MS, WAITING_MAX } from "~/domain/island";

import type { IslandMessage, IslandState } from "~/domain/island";
import type { Translate } from "#shared/wording";

const wording: Translate = (key) => key;

function said(title: string, over: Partial<IslandMessage> = {}): IslandMessage {
  return { ...messageOf({ title }), ...over };
}

function standing(state: IslandState): string | null {
  return state.standing?.title ?? null;
}

function line(state: IslandState): string[] {
  return state.waiting.map((one) => one.title);
}

function piled(...titles: string[]): IslandState {
  return titles.reduce((state, title) => raise(state, said(title)), emptyIsland());
}

describe("what a caller's words are filled out into", () => {
  test("a tone brings its own mark and its own time, and the words are all that has to be written", () => {
    const one = messageOf({ title: "Copied." });

    expect(one.tone).toBe("info");
    expect(one.icon).toBe(TONE_ICONS.info);
    expect(one.duration).toBe(TONE_MS.info);
    expect(one.description).toBeNull();
    expect(one.to).toBeNull();
    expect(one.actions).toEqual([]);
  });

  test("something gone wrong is given longer to be read than something gone through", () => {
    expect(messageOf({ title: "x", tone: "error" }).duration).toBeGreaterThan(messageOf({ title: "x", tone: "success" }).duration!);
  });

  test("a time of none is kept as none, which is what a notice offering the only undo asks for", () => {
    expect(messageOf({ title: "Sending", duration: null }).duration).toBeNull();
  });

  test("two sayings of the same words are two notices unless the caller named them one", () => {
    expect(messageOf({ title: "Same words" }).key).not.toBe(messageOf({ title: "Same words" }).key);
    expect(messageOf({ title: "Same words", key: "notice:one" }).key).toBe("notice:one");
  });
});

describe("how wide it stands", () => {
  test("a line on its own stands as a line; a description or something to press widens it", () => {
    expect(expands(said("One line"))).toBe(false);
    expect(expands(said("One line", { description: "More" }))).toBe(true);
    expect(expands(said("One line", { actions: [{ label: wording("common.action.cancel"), press: () => undefined }] }))).toBe(true);
  });
});

// The pill tells and never asks (`docs/components.md`, "Messages"): a question the reader answers
// before an action is the question module's dialog, so the island offers no way of asking one.
describe("the island tells and never asks", () => {
  test("what a screen calls holds no question, and nothing it fills out is one", () => {
    const keys = Object.keys(islandModule);

    expect(keys).toContain("useIsland");
    expect(keys.filter((key) => /question|ask/i.test(key))).toEqual([]);
    expect(Object.keys(messageOf({ title: "Copied." })).sort()).toEqual(["actions", "description", "duration", "icon", "key", "title", "to", "tone"]);
  });
});

describe("what happens when two pieces of news arrive together", () => {
  test("the first stands and the rest wait, in the order they came", () => {
    const state = piled("one", "two", "three");

    expect(standing(state)).toBe("one");
    expect(line(state)).toEqual(["two", "three"]);
  });

  test("the one standing goes and the next takes its place at once", () => {
    const piled3 = piled("one", "two", "three");
    const state = settle(piled3, piled3.standing!.key);

    expect(standing(state)).toBe("two");
    expect(line(state)).toEqual(["three"]);
  });

  test("the last of them goes and the island is empty", () => {
    const one = raise(emptyIsland(), said("one"));

    expect(standing(settle(one, one.standing!.key))).toBeNull();
  });

  test("a message settled while it is still waiting never stands at all", () => {
    const state = piled("one", "two", "three");
    const gone = settle(state, state.waiting[0]!.key);

    expect(standing(gone)).toBe("one");
    expect(line(gone)).toEqual(["three"]);
  });

  test("a line longer than it may be drops its oldest, since the news wanted is the newest", () => {
    const titles = Array.from({ length: WAITING_MAX + 3 }, (_, at) => `notice ${at}`);
    const state = piled(...titles);

    expect(standing(state)).toBe("notice 0");
    expect(state.waiting).toHaveLength(WAITING_MAX);
    expect(line(state).at(-1)).toBe(titles.at(-1));
    expect(line(state).at(0)).toBe(`notice ${titles.length - WAITING_MAX}`);
  });
});

describe("the same thing said twice", () => {
  test("replaces itself where it stands rather than queueing behind itself", () => {
    const first = raise(emptyIsland(), said("1 new item", { key: "notice:one" }));
    const again = raise(first, said("2 new items", { key: "notice:one" }));

    expect(standing(again)).toBe("2 new items");
    expect(again.waiting).toEqual([]);
  });

  test("and where it is still waiting, it is replaced there and keeps its place in the line", () => {
    const state = raise(raise(piled("one"), said("two", { key: "notice:one" })), said("three", { key: "notice:one" }));

    expect(standing(state)).toBe("one");
    expect(line(state)).toEqual(["three"]);
  });
});
