<template>
  <!-- The side list for a tree (`docs/components.md`, "Choosing from a side tree"): the side list
       itself, its rows drawn in their place by the component library's tree laid out flat, each row
       keyed by its node and stood in by the tree's own step for its depth, in a transition group that
       moves the rows only as the words narrow the tree. -->
  <ChoiceSidebar
    v-model:words="words"
    :label="props.label"
    :entries="choices"
    :chosen="props.chosen"
    :save-id="props.saveId"
    :listed="props.listed"
    :failure="props.failure"
    :reading="props.reading"
    :empty-text="props.emptyText"
    :no-match-text="props.noMatchText"
    @choose="(key) => emit('choose', key)"
    @retry="emit('retry')"
  >
    <template #actions>
      <slot name="actions" />
    </template>

    <template #list="{ choose }">
      <UTree
        :items="rows"
        :get-key="idOfRow"
        :model-value="chosenRow"
        :expanded="expanded"
        :nested="false"
        :as="TreeRows"
        color="neutral"
        size="lg"
        :ui="TREE_UI"
        :aria-label="props.label"
        data-choice-tree
        :on-select="(event: TreeItemSelectEvent<TreeRow>, row: TreeRow) => selected(event, row, choose)"
        :on-toggle="toggled"
        @update:expanded="setExpanded"
      >
        <!-- A node's own icon alone, never the library's folder; a slot drawing nothing would hand the
             library back its own, so a node with none draws a part that takes no room. -->
        <template #item-leading="{ item }">
          <UIcon v-if="item.icon" :name="item.icon" class="size-5 shrink-0" />
          <span v-else class="hidden" />
        </template>

        <template #item-label="{ item }">
          <SearchText :class="way.has(item.id) ? 'font-semibold text-highlighted' : ''" :text="item.label" :query="words" :data-choice-tree-row="item.id" />
        </template>

        <!-- The mark of a node above the chosen one, heard as well as seen, and the chevron that opens
             and closes a node holding others. -->
        <template #item-trailing="{ item }">
          <template v-if="way.has(item.id)">
            <span class="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" data-choice-tree-way />
            <span class="sr-only">{{ $t("common.aria.holds_chosen") }}</span>
          </template>
          <span v-if="item.children?.length" class="-m-1 inline-flex shrink-0 rounded-sm p-1 text-dimmed hover:text-highlighted" aria-hidden="true" data-choice-tree-toggle>
            <UIcon :name="CHEVRON_ICON" class="size-5 group-data-expanded:rotate-180" />
          </span>
        </template>
      </UTree>
    </template>

    <slot />
  </ChoiceSidebar>
</template>

<script setup lang="ts">
import { TransitionGroup, defineComponent, h } from "vue";

import { searchPhrase } from "../../shared/search";
import { MOVING_LIST, STANDING_LIST } from "../domain/moving-list";
import { countLocale } from "../domain/numbers";
import { sideNodeChoices, sideNodeParents, sideNodePath, sideNodesMatching } from "../domain/side-parts";

import type { TreeItem } from "@nuxt/ui";
import type { TreeItemSelectEvent, TreeItemToggleEvent } from "reka-ui";
import type { SideNode } from "../domain/side-parts";

interface Props {
  // The host's name for the tree: the tree's accessible name, its search's, and its drawer's title.
  label: string;
  // The nodes in the host's order; null until they are read.
  nodes: readonly SideNode[] | null;
  chosen: string | number | null;
  // The key the tree's width is kept under in this browser.
  saveId: string;
  // Whether the tree stands at all; a reader with one choice or none is shown the body alone.
  listed?: boolean;
  // Why the read failed, empty while it has not, and whether it is asked again.
  failure?: string;
  reading?: boolean;
  // The host's words for an empty tree and for a search nothing matched, the pack's otherwise.
  emptyText?: string;
  noMatchText?: string;
}

// A row of the library's tree: the node it draws, by the id the tree knows it by.
interface TreeRow extends TreeItem {
  id: string;
  key: string | number;
  label: string;
  icon?: string;
  children?: TreeRow[];
}

const props = withDefaults(defineProps<Props>(), { listed: true, failure: "", reading: false, emptyText: undefined, noMatchText: undefined });
const emit = defineEmits<{ choose: [key: string | number]; retry: [] }>();

defineSlots<{ default(): unknown; actions?(): unknown }>();

const CHEVRON_ICON = "i-material-symbols-keyboard-arrow-down";
// The library's tree, its rows' words starting on the search box's line at the top level, and
// nothing on a row moving of its own: no colour fading, no chevron turning. A chosen row takes a
// step more under the pointer, as every row does; a label wraps as the side list's do.
const TREE_UI = {
  link: "transition-none before:transition-none data-selected:hover:before:bg-accented/75",
  linkLabel: "text-clip whitespace-normal text-start break-keep [overflow-wrap:anywhere]",
  linkTrailing: "gap-2"
};

const words = ref("");
// The nodes the reader has opened, and those standing open while words narrow the tree, by row id.
const opened = ref<string[]>([]);
const searchOpened = ref<string[]>([]);
// Whether the rows' next change moves them: only one the words brought.
const moving = ref(false);

const searching = computed(() => searchPhrase(words.value) !== "");
const shown = computed(() => sideNodesMatching(props.nodes ?? [], words.value, countLocale()));
const rows = computed(() => shown.value.map(rowOf));
const choices = computed(() => (props.nodes === null ? null : sideNodeChoices(props.nodes)));
const expanded = computed(() => (searching.value ? searchOpened.value : opened.value));
// The way down to the chosen node, its own row last.
const path = computed(() => sideNodePath(props.nodes ?? [], props.chosen).map(idOf));
// The rows above the chosen one, each marked.
const way = computed(() => new Set(path.value.slice(0, -1)));
const chosenRow = computed(() => (props.chosen === null ? undefined : findRow(rows.value, idOf(props.chosen))));

// A key as the tree knows it: its type stands in it, so a number and the string of its figures are two keys.
function idOf(key: string | number): string {
  return `${typeof key}:${key}`;
}

function idOfRow(row: TreeRow): string {
  return row.id;
}

function rowOf(node: SideNode): TreeRow {
  const children = node.children?.map(rowOf);

  return { id: idOf(node.key), key: node.key, label: node.label, icon: node.icon, ...(children === undefined || children.length === 0 ? {} : { children }) };
}

function findRow(among: readonly TreeRow[], id: string): TreeRow | undefined {
  for (const row of among) {
    if (row.id === id) return row;

    const below = findRow(row.children ?? [], id);

    if (below !== undefined) return below;
  }

  return undefined;
}

function openForSearch(): void {
  searchOpened.value = sideNodeParents(shown.value).map(idOf);
}

// A new choice or new nodes stand at once, the way to the chosen node open, and the chosen node too.
// It is set before the rows are drawn again, so they never stand for a moment without it.
watch(
  [() => props.nodes, () => props.chosen],
  () => {
    moving.value = false;
    opened.value = [...new Set([...opened.value, ...path.value])];
    if (searching.value) openForSearch();
  },
  { flush: "sync", immediate: true, deep: true }
);

// The words narrowing the tree move its rows, every node over a match standing open.
watch(
  words,
  () => {
    moving.value = true;
    if (searching.value) openForSearch();
  },
  { flush: "sync" }
);

// A node opened or closed by the reader stands at once.
function setExpanded(next: string[]): void {
  moving.value = false;

  if (searching.value) searchOpened.value = next;
  else opened.value = next;
}

// Whether a press landed on a row's chevron.
function onChevron(event: TreeItemSelectEvent<TreeRow> | TreeItemToggleEvent<TreeRow>): boolean {
  const original = event.detail.originalEvent;

  return original.type === "click" && original.target instanceof Element && original.target.closest("[data-choice-tree-toggle]") !== null;
}

// A row pressed or entered is chosen through the side list, which closes its drawer; the tree keeps
// no choice of its own, the chosen node being the host's. A press on the chevron chooses nothing.
function selected(event: TreeItemSelectEvent<TreeRow>, row: TreeRow, choose: (key: string | number) => void): void {
  event.preventDefault();

  if (!onChevron(event)) choose(row.key);
}

// Only the chevron and the library's keys open and close a node; a press on the rest of the row
// chooses it alone.
function toggled(event: TreeItemToggleEvent<TreeRow>): void {
  if (event.detail.originalEvent.type === "click" && !onChevron(event)) event.preventDefault();
}

// The list the tree's rows stand in: moving as the words narrow it, standing at once otherwise.
const TreeRows = defineComponent({
  setup(_, { slots }) {
    return () => h(TransitionGroup, { tag: "ul", ...(moving.value ? MOVING_LIST : STANDING_LIST) }, slots);
  }
});
</script>
