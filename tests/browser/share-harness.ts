import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, nextTick, onScopeDispose, ref, watch } from "vue";
import { createI18n } from "vue-i18n";

import UApp from "@nuxt/ui/components/App.vue";
import UButton from "@nuxt/ui/components/Button.vue";

import ShareDialog from "../../app/components/ShareDialog.vue";
import { watchInputModality } from "../../app/domain/modality";
import { TOOLTIP_PROVIDER } from "../../app/domain/tooltip";
import sheet from "./share-harness.css?inline";

import type { Ref } from "vue";

import type { ShareLink, ShareMark, ShareRoad, ShareSpan } from "../../app/domain/share-links";
import type { ShareMember, ShareMemberRoad, SharePerson } from "../../app/domain/share-members";

// The one share dialog (`docs/components.md`, "Sharing") on a page that says nothing else, over a
// stand-in host's roads: a link and the members it is shared with kept in memory, every call the
// dialog makes written down where the test reads it, and what the dialog tells the screen behind
// shown in two lines. The page's address says whether the host offers the member road at all. The
// page stands outside Nuxt, so it wires itself as a host's page is wired: the library's app root
// holding the boundary's tooltip setting, the framework's names a host binds, and the words handed
// over here.

// The layer's code reaches the framework's own names without importing them, since Nuxt binds them
// in a host; a page standing outside Nuxt hands the same names over before anything opens.
const states = new Map<string, Ref<unknown>>();

Object.assign(globalThis, {
  watch,
  nextTick,
  onScopeDispose,
  useState: (key: string, start: () => unknown) => {
    if (!states.has(key)) states.set(key, ref(start()));

    return states.get(key);
  },
  useRouter: () => ({ options: {}, beforeEach: () => undefined })
});

const WORDS = {
  common: {
    action: { cancel: "Cancel", close: "Close", copy: "Copy", create_link: "Create link", discard: "Discard", share: "Share", unshare: "Unshare" },
    aria: { member_permission: "Permission of {name}", share_address: "Share address" },
    label: {
      days: "{d} days",
      expiry: "Expiry",
      forever: "Never ends",
      link: "Link",
      members: "Members",
      permission_edit: "Edit",
      permission_read: "Read",
      share_until: "Until {date}",
      short_day_format: "YY/MM/DD"
    },
    placeholder: { member_search: "Search members" },
    status: { members_loading: "Reading members", no_members: "Shared with nobody", share_loading: "Reading the link" },
    title: { share: "Share" }
  }
};

const PEOPLE: SharePerson[] = [
  { user: "1", name: "tester", organization: "Platform", jobTitle: "Engineer" },
  { user: "2", name: "reviewer", organization: "Design", jobTitle: "Designer" },
  { user: "3", name: "qa-admin", organization: "Quality", jobTitle: "Lead" }
];

export interface ShareCall {
  name: string;
  args: unknown[];
}

declare global {
  interface Window {
    shareCalls: ShareCall[];
    // Lets the held read of the members answer, on a page whose address holds it.
    releaseMembers: () => void;
  }
}

window.shareCalls = [];

const query = new URLSearchParams(window.location.search);

// The first read of the members waits for the test where the address asks, so its skeleton stands.
const held = new Promise<void>((resolve) => {
  window.releaseMembers = resolve;

  if (query.get("hold") !== "1") resolve();
});

function called(name: string, ...args: unknown[]): void {
  window.shareCalls.push({ name, args });
}

let kept: ShareLink | null = null;

const road: ShareRoad = {
  page: (link) => `/shared/${link.token}`,
  read: async () => {
    called("link.read");

    return kept;
  },
  make: async (span) => {
    called("link.make", span);
    kept = { token: "a1b2c3", expiresAt: span === "forever" ? null : Math.floor(Date.now() / 1000) + Number(span) * 86400 };

    return kept;
  },
  remove: async (link) => {
    called("link.remove", link.token);
    kept = null;
  }
};

// The people directory stands behind the search, matching a name, an organization or a job title;
// the host's own service behind the rest. One member stands from the start, holding edit; the host
// grants read alone where the address says so.
const grantsRead = query.get("grant") === "read";

let sharedWith: ShareMember[] = [{ person: PEOPLE[1]!, permission: "edit" }];

const members: ShareMemberRoad = {
  search: async (words) => {
    called("members.search", words);

    const asked = words.toLowerCase();

    return PEOPLE.filter((person) => [person.name, person.organization, person.jobTitle].some((field) => field.toLowerCase().includes(asked)));
  },
  read: async () => {
    called("members.read");
    await held;

    return sharedWith;
  },
  share: async (users, permission) => {
    called("members.share", users, permission);
    sharedWith = [...sharedWith, ...PEOPLE.filter((person) => users.includes(person.user)).map((person) => ({ person, permission }))];
  },
  change: async (user, permission) => {
    called("members.change", user, permission);
    sharedWith = sharedWith.map((member) => (member.person.user === user ? { ...member, permission } : member));
  },
  remove: async (user) => {
    called("members.remove", user);
    sharedWith = sharedWith.filter((member) => member.person.user !== user);
  },
  ...(grantsRead ? { permissions: ["read"] as const } : {})
};

const SPANS: ShareSpan[] = [
  { value: "7", label: "7 days" },
  { value: "forever", label: "Never ends" }
];

const offersMembers = query.get("members") !== "0";

const Page = defineComponent(() => {
  const open = ref(false);
  const mark = ref("none");
  const count = ref("none");

  function told(given: ShareMark | null): void {
    mark.value = given === null ? "no link" : given.expiresAt === null ? "link, no end" : "link with an end";
  }

  return () =>
    h(UApp, { tooltip: TOOLTIP_PROVIDER }, () => [
      h(UButton, { label: "Open", "data-open": "", onClick: () => (open.value = true) }),
      h("p", { "data-mark": "" }, mark.value),
      h("p", { "data-count": "" }, count.value),
      h(ShareDialog, {
        open: open.value,
        "onUpdate:open": (value: boolean) => (open.value = value),
        road,
        spans: SPANS,
        members: offersMembers ? members : undefined,
        subject: "plan.md",
        onShared: told,
        onMembers: (given: number) => (count.value = String(given))
      })
    ]);
});

const style = document.createElement("style");

style.textContent = sheet;
document.head.append(style);

watchInputModality(document);

// The library's build answers its own app configuration, which holds none of the layer's settings;
// the zone every time is shown in is set on it as a host's configuration sets it.
Object.assign(useAppConfig(), { bmoUi: { zone: "UTC" } });

createApp(Page)
  .use(createI18n({ legacy: false, locale: "en", messages: { en: WORDS }, missingWarn: false, fallbackWarn: false }))
  .use(ui)
  .mount("#page");
