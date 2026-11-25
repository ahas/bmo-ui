<!-- The foot of a list read a page at a time (docs/design.md, 「Lists」). Standing at the list's end, it asks
     the host's next page as it comes into view, holds the incoming rows' placeholder while the page is on its way,
     says why a page failed with the one control that asks it again, and draws nothing once the source holds no
     more. Inside a table it is one row across the given number of columns, parted from the rows above by the
     table's line only while it holds a placeholder or a failure, so the measured foot alone draws no line. -->
<template>
  <component
    :is="props.span === undefined ? 'div' : 'tr'"
    v-if="props.more || pages.adding.value || pages.failure.value !== null"
    :class="props.span !== undefined && (pages.adding.value || pages.failure.value !== null) ? 'border-t border-default' : ''"
    data-next-page-foot
  >
    <component :is="props.span === undefined ? 'div' : 'td'" :colspan="props.span" :class="props.span === undefined ? '' : 'p-0'">
      <ContentSkeleton v-if="pages.adding.value" :rows="props.rows" :list-class="props.listClass" :label="props.loadingLabel">
        <slot>
          <div class="py-2" :class="props.inset"><SkeletonLine width="w-2/3" /></div>
        </slot>
      </ContentSkeleton>
      <div v-else-if="pages.failure.value !== null" role="alert" class="flex flex-wrap items-center gap-3 py-3" :class="props.inset" data-next-page-failed>
        <p class="min-w-0 flex-1 text-sm break-words text-error">{{ failedText }}</p>
        <UButton size="sm" color="neutral" variant="subtle" icon="i-material-symbols-refresh" :label="$t('common.action.retry')" @click="pages.retry" />
      </div>
      <div v-if="props.more" ref="foot" aria-hidden="true" class="h-px" />
    </component>
  </component>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue";

import ContentSkeleton from "./ContentSkeleton.vue";
import SkeletonLine from "./SkeletonLine.vue";
import { failureText } from "../domain/errors";
import { useFootInView } from "../domain/foot";
import { useNextPages } from "../domain/next-pages";

interface Props {
  // Whether the source holds more than the list has read.
  more: boolean;
  // Reads one more page and adds it to the list; it throws where the page failed, and answers false where the
  // page did not land for a reason of the host's own, which ends the run without a failure.
  next: () => Promise<boolean | void>;
  // The host's words for a page that failed: words that stand where what was thrown carries none of its own, or the
  // host's own reading of what was thrown.
  failedWords: string | ((error: unknown) => string);
  // Whether another read of the same list is going, which a next page waits behind.
  busy?: boolean;
  // The busy status's name while a page is on its way; the layer's own loading words where none is given.
  loadingLabel?: string;
  // How many placeholders stand for the incoming rows, and the class of the container the rows stand in.
  rows?: number;
  listClass?: string;
  // The columns of the table the list stands in, which the foot spans as one row; a block where none is given.
  span?: number;
  // How far ahead of the end the foot counts as reached, as the intersection observer takes it.
  rootMargin?: string;
  // The room the failure line and the default placeholder keep from the list's sides, as its rows keep it.
  inset?: string;
}

const props = withDefaults(defineProps<Props>(), { busy: false, rows: 2, listClass: "flex flex-col", rootMargin: "200px", inset: "px-3" });

const foot = useTemplateRef<HTMLElement>("foot");
// A page's own read, so the foot is measured afresh against the rows each page brings.
const reading = ref(false);
const atFoot = useFootInView(foot, computed(() => reading.value || props.busy), { rootMargin: props.rootMargin });

const pages = useNextPages({
  atFoot,
  more: () => props.more,
  busy: () => props.busy,
  next: async () => {
    reading.value = true;

    try {
      return (await props.next()) !== false;
    } finally {
      reading.value = false;
    }
  }
});

// Why the last page failed, in the host's words.
const failedText = computed(() => {
  const failure = pages.failure.value;

  return typeof props.failedWords === "function" ? props.failedWords(failure) : failureText(failure, props.failedWords);
});
</script>
