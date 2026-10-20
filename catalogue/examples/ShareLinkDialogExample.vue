<template>
  <ShareLinkDialog v-model:open="open" :road="road" :spans="spans" span="7" :subject="'plan.md'" @shared="markShared" />
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import type { ShareLink, ShareMark, ShareRoad, ShareSpan } from "../../app/domain/share-links";

const { t } = useI18n();
const open = ref(true);
const shared = ref<ShareMark | null>(null);

// The host's own client stands behind these; a link kept in memory takes its place here.
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

const spans = computed<ShareSpan[]>(() => [
  { value: "1", label: t("common.label.days", { d: 1 }) },
  { value: "7", label: t("common.label.days", { d: 7 }) },
  { value: "forever", label: t("common.label.forever") }
]);

function markShared(mark: ShareMark | null): void {
  shared.value = mark;
}
</script>
