<template>
  <!-- One thing shared: by its link, and with the members of the reader's company where the host
       offers them (`docs/components.md`, "Sharing"). It is a small form rather than a part of the
       screen lifted out, so it is in the middle at every width, and the settings dialog is what puts
       it there and answers the back gesture. -->
  <SettingsDialog v-model:open="open" :title="$t('common.title.share')" :description="props.subject">
    <ContentSkeleton v-if="loading" list-class="flex flex-col gap-3" :label="$t('common.status.share_loading')">
      <div class="flex flex-col gap-1">
        <SkeletonBar class="h-4 w-12" />
        <SkeletonBar class="h-8 w-full rounded-md" />
      </div>
    </ContentSkeleton>

    <template v-else-if="shown !== null">
      <UFormField :label="$t('common.label.link')">
        <div class="flex items-center gap-2">
          <UInput :model-value="address" readonly class="min-w-0 flex-1" :ui="{ base: 'font-mono' }" :aria-label="$t('common.aria.share_address')" @focus="selectAll" />

          <IconButton :label="$t('common.action.copy')" icon="i-material-symbols-content-copy-outline" @click="copy" />
        </div>
      </UFormField>

      <div class="flex items-center">
        <HintTip :text="endsAt" :disabled="endsAt === undefined">
          <UBadge :color="ended ? 'error' : 'success'" variant="subtle" class="tabular-nums" :label="until" />
        </HintTip>
      </div>
    </template>

    <UFormField v-else :label="$t('common.label.expiry')">
      <USelect v-model="span" :items="props.spans" value-key="value" class="w-full" :content="{ align: 'start' }" :aria-label="$t('common.label.expiry')" />
    </UFormField>

    <UAlert v-if="failed !== ''" color="error" variant="subtle" :description="failed" />

    <!-- The member part stands only where the host hands the road members go by. -->
    <section v-if="props.members !== undefined" class="flex min-w-0 flex-col gap-3" data-share-members>
      <UFormField :label="$t('common.label.members')">
        <div class="flex items-center gap-2">
          <UInputMenu
            v-model="chosen"
            v-model:search-term="words"
            :open="menuStands"
            :items="menuItems ?? []"
            multiple
            ignore-filter
            by="user"
            label-key="name"
            :reset-search-term-on-select="false"
            :loading="searching"
            icon="i-material-symbols-person-search-outline"
            :placeholder="$t('common.placeholder.member_search')"
            :aria-label="$t('common.label.members')"
            class="min-w-0 flex-1"
            :content="{ align: 'start' }"
            data-member-search
            @update:open="menuOpen = $event"
          >
            <template #item-label="{ item }">
              <SearchText :text="item.name" :query="words" />
            </template>

            <template #item-description="{ item }">
              <SearchText :text="personLine(item)" :query="words" />
            </template>
          </UInputMenu>

          <UButton :label="$t('common.action.share')" :loading="sharing" :disabled="chosen.length === 0" data-member-share @click="share" />
        </div>
      </UFormField>

      <ContentSkeleton v-if="membersLoading" list-class="flex flex-col gap-2" :label="$t('common.status.members_loading')">
        <div class="flex items-center gap-2" data-member-skeleton>
          <div class="flex min-w-0 flex-1 flex-col">
            <SkeletonLine size="base" width="w-24" />
            <SkeletonLine width="w-40" />
          </div>
          <SkeletonBar class="h-8 w-20 rounded-md" />
          <SkeletonBar class="size-8 rounded-md" />
        </div>
      </ContentSkeleton>

      <p v-else-if="members.length === 0" class="text-sm text-muted" data-no-members>{{ $t("common.status.no_members") }}</p>

      <ul v-else class="flex flex-col gap-2" data-member-list>
        <li v-for="member in members" :key="member.person.user" class="flex items-center gap-2" :data-member="member.person.user">
          <div class="flex min-w-0 flex-1 flex-col">
            <span class="truncate">{{ member.person.name }}</span>
            <span v-if="personLine(member.person) !== ''" class="truncate text-sm text-muted">{{ personLine(member.person) }}</span>
          </div>

          <!-- A row with one permission to offer says it in words: there is nothing to choose. -->
          <USelect
            v-if="choiceItems(member).length !== 1"
            :model-value="member.permission"
            :items="choiceItems(member)"
            value-key="value"
            :loading="working.includes(member.person.user)"
            :aria-label="$t('common.aria.member_permission', { name: member.person.name })"
            :content="{ align: 'end' }"
            data-member-permission
            @update:model-value="change(member.person.user, $event)"
          />

          <span v-else class="shrink-0 text-sm" data-member-permission>{{ choiceItems(member)[0]?.label }}</span>

          <IconButton
            :label="$t('common.action.unshare')"
            icon="i-material-symbols-person-remove-outline"
            :loading="working.includes(member.person.user)"
            data-member-remove
            @click="remove(member.person.user)"
          />
        </li>
      </ul>

      <UAlert v-if="membersFailed !== ''" color="error" variant="subtle" :description="membersFailed" />
    </section>

    <template v-if="!loading" #footer>
      <UButton v-if="shown === null" :label="$t('common.action.create_link')" :loading="busy" :disabled="span === undefined" @click="make" />
      <UButton v-else :label="$t('common.action.unshare')" color="error" :loading="busy" @click="revoke" />
    </template>
  </SettingsDialog>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { copyText } from "../domain/clipboard";
import { useHeldWhileClosing } from "../domain/closing";
import { failureText } from "../domain/errors";
import { useIsland } from "../domain/island";
import { shareEnded, shareUntilText } from "../domain/share-links";
import { permissionItems, useShareMembers } from "../domain/share-members";
import { formatDateClock, useNowSeconds } from "../domain/time";

import type { ShareLink, ShareMark, ShareRoad, ShareSpan } from "../domain/share-links";
import type { PermissionItem, ShareMember, ShareMemberRoad, SharePerson } from "../domain/share-members";

// One link at a time. Where the thing shared has one, the link part opens on it instead of on the
// form: its address to copy, the day it stands until, and the one control that ends it. A link is
// given another life by being ended and made again, which is why nothing here edits one.
//
// Making one does not close this. The form gives its place to the link it just made, in the dialog
// already standing, so the address is read and copied where it was asked for.
//
// The members it is shared with stand under the link, where the host hands their road: found by a
// search, shared with at the permission a member is given, changed among the permissions the host
// grants and taken off each on its own.
//
// The host hands over the roads its links and members go by and the spans it offers; this dialog
// knows nothing of what a link opens or of who the people are.

interface Props {
  road: ShareRoad;
  spans: ShareSpan[];
  // The value of the span the form offers first; the first of the spans where none is named.
  span?: string;
  // The road members go by; left out, the dialog shares by link alone.
  members?: ShareMemberRoad;
  // What is being shared, where the screen behind the dialog does not already say it.
  subject?: string;
  // The host's own reading of a failure, where it words one beyond the server's message.
  explain?: (error: unknown, fallback: string) => string;
}

const props = withDefaults(defineProps<Props>(), { span: undefined, members: undefined, subject: undefined, explain: failureText });
const open = defineModel<boolean>("open", { default: false });
// What the screen is to say about being shared. It is told from here: this is the one place a link
// is made and ended and a member shared with and taken off, so this is the one place that knows the
// moment either happened.
const emit = defineEmits<{ shared: [mark: ShareMark | null]; members: [count: number] }>();

const { t } = useI18n();
const island = useIsland(t);

const shown = ref<ShareLink | null>(null);
const span = ref<string | undefined>(undefined);
const loading = ref(false);
const busy = ref(false);
const failed = ref("");
// The clock the link's end is read against, moved on while the dialog stands so a link that ends in
// front of the reader says so.
const { now, sync } = useNowSeconds();

const {
  members,
  loading: membersLoading,
  words,
  offered,
  searching,
  chosen,
  sharing,
  working,
  failed: membersFailed,
  read: readMembers,
  share,
  change,
  remove,
  choices,
  clear: clearMembers
} = useShareMembers({
  t,
  road: () => props.members,
  explain: (error, fallback) => props.explain(error, fallback),
  told: (count) => emit("members", count)
});

// The permissions one member's row offers, as its dropdown names them.
function choiceItems(member: ShareMember): PermissionItem[] {
  return permissionItems(t, choices(member));
}

// The people found stand in a menu only while words are typed, and what it offered is held while it
// closes, so a share that empties the search never shows an empty menu on its way out.
const menuOpen = ref(false);
const menuStands = computed(() => menuOpen.value && words.value.trim() !== "");
const menuItems = useHeldWhileClosing(() => (menuStands.value ? offered.value : null));

// An address somebody outside can open: the road's page read against the page this stands on, since
// a path relative to it would mean nothing once it is sent.
const address = computed(() => (shown.value === null || import.meta.server ? "" : new URL(props.road.page(shown.value), window.location.href).href));

const ended = computed(() => shown.value !== null && shareEnded(shown.value.expiresAt, now.value));
const until = computed(() => (shown.value === null ? "" : shareUntilText(t, shown.value.expiresAt, now.value)));
// The moment the link ends, to the minute, for whoever wants more than its day.
const endsAt = computed(() => {
  const expiresAt = shown.value?.expiresAt ?? null;

  return expiresAt === null ? undefined : formatDateClock(expiresAt);
});

// What a person is told apart by under their name: the organization and the job title they keep.
function personLine(person: SharePerson): string {
  return [person.organization, person.jobTitle].filter((part) => part !== "").join(" · ");
}

function selectAll(event: FocusEvent): void {
  (event.target as HTMLInputElement | null)?.select();
}

function markOf(link: ShareLink | null): ShareMark | null {
  return link === null ? null : { expiresAt: link.expiresAt };
}

async function read(): Promise<void> {
  loading.value = true;
  failed.value = "";

  try {
    const found = await props.road.read();

    shown.value = found;
    emit("shared", markOf(found));
  } catch (error) {
    failed.value = props.explain(error, t("common.error.share_read_failed"));
  } finally {
    loading.value = false;
  }
}

async function make(): Promise<void> {
  if (span.value === undefined) return;

  busy.value = true;
  failed.value = "";

  try {
    const made = await props.road.make(span.value);

    shown.value = made;
    sync();
    emit("shared", markOf(made));
  } catch (error) {
    failed.value = props.explain(error, t("common.error.share_create_failed"));
  } finally {
    busy.value = false;
  }
}

async function revoke(): Promise<void> {
  if (shown.value === null) return;

  busy.value = true;
  failed.value = "";

  try {
    await props.road.remove(shown.value);

    shown.value = null;
    emit("shared", null);
  } catch (error) {
    failed.value = props.explain(error, t("common.error.unshare_failed"));
  } finally {
    busy.value = false;
  }
}

async function copy(): Promise<void> {
  const done = await copyText(address.value);

  island.say(done ? { title: t("common.message.link_copied"), tone: "success" } : { title: t("common.error.link_copy_failed"), tone: "error" });
}

// What stands here is read afresh each time it opens, and is left standing as it closes: a body
// emptied on the way out is a dialog that blinks while it goes. The span the form offers is the
// host's first again each time, and the member search starts empty.
watch(
  open,
  (standing) => {
    if (!standing) {
      return;
    }

    span.value = props.span ?? props.spans[0]?.value;
    sync();
    clearMembers();
    void read();
    void readMembers();
  },
  { immediate: true }
);
</script>
