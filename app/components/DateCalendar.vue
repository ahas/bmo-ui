<template>
  <!-- The one calendar a date is chosen on, the library's own calendar with its paging buttons named
       (`docs/components.md`, "Dates"). The library draws those buttons as icons alone inside its
       calendar, where no component of the layer's can stand around them, so each carries its name
       in the host's words as its `aria-label` and its `data-tooltip`, and the markup button layer
       names it in the shared tooltip: on hover, on the keyboard's focus and under a held finger,
       whose lifting pages nothing. Which way the two inner buttons page turns on the view shown, a
       month, a year or a run of years, so the heading is drawn here, the library's own button
       stepping through the views, and the view it shows is read off it. Everything else it is
       handed is the library calendar's: its value, a range, its bounds, its size and its cells. -->
  <UCalendar v-bind="$attrs" :size="props.size" :prev-year="named(PAGES.previousYear)" :prev-month="named(innerPages.previous)" :next-month="named(innerPages.next)" :next-year="named(PAGES.nextYear)">
    <template v-for="name in cellSlots" #[name]="scope" :key="name">
      <slot :name="name" v-bind="scope" />
    </template>

    <template #heading="{ value, view, setView }">
      <ViewReport :view="view" @shown="shownView = $event" />
      <UButton :label="value" :size="props.size" color="neutral" variant="ghost" block @click="setView(VIEW_AFTER[view])" />
    </template>
  </UCalendar>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import type { ButtonProps, CalendarProps } from "@nuxt/ui";
import type { PropType } from "vue";

type CalendarView = "day" | "month" | "year";

interface Props extends /* @vue-ignore */ Omit<CalendarProps<boolean, boolean>, "type" | "size" | "prevYear" | "prevMonth" | "nextMonth" | "nextYear" | "viewControl"> {
  // The size of the calendar, its paging buttons and its heading alike.
  size?: CalendarProps["size"];
}

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<Props>(), { size: undefined });

const slots = useSlots();
const { t } = useI18n();

// The words of each paging button, by what it pages.
const PAGES = {
  previousYear: "common.action.previous_year",
  nextYear: "common.action.next_year",
  previousMonth: "common.action.previous_month",
  nextMonth: "common.action.next_month",
  previousYears: "common.action.previous_years",
  nextYears: "common.action.next_years"
} as const;

type PageKey = (typeof PAGES)[keyof typeof PAGES];

// What the two inner buttons page by in each view: a month among days, a year among months, and a
// run of years among years. The outer two stand among days alone and always page a year.
const INNER_PAGES: Record<CalendarView, { previous: PageKey; next: PageKey }> = {
  day: { previous: PAGES.previousMonth, next: PAGES.nextMonth },
  month: { previous: PAGES.previousYear, next: PAGES.nextYear },
  year: { previous: PAGES.previousYears, next: PAGES.nextYears }
};

// The view the heading's button steps to from each, round from the years back to the days.
const VIEW_AFTER: Record<CalendarView, CalendarView> = { day: "month", month: "year", year: "day" };

// The calendar keeps the view it shows to itself and hands it to its heading alone.
const shownView = ref<CalendarView>("day");
const innerPages = computed(() => INNER_PAGES[shownView.value]);

// The heading is drawn here, so a caller's own heading would leave the view unread; every other slot
// of the calendar's is the caller's.
const cellSlots = computed(() => Object.keys(slots).filter((name) => name !== "heading"));

// A paging button's name, heard by a screen reader and shown by the markup button layer.
function named(key: PageKey): ButtonProps {
  const words = t(key);

  return { "aria-label": words, "data-tooltip": words } as ButtonProps;
}

// Says the view the heading stands in as it first stands and each time it changes.
const ViewReport = defineComponent({
  props: { view: { type: String as PropType<CalendarView>, required: true } },
  emits: { shown: (view: CalendarView) => view in VIEW_AFTER },
  setup(reported, { emit }) {
    watch(
      () => reported.view,
      (view) => emit("shown", view),
      { immediate: true }
    );

    return () => null;
  }
});
</script>
