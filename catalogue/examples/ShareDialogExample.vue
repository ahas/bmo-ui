<template>
  <ShareDialog v-model:open="open" :road="road" :spans="spans" span="7" :members="members" :subject="'plan.md'" @shared="markShared" @members="countMembers" />
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import type { ShareLink, ShareMark, ShareRoad, ShareSpan } from "../../app/domain/share-links";
import type { ShareMember, ShareMemberRoad, SharePerson } from "../../app/domain/share-members";

const { t } = useI18n();
const open = ref(true);
const shared = ref<ShareMark | null>(null);
const memberCount = ref(0);

// The host's own client stands behind these; a link and the members kept in memory take its place here.
let kept: ShareLink | null = null;

const road: ShareRoad = {
  page: (link) => `/shared/${link.token}`,
  read: async () => kept,
  make: async (span) => {
    kept = { token: "a1b2c3", expiresAt: span === "forever" ? null : Math.floor(Date.now() / 1000) + Number(span) * 86400 };

    return kept;
  },
  remove: async () => {
    kept = null;
  }
};

// The people directory stands behind the search, the host's own service behind the rest.
const people: SharePerson[] = [
  { user: "1", name: "tester", organization: "Platform", jobTitle: "Engineer" },
  { user: "2", name: "reviewer", organization: "Design", jobTitle: "Designer" }
];
let sharedWith: ShareMember[] = [];

const members: ShareMemberRoad = {
  search: async (words) => people.filter((person) => person.name.includes(words)),
  read: async () => sharedWith,
  share: async (users, permission) => {
    sharedWith = [...sharedWith, ...people.filter((person) => users.includes(person.user)).map((person) => ({ person, permission }))];
  },
  change: async (user, permission) => {
    sharedWith = sharedWith.map((member) => (member.person.user === user ? { ...member, permission } : member));
  },
  remove: async (user) => {
    sharedWith = sharedWith.filter((member) => member.person.user !== user);
  }
};

const spans = computed<ShareSpan[]>(() => [
  { value: "1", label: t("common.label.days", { d: 1 }) },
  { value: "7", label: t("common.label.days", { d: 7 }) },
  { value: "forever", label: t("common.label.forever") }
]);

function markShared(mark: ShareMark | null): void {
  shared.value = mark;
}

function countMembers(count: number): void {
  memberCount.value = count;
}
</script>
