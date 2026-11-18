import { CalendarDate } from "@internationalized/date";
import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, shallowRef } from "vue";
import { createI18n } from "vue-i18n";

import UApp from "@nuxt/ui/components/App.vue";

import DateCalendar from "../../app/components/DateCalendar.vue";
import MarkupButtonTip from "../../app/components/MarkupButtonTip.vue";
import sheet from "./calendar-harness.css?inline";

// A screen's date calendar, open on the page on a date of its own, with the markup button layer
// standing once in the app root as a host stands it (`docs/components.md`, "Dates"). The page stands
// outside Nuxt, so the library is installed as a Vue plugin and the words are handed over here.

const WORDS = {
  common: {
    action: {
      previous_year: "Previous year",
      next_year: "Next year",
      previous_month: "Previous month",
      next_month: "Next month",
      previous_years: "Earlier years",
      next_years: "Later years"
    }
  }
};

const Page = defineComponent(() => {
  const day = shallowRef(new CalendarDate(2026, 3, 14));

  return () =>
    h(UApp, null, () => [
      h(MarkupButtonTip),
      h("div", { class: "p-4" }, [h(DateCalendar, { id: "calendar", modelValue: day.value, "onUpdate:modelValue": (value: CalendarDate) => (day.value = value) })])
    ]);
});

const style = document.createElement("style");

style.textContent = sheet;
document.head.append(style);

createApp(Page)
  .use(createI18n({ legacy: false, locale: "en", messages: { en: WORDS }, missingWarn: false, fallbackWarn: false }))
  .use(ui)
  .mount("#page");
