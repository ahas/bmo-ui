import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, nextTick, onScopeDispose, ref, shallowRef, watch } from "vue";
import { createI18n } from "vue-i18n";

import UApp from "@nuxt/ui/components/App.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UDrawer from "@nuxt/ui/components/Drawer.vue";
import UModal from "@nuxt/ui/components/Modal.vue";

import ChoiceSelect from "../../app/components/ChoiceSelect.vue";
import { PREVIEW_ITEM, useListPreview } from "../../app/domain/list-preview";
import { markPainted } from "../../app/domain/loading";
import { watchOverlays } from "../../app/domain/overlays";
import sheet from "./choice-harness.css?inline";

import type { SelectMenuItem } from "@nuxt/ui";

// The one select (`docs/components.md`, "Choosing a value") on a page that says nothing else: seven
// sizes, a dozen cities under two headings each with a line under it, eight shades handed as two
// groups of four, eight tints with a preview beside
// them, people found over a stand-in road that answers at once, refuses the word "fail", holds its
// answer to "slow" until the test lets it go and finds nobody for anything else unmatched, the same
// people chosen several at a time by an id over a second road, three roles taking free entry, each
// new value added to them and chosen, a narrow control at the page's trailing end opening a list of
// sessions wider than itself, and a dialog and a drawer each holding the dozen cities once more,
// opened from buttons under them all. The page stands outside Nuxt, so the library is installed as a
// Vue plugin, the words are handed over here and the layer's registry of floating things is started
// as its plugin starts it.

// The layer's code reaches the framework's own names without importing them, since Nuxt binds them
// in a host; a page standing outside Nuxt hands the same names over before anything opens.
Object.assign(globalThis, {
  watch,
  nextTick,
  onScopeDispose,
  useRouter: () => ({ options: {}, beforeEach: () => undefined })
});

const WORDS = {
  common: {
    action: { add_choice: 'Add "{value}"' },
    error: { choices_find_failed: "Search failed" },
    placeholder: { search: "Search" },
    status: { loading: "Loading", no_choices: "No choices", no_match: "Nothing found" }
  }
};

const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Vast", "Giant"].map((label) => ({ label, value: label.toLowerCase() }));

const CITIES: SelectMenuItem[] = [
  { type: "label", label: "North" },
  ...["Berlin", "Dublin", "Oslo", "Riga", "Tallinn", "Vienna"].map((label) => ({ label, value: label.toLowerCase(), description: "Cold winters" })),
  { type: "separator" },
  { type: "label", label: "South" },
  ...["Athens", "Lisbon", "Madrid", "Rome", "Seville", "Valletta"].map((label) => ({ label, value: label.toLowerCase(), description: "Warm winters" }))
];

// Two groups of four, the words "b" leaving the first with none.
const SHADES: SelectMenuItem[][] = [
  ["Almond", "Apricot", "Aqua", "Azure"].map((label) => ({ label, value: label.toLowerCase() })),
  ["Beige", "Black", "Bronze", "Brown"].map((label) => ({ label, value: label.toLowerCase() }))
];

const TINTS = ["Teal", "Sea", "Sunset", "Forest", "Sand", "Slate", "Rose", "Amber"].map((label) => ({ label, value: label.toLowerCase() }));

const SESSIONS = ["Monday morning review", "Tuesday afternoon planning", "Wednesday evening workshop", "Thursday morning standup", "Friday afternoon retrospective", "Saturday open lab", "Sunday quiet hours", "Every weekday lunch"].map(
  (label) => ({ label, value: label.toLowerCase() })
);

const PEOPLE = ["Ada Byron", "Alan Moor", "Grace Hill", "Linus Park"];

// Members found over a second road, each chosen by an id its label does not hold.
const MEMBERS = PEOPLE.map((label, index) => ({ label, value: 20 + index }));

// Lets the held answer to "slow" go.
let letGo: () => void = () => undefined;

Object.assign(window, { letAnswerGo: () => letGo() });

async function findPeople(words: string): Promise<SelectMenuItem[]> {
  if (words === "fail") throw new Error("refused");
  if (words === "slow") return await new Promise((resolve) => (letGo = () => resolve([{ label: "Sam Lowe", value: "Sam Lowe" }])));

  return PEOPLE.filter((name) => name.toLowerCase().includes(words.toLowerCase())).map((label) => ({ label, value: label }));
}

async function findMembers(words: string): Promise<SelectMenuItem[]> {
  return MEMBERS.filter((member) => member.label.toLowerCase().includes(words.toLowerCase()));
}

const Page = defineComponent(() => {
  const size = ref("medium");
  const city = ref<string>();
  const shade = ref<string>();
  const person = ref<string>();
  const members = ref<number[]>([]);
  const roles = shallowRef<SelectMenuItem[]>(["Designer", "Engineer", "Manager"].map((label) => ({ label, value: label })));
  const role = ref<string>();

  function addRole(value: string): void {
    roles.value = [...roles.value, { label: value, value }];
    role.value = value;
  }

  const tint = ref("teal");
  const session = ref<string>();
  const dialog = ref(false);
  const cityInDialog = ref<string>();
  const drawer = ref(false);
  const cityInDrawer = ref<string>();
  const preview = useListPreview(tint);

  return () =>
    h(UApp, null, () =>
      h("div", { class: "flex flex-col items-start gap-4 p-4" }, [
        h(ChoiceSelect, { id: "short", items: SIZES, valueKey: "value", modelValue: size.value, "onUpdate:modelValue": (value: string) => (size.value = value), class: "w-48" }),
        h(ChoiceSelect, { id: "long", items: CITIES, valueKey: "value", modelValue: city.value, "onUpdate:modelValue": (value: string) => (city.value = value), class: "w-48" }),
        h(ChoiceSelect, { id: "grouped", items: SHADES, valueKey: "value", modelValue: shade.value, "onUpdate:modelValue": (value: string) => (shade.value = value), class: "w-48" }),
        h("div", { class: "flex items-center gap-4" }, [
          h(
            ChoiceSelect,
            {
              id: "tinted",
              items: TINTS,
              valueKey: "value",
              modelValue: tint.value,
              "onUpdate:modelValue": (value: string) => (tint.value = value),
              onHighlight: preview.onHighlight,
              "onUpdate:open": preview.onOpen,
              class: "w-48"
            },
            { "item-leading": ({ item }: { item: { value: string } }) => h("span", { [PREVIEW_ITEM]: item.value }) }
          ),
          h("output", { id: "preview" }, preview.shown.value)
        ]),
        h(ChoiceSelect, { id: "found", items: [], find: findPeople, findPauseMs: 0, valueKey: "value", modelValue: person.value, "onUpdate:modelValue": (value: string) => (person.value = value), class: "w-48" }),
        h(ChoiceSelect, {
          id: "members",
          items: [],
          find: findMembers,
          findPauseMs: 0,
          multiple: true,
          valueKey: "value",
          modelValue: members.value,
          "onUpdate:modelValue": (value: number[]) => (members.value = value),
          class: "w-48"
        }),
        h(ChoiceSelect, {
          id: "free",
          items: roles.value,
          createItem: true,
          valueKey: "value",
          modelValue: role.value,
          "onUpdate:modelValue": (value: string) => (role.value = value),
          onCreate: addRole,
          class: "w-48"
        }),
        h("div", { class: "flex justify-end self-stretch" }, [
          h(ChoiceSelect, { id: "wide", items: SESSIONS, valueKey: "value", modelValue: session.value, "onUpdate:modelValue": (value: string) => (session.value = value), class: "w-32" })
        ]),
        h("div", { class: "flex gap-4" }, [
          h(UButton, { id: "open-dialog", label: "Open dialog", onClick: () => (dialog.value = true) }),
          h(UButton, { id: "open-drawer", label: "Open drawer", onClick: () => (drawer.value = true) })
        ]),
        h(
          UModal,
          { open: dialog.value, "onUpdate:open": (value: boolean) => (dialog.value = value), title: "Dialog" },
          {
            body: () =>
              h(ChoiceSelect, { id: "in-dialog", items: CITIES, valueKey: "value", modelValue: cityInDialog.value, "onUpdate:modelValue": (value: string) => (cityInDialog.value = value), class: "w-48" })
          }
        ),
        h(
          UDrawer,
          { open: drawer.value, "onUpdate:open": (value: boolean) => (drawer.value = value), title: "Drawer" },
          {
            body: () =>
              h(ChoiceSelect, { id: "in-drawer", items: CITIES, valueKey: "value", modelValue: cityInDrawer.value, "onUpdate:modelValue": (value: string) => (cityInDrawer.value = value), class: "w-48" })
          }
        )
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

// The page is drawn in the browser alone, so it is painted as it mounts, as the painted plugin says of a host.
markPainted();
watchOverlays();
