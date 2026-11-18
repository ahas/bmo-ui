import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, ref } from "vue";
import { createI18n } from "vue-i18n";

import UApp from "@nuxt/ui/components/App.vue";

import ChoiceSelect from "../../app/components/ChoiceSelect.vue";
import sheet from "./choice-harness.css?inline";

import type { SelectMenuItem } from "@nuxt/ui";

// Three of the one select (`docs/components.md`, "Choosing a value") on a page that says nothing
// else: five sizes, a dozen cities in two groups each with a line under it, and people found over a
// stand-in road that answers at once, refuses the word "fail" and finds nobody for anything else
// unmatched. The page stands outside Nuxt, so the library is installed as a Vue plugin and the words
// are handed over here.

const WORDS = {
  common: {
    error: { choices_find_failed: "Search failed" },
    placeholder: { search: "Search" },
    status: { loading: "Loading", no_choices: "No choices", no_match: "Nothing found" }
  }
};

const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge"].map((label) => ({ label, value: label.toLowerCase() }));

const CITIES: SelectMenuItem[] = [
  { type: "label", label: "North" },
  ...["Berlin", "Dublin", "Oslo", "Riga", "Tallinn", "Vienna"].map((label) => ({ label, value: label.toLowerCase(), description: "Cold winters" })),
  { type: "separator" },
  { type: "label", label: "South" },
  ...["Athens", "Lisbon", "Madrid", "Rome", "Seville", "Valletta"].map((label) => ({ label, value: label.toLowerCase(), description: "Warm winters" }))
];

const PEOPLE = ["Ada Byron", "Alan Moor", "Grace Hill", "Linus Park"];

async function findPeople(words: string): Promise<SelectMenuItem[]> {
  if (words === "fail") throw new Error("refused");

  return PEOPLE.filter((name) => name.toLowerCase().includes(words.toLowerCase())).map((label) => ({ label, value: label }));
}

const Page = defineComponent(() => {
  const size = ref("medium");
  const city = ref<string>();
  const person = ref<string>();

  return () =>
    h(UApp, null, () =>
      h("div", { class: "flex flex-col items-start gap-4 p-4" }, [
        h(ChoiceSelect, { id: "short", items: SIZES, valueKey: "value", modelValue: size.value, "onUpdate:modelValue": (value: string) => (size.value = value), class: "w-48" }),
        h(ChoiceSelect, { id: "long", items: CITIES, valueKey: "value", modelValue: city.value, "onUpdate:modelValue": (value: string) => (city.value = value), class: "w-48" }),
        h(ChoiceSelect, { id: "found", items: [], find: findPeople, findPauseMs: 0, valueKey: "value", modelValue: person.value, "onUpdate:modelValue": (value: string) => (person.value = value), class: "w-48" })
      ])
    );
});

const style = document.createElement("style");

style.textContent = sheet;
document.head.append(style);

// The library's build answers its own app configuration, which holds none of the layer's settings;
// the locale letter case is folded in is set on it as a host's configuration sets it.
Object.assign(useAppConfig(), { bmoUi: { zone: "UTC", locale: "en-GB" } });

createApp(Page)
  .use(createI18n({ legacy: false, locale: "en", messages: { en: WORDS }, missingWarn: false, fallbackWarn: false }))
  .use(ui)
  .mount("#page");
