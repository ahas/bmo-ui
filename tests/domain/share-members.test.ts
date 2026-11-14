import { describe, expect, test } from "bun:test";
import { effectScope, nextTick } from "vue";

import { MEMBER_PERMISSION, permissionItems, SHARE_PERMISSIONS, useShareMembers } from "~/domain/share-members";

import type { ShareMember, ShareMemberRoad, ShareMembers, SharePermission, SharePerson } from "~/domain/share-members";
import type { Translate } from "#shared/wording";

// The member part of the one share dialog (`docs/components.md`, "Sharing", Members), driven over a
// stand-in host's road: the search, the picking, the rows, the permission and the removal each go
// through the road the host hands, and nothing stands before the road has taken it.

const wording: Translate = (key) => key;

const FIRST: SharePerson = { user: "1", name: "tester", organization: "Platform", jobTitle: "Engineer" };
const SECOND: SharePerson = { user: "2", name: "reviewer", organization: "Design", jobTitle: "Designer" };
const THIRD: SharePerson = { user: "3", name: "qa-admin", organization: "Quality", jobTitle: "Lead" };

interface Call {
  name: string;
  args: unknown[];
}

// A host's road kept in memory, every call written down, and a refusal where one is asked for.
function standIn(people: SharePerson[], shared: ShareMember[] = []) {
  const calls: Call[] = [];
  const refusing = new Set<string>();
  let kept = [...shared];

  function call(name: string, ...args: unknown[]): void {
    calls.push({ name, args });

    if (refusing.has(name)) throw new Error(`${name} refused`);
  }

  const road: ShareMemberRoad = {
    search: async (words) => {
      call("search", words);

      return people.filter((person) => person.name.includes(words));
    },
    read: async () => {
      call("read");

      return kept;
    },
    share: async (users, permission) => {
      call("share", users, permission);
      kept = [...kept, ...people.filter((person) => users.includes(person.user)).map((person) => ({ person, permission }))];
    },
    change: async (user, permission) => {
      call("change", user, permission);
    },
    remove: async (user) => {
      call("remove", user);
      kept = kept.filter((member) => member.person.user !== user);
    }
  };

  return { road, calls, refusing };
}

function members(road: ShareMemberRoad | undefined, pauseMs?: number): { state: ShareMembers; counts: number[]; stop: () => void } {
  const counts: number[] = [];
  const scope = effectScope();
  const state = scope.run(() =>
    useShareMembers({ t: wording, road: () => road, explain: (error, fallback) => `${fallback}: ${(error as Error).message}`, told: (count) => counts.push(count), pauseMs })
  );

  if (state === undefined) throw new Error("The scope ran nothing.");

  return { state, counts, stop: () => scope.stop() };
}

const users = (state: ShareMembers) => state.members.value.map((member) => member.person.user);

describe("the permissions", () => {
  test("are read and edit, read first, and a member is given read", () => {
    expect([...SHARE_PERMISSIONS]).toEqual(["read", "edit"]);
    expect(MEMBER_PERMISSION).toBe("read");
    expect(permissionItems(wording)).toEqual([
      { value: "read", label: "common.label.permission_read" },
      { value: "edit", label: "common.label.permission_edit" }
    ]);
    expect(permissionItems(wording, ["edit"])).toEqual([{ value: "edit", label: "common.label.permission_edit" }]);
  });

  test("a host that names none grants both", () => {
    const { state, stop } = members(standIn([]).road);

    expect(state.permissions.value).toEqual<SharePermission[]>(["read", "edit"]);
    expect(state.choices({ person: FIRST, permission: "read" })).toEqual<SharePermission[]>(["read", "edit"]);
    stop();
  });

  test("a host's grant is read first whatever order it names it in", () => {
    const host = standIn([]);
    const { state, stop } = members({ ...host.road, permissions: ["edit", "read"] });

    expect(state.permissions.value).toEqual<SharePermission[]>(["read", "edit"]);
    stop();
  });

  test("a row offers what the host grants, and the permission its member holds where the host no longer grants it", () => {
    const host = standIn([]);
    const { state, stop } = members({ ...host.road, permissions: ["read"] });

    expect(state.permissions.value).toEqual<SharePermission[]>(["read"]);
    expect(state.choices({ person: FIRST, permission: "read" })).toEqual<SharePermission[]>(["read"]);
    expect(state.choices({ person: FIRST, permission: "edit" })).toEqual<SharePermission[]>(["read", "edit"]);
    stop();
  });

  test("a host that grants edit alone shares at edit", async () => {
    const host = standIn([FIRST]);
    const { state, stop } = members({ ...host.road, permissions: ["edit"] });

    await state.read();
    state.chosen.value = [FIRST];
    await state.share();

    expect(host.calls.at(-1)).toEqual({ name: "share", args: [["1"], "edit"] });
    expect(state.members.value).toEqual([{ person: FIRST, permission: "edit" }]);
    stop();
  });
});

describe("the listing", () => {
  test("reads who it is shared with through the road and tells the screen the count", async () => {
    const host = standIn([FIRST, SECOND], [{ person: FIRST, permission: "edit" }]);
    const { state, counts, stop } = members(host.road);

    await state.read();

    expect(state.members.value).toEqual([{ person: FIRST, permission: "edit" }]);
    expect(state.loading.value).toBe(false);
    expect(counts).toEqual([1]);
    stop();
  });

  test("a refused read says why in the host's words", async () => {
    const host = standIn([]);
    const { state, stop } = members(host.road);

    host.refusing.add("read");
    await state.read();

    expect(state.failed.value).toBe("common.error.members_read_failed: read refused");
    stop();
  });
});

describe("the search", () => {
  test("asks the road for the words and offers no one it is already shared with", async () => {
    const host = standIn([FIRST, SECOND, THIRD], [{ person: SECOND, permission: "read" }]);
    const { state, stop } = members(host.road);

    await state.read();
    await state.find("e");

    expect(host.calls.at(-1)).toEqual({ name: "search", args: ["e"] });
    expect(state.offered.value.map((person) => person.user)).toEqual(["1"]);
    stop();
  });

  test("an answer to words already typed past is dropped", async () => {
    const host = standIn([FIRST, SECOND]);
    const { state, stop } = members(host.road);
    const late = state.find("tester");

    await state.find("reviewer");
    await late;

    expect(state.offered.value).toEqual([SECOND]);
    expect(state.searching.value).toBe(false);
    stop();
  });

  test("empty words ask nothing and offer no one", async () => {
    const host = standIn([FIRST]);
    const { state, stop } = members(host.road);

    await state.find("  ");

    expect(host.calls).toEqual([]);
    expect(state.offered.value).toEqual([]);
    stop();
  });

  test("words typed are searched once typing stands still", async () => {
    const host = standIn([FIRST, SECOND]);
    const { state, stop } = members(host.road, 0);

    state.words.value = "rev";
    await nextTick();
    state.words.value = "revi";
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.calls).toEqual([{ name: "search", args: ["revi"] }]);
    expect(state.offered.value).toEqual([SECOND]);
    stop();
  });

  test("a refused search says why", async () => {
    const host = standIn([FIRST]);
    const { state, stop } = members(host.road);

    host.refusing.add("search");
    await state.find("tester");

    expect(state.failed.value).toBe("common.error.member_search_failed: search refused");
    stop();
  });
});

describe("the selection", () => {
  test("shares with everyone picked at once, at read, lists them and starts the search over", async () => {
    const host = standIn([FIRST, SECOND, THIRD]);
    const { state, counts, stop } = members(host.road);

    await state.read();
    await state.find("e");
    state.chosen.value = [FIRST, THIRD];
    await state.share();

    expect(host.calls.at(-1)).toEqual({ name: "share", args: [["1", "3"], "read"] });
    expect(state.members.value).toEqual([
      { person: FIRST, permission: "read" },
      { person: THIRD, permission: "read" }
    ]);
    expect(state.chosen.value).toEqual([]);
    expect(state.words.value).toBe("");
    expect(state.offered.value).toEqual([]);
    expect(counts).toEqual([0, 2]);
    stop();
  });

  test("with nobody picked nothing is asked", async () => {
    const host = standIn([FIRST]);
    const { state, stop } = members(host.road);

    await state.share();

    expect(host.calls).toEqual([]);
    stop();
  });

  test("a refused share lists nobody new and keeps the pick", async () => {
    const host = standIn([FIRST]);
    const { state, stop } = members(host.road);

    host.refusing.add("share");
    state.chosen.value = [FIRST];
    await state.share();

    expect(state.members.value).toEqual([]);
    expect(state.chosen.value).toEqual([FIRST]);
    expect(state.failed.value).toBe("common.error.member_share_failed: share refused");
    stop();
  });
});

describe("a member's row", () => {
  const both = (): ShareMember[] => [
    { person: FIRST, permission: "read" },
    { person: SECOND, permission: "read" }
  ];

  test("a permission changed goes through the road and stands once taken", async () => {
    const host = standIn([FIRST, SECOND], both());
    const { state, stop } = members(host.road);

    await state.read();
    await state.change("2", "edit");

    expect(host.calls.at(-1)).toEqual({ name: "change", args: ["2", "edit"] });
    expect(state.members.value.map((member) => member.permission)).toEqual<SharePermission[]>(["read", "edit"]);
    expect(state.working.value).toEqual([]);
    stop();
  });

  test("a refused change keeps the permission that is kept", async () => {
    const host = standIn([FIRST], [{ person: FIRST, permission: "read" }]);
    const { state, stop } = members(host.road);

    await state.read();
    host.refusing.add("change");
    await state.change("1", "edit");

    expect(state.members.value[0]?.permission).toBe("read");
    expect(state.failed.value).toBe("common.error.member_change_failed: change refused");
    stop();
  });

  test("taking one off goes through the road, leaves the others and tells the screen the count", async () => {
    const host = standIn([FIRST, SECOND], both());
    const { state, counts, stop } = members(host.road);

    await state.read();
    await state.remove("1");

    expect(host.calls.at(-1)).toEqual({ name: "remove", args: ["1"] });
    expect(users(state)).toEqual(["2"]);
    expect(counts).toEqual([2, 1]);
    stop();
  });

  test("a refused removal leaves the member listed", async () => {
    const host = standIn([FIRST], [{ person: FIRST, permission: "read" }]);
    const { state, stop } = members(host.road);

    await state.read();
    host.refusing.add("remove");
    await state.remove("1");

    expect(users(state)).toEqual(["1"]);
    expect(state.failed.value).toBe("common.error.unshare_failed: remove refused");
    stop();
  });
});

describe("a host that offers no member road", () => {
  test("reads, searches and shares nothing", async () => {
    const { state, counts, stop } = members(undefined);

    state.chosen.value = [FIRST];
    await state.read();
    await state.find("tester");
    await state.share();

    expect(state.members.value).toEqual([]);
    expect(state.offered.value).toEqual([]);
    expect(counts).toEqual([]);
    stop();
  });
});
