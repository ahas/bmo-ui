<template>
  <!-- One share link: the one that stands, or the making of one (`docs/components.md`, "Share
       links"). It is a small form rather than a part of the screen lifted out, so it is in the middle
       at every width, and the settings dialog is what puts it there and answers the back gesture. -->
  <SettingsDialog v-model:open="open" :title="$t('common.title.share_link')" :description="props.subject">
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

          <UTooltip :text="$t('common.action.copy')">
            <UButton color="neutral" variant="ghost" square icon="i-material-symbols-content-copy-outline" :aria-label="$t('common.action.copy')" @click="copy" />
          </UTooltip>
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

    <template v-if="!loading" #footer>
      <UButton v-if="shown === null" :label="$t('common.action.create_link')" :loading="busy" :disabled="span === undefined" @click="make" />
      <UButton v-else :label="$t('common.action.unshare')" color="error" :loading="busy" @click="revoke" />
    </template>
  </SettingsDialog>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { copyText } from "../domain/clipboard";
import { failureText } from "../domain/errors";
import { useIsland } from "../domain/island";
import { shareEnded, shareUntilText } from "../domain/share-links";
import { formatDateClock, useNowSeconds } from "../domain/time";

import type { ShareLink, ShareMark, ShareRoad, ShareSpan } from "../domain/share-links";

// One link at a time. Where the thing shared has one, this opens on it instead of on the form: its
// address to copy, the day it stands until, and the one control that ends it. A link is given
// another life by being ended and made again, which is why nothing here edits one.
//
// Making one does not close this. The form gives its place to the link it just made, in the dialog
// already standing, so the address is read and copied where it was asked for.
//
// The host hands over the road its links go by and the spans it offers; this dialog knows nothing
// of what a link opens.

interface Props {
  road: ShareRoad;
  spans: ShareSpan[];
  // The value of the span the form offers first; the first of the spans where none is named.
  span?: string;
  // What is being shared, where the screen behind the dialog does not already say it.
  subject?: string;
  // The host's own reading of a failure, where it words one beyond the server's message.
  explain?: (error: unknown, fallback: string) => string;
}

const props = withDefaults(defineProps<Props>(), { span: undefined, subject: undefined, explain: failureText });
const open = defineModel<boolean>("open", { default: false });
// What the screen is to say about being shared. It is told from here: this is the one place a link
// is made and ended, so this is the one place that knows the moment either happened.
const emit = defineEmits<{ shared: [mark: ShareMark | null] }>();

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
// host's first again each time.
watch(
  open,
  (standing) => {
    if (!standing) {
      return;
    }

    span.value = props.span ?? props.spans[0]?.value;
    sync();
    void read();
  },
  { immediate: true }
);
</script>
