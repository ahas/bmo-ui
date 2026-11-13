import { computed, onScopeDispose, ref, watch } from "vue";

import type { Ref } from "vue";

import type { Translate } from "../../shared/wording";
import type { WordingKey } from "../../shared/wording-keys";

// The members a thing is shared with, as the one share dialog reads them (`docs/components.md`,
// "Sharing", Members). The dialog keeps the mechanism — the search, the picking, the rows, each
// change taking effect as it is made — and the host hands it the road members are found, read,
// shared with, changed and taken off by.

// One person the thing can be shared with: the account key, and the words they are told apart by.
export interface SharePerson {
  user: string;
  name: string;
  organization: string;
  jobTitle: string;
}

export const SHARE_PERMISSIONS = ["read", "edit"] as const;

export type SharePermission = (typeof SHARE_PERMISSIONS)[number];

// The permission a member is given when the thing is shared with them.
export const MEMBER_PERMISSION: SharePermission = "read";

export interface ShareMember {
  person: SharePerson;
  permission: SharePermission;
}

export interface ShareMemberRoad {
  // The people the thing may be shared with whose words hold these.
  search: (words: string) => Promise<SharePerson[]>;
  // Who it is shared with now.
  read: () => Promise<ShareMember[]>;
  share: (users: string[], permission: SharePermission) => Promise<void>;
  change: (user: string, permission: SharePermission) => Promise<void>;
  remove: (user: string) => Promise<void>;
}

// How long typing stands still before the words are searched.
export const MEMBER_SEARCH_PAUSE_MS = 300;

export interface PermissionItem {
  value: SharePermission;
  label: string;
}

const PERMISSION_WORDS: Record<SharePermission, WordingKey> = {
  read: "common.label.permission_read",
  edit: "common.label.permission_edit"
};

// The permissions as one dropdown offers them, the one a member is given first.
export function permissionItems(t: Translate): PermissionItem[] {
  return SHARE_PERMISSIONS.map((value) => ({ value, label: t(PERMISSION_WORDS[value]) }));
}

export interface ShareMembers {
  members: Ref<ShareMember[]>;
  // The first read of who it is shared with is under way.
  loading: Ref<boolean>;
  // The words typed into the search, searched once typing stands still.
  words: Ref<string>;
  // The people the last search answered whom it is not already shared with.
  offered: Readonly<Ref<SharePerson[]>>;
  searching: Ref<boolean>;
  chosen: Ref<SharePerson[]>;
  sharing: Ref<boolean>;
  // The members whose change or removal is under way.
  working: Ref<string[]>;
  failed: Ref<string>;
  read: () => Promise<void>;
  find: (words: string) => Promise<void>;
  share: () => Promise<void>;
  change: (user: string, permission: SharePermission) => Promise<void>;
  remove: (user: string) => Promise<void>;
  // Back to an empty search and no one picked, as the dialog opens again.
  clear: () => void;
}

export interface ShareMembersOptions {
  t: Translate;
  road: () => ShareMemberRoad | undefined;
  // The host's own reading of a failure, where it words one beyond the server's message.
  explain: (error: unknown, fallback: string) => string;
  // Told the count of members after each read, share and removal.
  told: (count: number) => void;
  // How long typing stands still before the words are searched; `MEMBER_SEARCH_PAUSE_MS` where unset.
  pauseMs?: number;
}

// The member part's state over the road the host hands. Every change goes to the road as it is made
// and stands here only once the road has taken it, so what the rows show is what is kept.
export function useShareMembers(options: ShareMembersOptions): ShareMembers {
  const { t, road, explain, told, pauseMs = MEMBER_SEARCH_PAUSE_MS } = options;

  const members = ref<ShareMember[]>([]);
  const loading = ref(false);
  const words = ref("");
  const found = ref<SharePerson[]>([]);
  const searching = ref(false);
  const chosen = ref<SharePerson[]>([]);
  const sharing = ref(false);
  const working = ref<string[]>([]);
  const failed = ref("");

  const offered = computed(() => found.value.filter((person) => !members.value.some((member) => member.person.user === person.user)));

  // Only the last search asked may land: an answer to words already typed past is dropped.
  let asked = 0;
  let pause: ReturnType<typeof setTimeout> | undefined;

  function stopPause(): void {
    clearTimeout(pause);
    pause = undefined;
  }

  watch(words, (typed) => {
    stopPause();

    if (typed.trim() === "") {
      void find(typed);

      return;
    }

    pause = setTimeout(() => void find(typed), pauseMs);
  });

  onScopeDispose(stopPause);

  async function read(): Promise<void> {
    const given = road();

    if (given === undefined) return;

    loading.value = true;
    failed.value = "";

    try {
      members.value = await given.read();
      told(members.value.length);
    } catch (error) {
      failed.value = explain(error, t("common.error.members_read_failed"));
    } finally {
      loading.value = false;
    }
  }

  async function find(typed: string): Promise<void> {
    const given = road();
    const ask = ++asked;

    if (given === undefined || typed.trim() === "") {
      found.value = [];
      searching.value = false;

      return;
    }

    searching.value = true;

    try {
      const people = await given.search(typed);

      if (ask === asked) {
        found.value = people;
      }
    } catch (error) {
      if (ask === asked) {
        failed.value = explain(error, t("common.error.member_search_failed"));
      }
    } finally {
      if (ask === asked) {
        searching.value = false;
      }
    }
  }

  async function share(): Promise<void> {
    const given = road();
    const picked = chosen.value.filter((person) => !members.value.some((member) => member.person.user === person.user));

    if (given === undefined || picked.length === 0) return;

    sharing.value = true;
    failed.value = "";

    try {
      await given.share(
        picked.map((person) => person.user),
        MEMBER_PERMISSION
      );

      members.value = [...members.value, ...picked.map((person) => ({ person, permission: MEMBER_PERMISSION }))];
      clear();
      told(members.value.length);
    } catch (error) {
      failed.value = explain(error, t("common.error.member_share_failed"));
    } finally {
      sharing.value = false;
    }
  }

  // One member's change or removal, its row marked working until the road has answered.
  async function onMember(user: string, act: (given: ShareMemberRoad) => Promise<void>, fallback: WordingKey): Promise<void> {
    const given = road();

    if (given === undefined) return;

    working.value = [...working.value, user];
    failed.value = "";

    try {
      await act(given);
    } catch (error) {
      failed.value = explain(error, t(fallback));
    } finally {
      working.value = working.value.filter((one) => one !== user);
    }
  }

  async function change(user: string, permission: SharePermission): Promise<void> {
    await onMember(
      user,
      async (given) => {
        await given.change(user, permission);
        members.value = members.value.map((member) => (member.person.user === user ? { ...member, permission } : member));
      },
      "common.error.member_change_failed"
    );
  }

  async function remove(user: string): Promise<void> {
    await onMember(
      user,
      async (given) => {
        await given.remove(user);
        members.value = members.value.filter((member) => member.person.user !== user);
        told(members.value.length);
      },
      "common.error.unshare_failed"
    );
  }

  function clear(): void {
    stopPause();
    asked++;
    chosen.value = [];
    found.value = [];
    searching.value = false;
    words.value = "";
  }

  return { members, loading, words, offered, searching, chosen, sharing, working, failed, read, find, share, change, remove, clear };
}
