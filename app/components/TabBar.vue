<template>
  <!-- The tab bar for things opened and closed — files, documents, sessions (`docs/components.md`,
       "Tab bar and toolbar"). The screen owns the list and this row only draws it and says what was
       pressed: which tab to stand, which to close, where one was dragged. A view switch and the
       actions on what the open tab shows stand at the right end of the same row, unless the screen
       puts its actions into a toolbar under it. A pinned tab stands at the left end with a pin
       where its close mark would be. Read-only, the row is for looking, switching and pinning
       alone: no close, no drag, and a menu of the pin only. The row's bottom line is drawn over its
       tabs rather than under them, so a tab is the row's whole height. -->
  <div :class="['flex h-9 shrink-0 items-stretch bg-elevated/60 text-sm pointer-coarse:h-10', TAB_ROW_LINE]">
    <div ref="strip" class="flex min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:none]">
      <UContextMenu class="flex min-w-full items-stretch" :items="menuItems" :disabled="props.readonly && !props.pinnable">
        <!-- The whole row takes a drop, so a gap between tabs is not read as a refusal; a tab let go
             on the empty stretch goes to the end. -->
        <div
          class="flex min-w-full items-stretch"
          role="tablist"
          :aria-label="props.label"
          @contextmenu.capture="onBarContext"
          @dragover.prevent="onBarDragOver"
          @drop.prevent="onBarDrop"
        >
          <div
            v-for="(tab, index) in props.tabs"
            :key="tab.id"
            role="tab"
            :tabindex="tab.id === standingId ? 0 : -1"
            :draggable="!props.readonly"
            :data-tab="tab.id"
            :title="tab.title ?? tab.label"
            :aria-label="tab.label"
            :aria-selected="tab.id === props.active"
            class="group flex max-w-56 shrink-0 cursor-pointer items-center gap-2 border-r border-l-2 border-r-default px-3 transition-colors select-none focus-inset"
            :class="[
              tab.id === props.active ? 'bg-default text-highlighted' : 'text-muted hover:bg-default/50 hover:text-toned active:bg-default/70',
              dropIndex === index ? 'border-l-primary' : 'border-l-transparent'
            ]"
            @click="onTabClick(tab.id, $event)"
            @keydown="onKey(index, $event)"
            @auxclick.middle.prevent="close([tab.id])"
            @dragstart="onDragStart(index, $event)"
            @dragover.prevent.stop="onDragOver(index, $event)"
            @drop.prevent.stop="onDrop(index)"
            @dragend="onDragEnd"
          >
            <UIcon v-if="tab.icon" :name="tab.icon" class="size-4 shrink-0" />
            <span class="min-w-0 truncate" :class="tab.mono ? 'font-mono' : ''">{{ tab.label }}</span>
            <UIcon v-if="tab.pinned" name="i-material-symbols-keep-outline" :aria-label="$t('common.aria.pinned_named', { name: tab.title ?? tab.label })" class="size-3.5 shrink-0 opacity-60" />
            <!-- The close mark keeps its place whether it shows or not, so hovering never moves the
                 row. A pointer without hover — a finger — always sees it. -->
            <span
              v-else-if="!props.readonly"
              role="button"
              tabindex="-1"
              :aria-label="$t('common.aria.close_named', { name: tab.title ?? tab.label })"
              class="flex shrink-0 rounded-sm p-0.5 transition-opacity hover:bg-accented pointer-coarse:opacity-70"
              :class="tab.id === props.active ? 'opacity-60' : 'opacity-0 group-hover:opacity-70 group-focus-visible:opacity-70'"
              @click.stop="close([tab.id])"
            >
              <UIcon name="i-material-symbols-close" class="size-3.5" />
            </span>
          </div>
        </div>
      </UContextMenu>
    </div>

    <!-- How the open tab is read, then what can be done to it and last the details of it, which
         open over the screen rather than standing above the body. -->
    <div v-if="$slots.switch" class="flex shrink-0 items-stretch">
      <slot name="switch" />
    </div>

    <div v-if="props.actions.length > 0 || props.properties !== null || $slots.actions" class="flex shrink-0 items-center gap-1 border-l border-default px-1">
      <ActionGroup
        v-if="props.actions.length > 0 || props.properties !== null"
        :actions="props.actions"
        :properties="props.properties"
        :properties-title="props.propertiesTitle"
        :narrow-fold="props.actionsNarrowFold"
      />
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { TAB_ROW_LINE, allOf, othersOf, rightOf } from "../domain/tabs";

import type { BarAction, BarMenuItem, BarProperty, BarTab } from "../domain/tabs";
import type { ContextMenuItem } from "@nuxt/ui";

// A tab here is whatever the screen says it is, not a route, and the screen moves its own list.

interface Props {
  tabs: readonly BarTab[];
  active: string | null;
  label: string;
  readonly?: boolean;
  // Whether a tab can be pinned. Everywhere tabs can be closed it can, and a read-only row can
  // still offer it.
  pinnable?: boolean;
  // What else a tab's own menu offers, for the tab it was opened on.
  menu?: ((id: string) => readonly BarMenuItem[]) | null;
  actions?: readonly BarAction[];
  // The details of what the open tab shows. Null offers no properties button.
  properties?: readonly BarProperty[] | null;
  propertiesTitle?: string | null;
  // Whether the actions fold into a menu on a phone; a screen whose toolbar under the bar holds that
  // menu keeps them standing.
  actionsNarrowFold?: boolean;
}

const { t } = useI18n();
const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  pinnable: true,
  menu: null,
  actions: () => [],
  properties: null,
  propertiesTitle: null,
  actionsNarrowFold: true
});

const emit = defineEmits<{
  "update:active": [id: string];
  close: [ids: string[]];
  move: [from: number, to: number];
  pin: [id: string, on: boolean];
}>();

const strip = useTemplateRef<HTMLElement>("strip");
const dragIndex = ref<number | null>(null);
const dropIndex = ref<number | null>(null);
const menuIndex = ref<number | null>(null);

// The tab a keyboard lands on when it comes into the row: the open one, or the first.
const standingId = computed(() => (props.tabs.some((tab) => tab.id === props.active) ? props.active : (props.tabs[0]?.id ?? null)));

const menuItems = computed<ContextMenuItem[][]>(() => {
  const index = menuIndex.value;
  const tab = index === null ? undefined : props.tabs[index];

  if (index === null || tab === undefined || (props.readonly && !props.pinnable)) {
    return [];
  }

  const pins = props.tabs.map((one) => one.pinned === true);
  const others = othersOf(pins, index);
  const right = rightOf(pins, index);
  const all = allOf(pins);
  const pin: ContextMenuItem = tab.pinned
    ? { label: t("common.action.unpin"), icon: "i-material-symbols-keep-off-outline", onSelect: () => emit("pin", tab.id, false) }
    : { label: t("common.action.pin"), icon: "i-material-symbols-keep-outline", onSelect: () => emit("pin", tab.id, true) };
  const groups: ContextMenuItem[][] = [];

  if (!props.readonly) {
    groups.push([
      { label: t("common.action.close"), icon: "i-material-symbols-close", onSelect: () => close([tab.id]) },
      { label: t("common.action.close_other_tabs"), icon: "i-material-symbols-disabled-by-default-outline", disabled: others.length === 0, onSelect: () => close(pick(others)) },
      { label: t("common.action.close_right_tabs"), icon: "i-material-symbols-last-page", disabled: right.length === 0, onSelect: () => close(pick(right)) },
      { label: t("common.action.close_all_tabs"), icon: "i-material-symbols-cancel-outline", disabled: all.length === 0, onSelect: () => close(pick(all)) }
    ]);
  }

  if (props.pinnable) {
    groups.push([pin]);
  }

  const extra = props.menu?.(tab.id) ?? [];

  if (extra.length > 0) {
    groups.push(extra.map((item) => ({ ...item })));
  }

  return groups;
});

// A finger's long press on a tab is a drag, so on a touch screen a tab's menu opens on a second tap
// of the tab that already stands, dropped from the tab's bottom-left corner.
function onTabClick(id: string, event: MouseEvent): void {
  const touch = (event as PointerEvent).pointerType === "touch";

  if (touch && id === props.active && !(props.readonly && !props.pinnable)) {
    const tab = event.currentTarget as HTMLElement;
    const box = tab.getBoundingClientRect();

    tab.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2, clientX: box.left, clientY: box.bottom }));

    return;
  }

  emit("update:active", id);
}

function pick(indexes: number[]): string[] {
  return indexes.map((index) => props.tabs[index]?.id).filter((id): id is string => id !== undefined);
}

function close(ids: string[]): void {
  if (!props.readonly && ids.length > 0) {
    emit("close", ids);
  }
}

function focusTab(index: number): void {
  const tab = props.tabs[index];

  if (tab === undefined) {
    return;
  }

  emit("update:active", tab.id);
  strip.value?.querySelectorAll<HTMLElement>("[data-tab]")[index]?.focus();
}

// Arrows walk the row and stand the tab they land on, Home and End go to its ends, and Delete
// closes the focused tab.
function onKey(index: number, event: KeyboardEvent): void {
  const last = props.tabs.length - 1;
  const moves: Record<string, number> = { ArrowLeft: index === 0 ? last : index - 1, ArrowRight: index === last ? 0 : index + 1, Home: 0, End: last };
  const target = moves[event.key];

  if (target !== undefined) {
    event.preventDefault();
    focusTab(target);
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    focusTab(index);
  } else if (event.key === "Delete" && props.tabs[index] !== undefined) {
    event.preventDefault();
    close([props.tabs[index].id]);
  }
}

function onBarContext(event: MouseEvent): void {
  const id = (event.target as HTMLElement).closest("[data-tab]")?.getAttribute("data-tab");
  const index = props.tabs.findIndex((tab) => tab.id === id);

  menuIndex.value = index < 0 ? null : index;
}

function onDragStart(index: number, event: DragEvent): void {
  if (props.readonly) {
    event.preventDefault();

    return;
  }

  dragIndex.value = index;
  event.dataTransfer?.setData("text/plain", props.tabs[index]?.id ?? "");

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function onDragOver(index: number, event: DragEvent): void {
  if (dragIndex.value === null) {
    return;
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  dropIndex.value = index;
}

function onDrop(index: number): void {
  if (dragIndex.value !== null) {
    emit("move", dragIndex.value, index);
  }

  onDragEnd();
}

function onBarDragOver(event: DragEvent): void {
  if (dragIndex.value === null) {
    return;
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }

  dropIndex.value = null;
}

function onBarDrop(): void {
  if (dragIndex.value !== null) {
    emit("move", dragIndex.value, props.tabs.length);
  }

  onDragEnd();
}

function onDragEnd(): void {
  dragIndex.value = null;
  dropIndex.value = null;
}

// The open tab always stands where it can be seen — on the first draw as on every switch — and its
// label is watched too, since a label that arrives late changes the tab's width.
watch(
  () => [props.active, props.tabs.find((tab) => tab.id === props.active)?.label] as const,
  async ([id]) => {
    if (id === null) {
      return;
    }

    await nextTick();
    const tabs = strip.value?.querySelectorAll<HTMLElement>("[data-tab]") ?? [];

    Array.from(tabs)
      .find((element) => element.dataset.tab === id)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  },
  { immediate: true }
);
</script>
