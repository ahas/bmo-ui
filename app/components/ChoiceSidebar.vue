<template>
  <!-- The list a screen chooses what its body stands for from (`docs/components.md`, "Choosing from a
       side list"): beside the body behind a splitter on a wide screen, and a bottom drawer opened from
       one button carrying the chosen label on a narrow one. The body is the default slot, held by the
       one splitter at every width and whether the list stands or not, so it stays standing as the width
       crosses from one to the other and as the list comes or goes. -->
  <DefineList v-slot="{ drawer }">
    <nav class="flex min-h-0 min-w-0 flex-1 flex-col" :aria-label="props.label" data-choice-sidebar-list>
      <div class="flex shrink-0 items-center gap-2 px-4" :class="[SIDE_HEAD.height, drawer ? '' : TAB_ROW_LINE]">
        <UInput v-model="words" :icon="SEARCH_ICON" :placeholder="$t('common.placeholder.search')" :aria-label="$t('common.aria.search_named', { name: props.label })" class="min-w-0 flex-1" data-choice-sidebar-search />
        <slot name="actions" />
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto p-1 [scrollbar-width:thin]">
        <div v-if="props.failure !== ''" role="alert" class="flex flex-col items-end gap-3 p-3" data-choice-sidebar-failure>
          <UAlert class="w-full" color="error" variant="subtle" :description="props.failure" />
          <UButton color="neutral" variant="subtle" :icon="REFRESH_ICON" :label="$t('common.action.refresh')" :loading="props.reading" @click="emit('retry')" />
        </div>
        <ContentSkeleton v-else-if="props.entries === null" :rows="SKELETON_ROWS" listClass="flex flex-col" :label="$t('common.status.loading')">
          <template #default="{ index }">
            <div class="flex h-8 items-center px-3">
              <SkeletonBar class="h-4" :class="index % 2 === 0 ? 'w-2/3' : 'w-1/2'" />
            </div>
          </template>
        </ContentSkeleton>
        <p v-else-if="shown.length === 0" class="px-3 py-2 text-sm text-muted" data-choice-sidebar-empty>{{ emptyWords }}</p>
        <!-- Another part may draw the rows in their place, handed the choosing. -->
        <slot v-else-if="slots.list" name="list" :choose="choose" />
        <MovingList v-else tag="div" class="flex flex-col">
          <template v-for="entry in shown" :key="isSideHeading(entry) ? `heading-${entry.label}` : `choice-${entry.value}`">
            <p v-if="isSideHeading(entry)" class="px-3 pt-3 pb-1 text-sm font-semibold text-muted first:pt-1" data-choice-sidebar-heading>{{ entry.label }}</p>
            <UButton
              v-else
              color="neutral"
              :variant="entry.value === props.chosen ? 'soft' : 'ghost'"
              class="w-full justify-start px-3 text-start"
              :style="indentOf(entry)"
              :aria-current="entry.value === props.chosen ? 'page' : undefined"
              :data-choice-sidebar-row="entry.value"
              @click="choose(entry.value)"
            >
              <span class="flex min-w-0 flex-col">
                <SearchText class="min-w-0 text-sm break-keep text-highlighted [overflow-wrap:anywhere]" :text="entry.label" :query="words" />
                <SearchText v-if="entry.line" class="min-w-0 text-sm break-keep text-muted [overflow-wrap:anywhere]" :text="entry.line" :query="words" />
              </span>
            </UButton>
          </template>
        </MovingList>
      </div>
    </nav>
  </DefineList>

  <USplitter :id="props.saveId" :auto-save-id="props.saveId" :items="regions" :ui="{ handle: SPLIT_HANDLE }" class="min-h-0 flex-1" data-choice-sidebar>
    <template #list>
      <UseList :drawer="false" />
    </template>

    <template #body>
      <!-- Beside the list the body is told the list head's height, which a row heading it takes. -->
      <div class="flex min-h-0 min-w-0 flex-1 flex-col" :class="narrow || !props.listed ? '' : SIDE_HEAD.told" data-choice-sidebar-body>
        <!-- On a phone the chosen label opens the list's drawer; a label the button cuts short reads whole
             in its tooltip, a finger resting on it to read it. -->
        <div v-if="narrow && props.listed" class="flex h-12 shrink-0 items-center px-2">
          <UButton v-if="openerLabel !== null" color="neutral" variant="ghost" class="max-w-full font-semibold text-highlighted" :trailing-icon="UNFOLD_ICON" aria-haspopup="dialog" data-choice-sidebar-open @click="open = true">
            <HintTip :text="openerLabel" cut press class="block min-w-0 truncate">{{ openerLabel }}</HintTip>
          </UButton>
          <SkeletonBar v-else class="ms-2.5 h-4 w-1/2" />
        </div>

        <slot />
      </div>
    </template>
  </USplitter>

  <UDrawer v-if="narrow && props.listed" v-model:open="open" :title="props.label" :ui="FULL_SHEET">
    <template #body>
      <UseList :drawer="true" />
    </template>
  </UDrawer>
</template>

<script setup lang="ts">
import { defineComponent, shallowRef } from "vue";
import { useI18n } from "vue-i18n";

import { countLocale } from "../domain/numbers";
import { useNarrow } from "../domain/screen";
import { FULL_SHEET, SIDE_HEAD, SIDE_LIST_REGION, SPLIT_HANDLE, isSideHeading, sideEntriesMatching } from "../domain/side-parts";
import { TAB_ROW_LINE } from "../domain/tabs";

import type { SplitterItem } from "@nuxt/ui";
import type { SideChoice, SideEntry } from "../domain/side-parts";
import type { Slot } from "vue";

interface Props {
  // The host's name for the list: the list's accessible name, its search's, and its drawer's title.
  label: string;
  // The entries in the host's order; null until they are read.
  entries: readonly SideEntry[] | null;
  chosen: string | number | null;
  // The key the list's width is kept under in this browser.
  saveId: string;
  // Whether the list stands at all; a reader with one choice or none is shown the body alone.
  listed?: boolean;
  // Why the read failed, empty while it has not, and whether it is asked again.
  failure?: string;
  reading?: boolean;
  // The host's words for an empty list and for a search nothing matched, the pack's otherwise.
  emptyText?: string;
  noMatchText?: string;
}

const props = withDefaults(defineProps<Props>(), { listed: true, failure: "", reading: false, emptyText: undefined, noMatchText: undefined });
const emit = defineEmits<{ choose: [value: string | number]; retry: [] }>();

const slots = defineSlots<{ default(): unknown; actions?(): unknown; list?(props: { choose: (value: string | number) => void }): unknown }>();

// The search's words, which a part drawing the rows in the list's place may hold itself.
const words = defineModel<string>("words", { default: "" });

const SEARCH_ICON = "i-material-symbols-search";
const REFRESH_ICON = "i-material-symbols-refresh";
const UNFOLD_ICON = "i-material-symbols-unfold-more";
// How many rows the list's skeleton stands: a few, never taller than a short list.
const SKELETON_ROWS = 3;
// How far each level of a tree stands in from the one above, in pixels, on the 4px grid.
const DEPTH_INDENT_PX = 16;

const { t } = useI18n();
const narrow = useNarrow();
const open = ref(false);

const shown = computed(() => sideEntriesMatching(props.entries ?? [], words.value, countLocale()));
const emptyWords = computed(() => (words.value.trim() === "" ? (props.emptyText ?? t("common.status.no_choices")) : (props.noMatchText ?? t("common.status.no_match"))));
// What the phone's button carries: the chosen entry's label, the list's own name once it is read with
// nothing chosen, and nothing while it is unread, when a skeleton bar stands in its place.
const openerLabel = computed(() => {
  if (props.entries === null) return null;

  return props.entries.find((entry): entry is SideChoice => !isSideHeading(entry) && entry.value === props.chosen)?.label ?? props.label;
});

// The list and the body side by side on a wide screen; on a narrow one the body alone, the list in its
// drawer; and the body alone at every width where the list is laid aside. The body stays in the one splitter
// whichever stands, so it is never drawn again as the list comes or goes.
// Each region is keyed by its own name under the list's key and stands in its own order, so the body's
// region is the same one whether the list's stands before it or not, as the width crosses and as the list
// comes or goes.
const regions = computed<SplitterItem[]>(() =>
  narrow.value || !props.listed
    ? [{ id: `${props.saveId}-body`, slot: "body", order: 2, minSize: 100, defaultSize: 100 }]
    : [
        { id: `${props.saveId}-list`, slot: "list", order: 1, ...SIDE_LIST_REGION },
        { id: `${props.saveId}-body`, slot: "body", order: 2, minSize: 100 - SIDE_LIST_REGION.maxSize }
      ]
);

function indentOf(choice: SideChoice): Record<string, string> | undefined {
  const depth = choice.depth ?? 0;

  return depth > 0 ? { paddingInlineStart: `calc(var(--spacing) * 3 + ${depth * DEPTH_INDENT_PX}px)` } : undefined;
}

// Choosing a row hands its value to the host and, on a phone, closes the drawer it was chosen in.
function choose(value: string | number): void {
  open.value = false;
  emit("choose", value);
}

// The list is drawn in one of two places, the splitter's side or the drawer, from one template: the
// first part keeps the template as a slot, the second draws it where it stands.
const listTemplate = shallowRef<Slot | undefined>();
const DefineList = defineComponent({
  setup(_, { slots }) {
    return () => {
      listTemplate.value = slots.default;

      return null;
    };
  }
});
const UseList = defineComponent({
  props: { drawer: { type: Boolean, required: true } },
  setup(listProps) {
    return () => listTemplate.value?.({ drawer: listProps.drawer });
  }
});
</script>
