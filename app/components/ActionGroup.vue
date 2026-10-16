<template>
  <!-- One group of actions on the same target (`docs/components.md`, "Actions and the toolbar").
       Three or fewer stand as icon buttons named on hover; four or more, and most groups on a
       phone, fold into one vertical-dots menu. A screen whose toolbar already holds that menu on a
       phone keeps its group of three or fewer standing there too. The properties of the target are
       the last of them.

       A group of three or fewer folds as well where the bar it stands in has not the room for it.
       A bar in a side panel or in one half of a splitter is as narrow as that part however wide the
       window is, so the room is read off the bar itself rather than off the window.

       A group with no action and no properties stands nowhere: a reader who is offered none of
       them would otherwise get an empty box holding a gap open in the row. -->
  <div v-if="count > 0" ref="root" class="flex shrink-0 items-center gap-1">
    <template v-if="!folded">
      <UTooltip v-for="action in props.actions" :key="action.id" :text="action.label">
        <UButton
          color="neutral"
          :variant="action.pressed ? 'soft' : 'ghost'"
          :size="props.size"
          square
          :icon="action.icon"
          :aria-label="action.label"
          :aria-pressed="action.pressed"
          :disabled="action.disabled"
          :loading="action.loading"
          @click="action.onSelect()"
        />
      </UTooltip>

      <UTooltip v-if="props.properties !== null" :text="$t('common.label.properties')">
        <UButton
          ref="propertiesButton"
          color="neutral"
          :variant="propertiesOpen ? 'soft' : 'ghost'"
          :size="props.size"
          square
          :icon="PROPERTIES_ICON"
          :aria-label="$t('common.label.properties')"
          @click="propertiesOpen = !propertiesOpen"
        />
      </UTooltip>
    </template>

    <UDropdownMenu v-else :items="menuItems" :content="{ align: 'end' }">
      <UTooltip :text="props.label ?? $t('common.action.more')">
        <UButton
          ref="menuButton"
          color="neutral"
          variant="ghost"
          :size="props.size"
          square
          icon="i-material-symbols-more-vert"
          :loading="props.actions.some((action) => action.loading)"
          :aria-label="props.label ?? $t('common.action.more')"
        />
      </UTooltip>
    </UDropdownMenu>

    <!-- The details open over the screen rather than above the body: a popover on the button that
         asked on a wide screen, a sheet from the bottom edge on a narrow one. -->
    <UPopover
      v-if="props.properties !== null && !narrow"
      v-model:open="propertiesOpen"
      :reference="anchor"
      :content="{ align: 'end', onOpenAutoFocus: stayPut }"
    >
      <template #content>
        <PropertyList class="w-96 max-w-[calc(100vw-2rem)] p-4" :title="props.propertiesTitle" :rows="props.properties" />
      </template>
    </UPopover>

    <UDrawer v-if="props.properties !== null && narrow" v-model:open="propertiesOpen" :title="$t('common.label.properties')" :description="props.propertiesTitle ?? undefined">
      <template #body>
        <PropertyList :rows="props.properties" />
      </template>
    </UDrawer>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { useBarGathers } from "../domain/actionbar";
import { useNarrow } from "../domain/screen";

import type { BarAction, BarProperty } from "../domain/tabs";
import type { ButtonProps, DropdownMenuItem } from "@nuxt/ui";

interface Props {
  actions: readonly BarAction[];
  // The details of the target. Null offers no properties.
  properties?: readonly BarProperty[] | null;
  propertiesTitle?: string | null;
  // The name of the folded menu's button.
  label?: string;
  // Whether a group of three or fewer folds on a phone. A screen whose toolbar already holds the
  // phone's one menu keeps it standing.
  narrowFold?: boolean;
  // The size of its buttons: a toolbar's small ones by default, the title bar's own where it stands there.
  size?: ButtonProps["size"];
}

const { t } = useI18n();
const props = withDefaults(defineProps<Props>(), { properties: null, propertiesTitle: null, narrowFold: true, size: "sm" });

const PROPERTIES_ICON = "i-material-symbols-info-outline-rounded";

// A group of this many or more always folds.
const FOLD_AT = 4;

const narrow = useNarrow();
// The room the group has, which is its container's and not the window's.
const root = useTemplateRef<HTMLElement>("root");
const short = useBarGathers(() => root.value?.parentElement);
const propertiesOpen = ref(false);
const menuButton = useTemplateRef<{ $el: HTMLElement }>("menuButton");
const propertiesButton = useTemplateRef<{ $el: HTMLElement }>("propertiesButton");

const count = computed(() => props.actions.length + (props.properties === null ? 0 : 1));
const folded = computed(() => count.value > 0 && ((narrow.value && props.narrowFold) || (short.value && props.narrowFold) || count.value >= FOLD_AT));
const anchor = computed(() => (folded.value ? menuButton.value?.$el : propertiesButton.value?.$el) ?? undefined);

// Details are read, not filled in, so opening them does not take the keyboard's focus into them;
// it stays on the button that asked, or goes back to it with the menu.
function stayPut(event: Event): void {
  event.preventDefault();
}

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    ...props.actions.map((action) => ({
      label: action.label,
      icon: action.icon,
      disabled: action.disabled === true || action.loading === true,
      ...(action.pressed === undefined ? {} : { type: "checkbox" as const, checked: action.pressed }),
      onSelect: () => action.onSelect()
    })),
    ...(props.properties === null ? [] : [{ label: t("common.label.properties"), icon: PROPERTIES_ICON, onSelect: () => { propertiesOpen.value = true; } }])
  ]
]);
</script>
