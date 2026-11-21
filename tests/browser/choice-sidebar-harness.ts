import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, nextTick, onMounted, onScopeDispose, ref, watch } from "vue";
import { createI18n } from "vue-i18n";

import UApp from "@nuxt/ui/components/App.vue";

import ChoiceSidebar from "../../app/components/ChoiceSidebar.vue";
import DataTable from "../../app/components/DataTable.vue";
import DataTableSkeleton from "../../app/components/DataTableSkeleton.vue";
import IconButton from "../../app/components/IconButton.vue";
import { markPainted } from "../../app/domain/loading";
import { watchOverlays } from "../../app/domain/overlays";
import sheet from "./choice-sidebar-harness.css?inline";

import type { SideEntry } from "../../app/domain/side-parts";

// The side list (`docs/components.md`, "Choosing from a side list") on a page that says nothing else:
// two companies under their headings, the first with a unit and a team under it indented by depth and
// the team carrying a line under its label, then nine more companies, with an add at the head and the
// value chosen written in the body. The test reaches the page's state through `window.sidebar`: it
// lays the list aside, takes the entries away as unread, says the read failed, counts the refreshes
// asked for, and heads the body with the shared table or its placeholder above the words. The page
// stands outside Nuxt, so the library is installed as a Vue plugin and the words are handed over here.

Object.assign(globalThis, {
  watch,
  nextTick,
  onScopeDispose,
  useRouter: () => ({ options: {}, beforeEach: () => undefined })
});

const WORDS = {
  common: {
    action: { refresh: "Refresh" },
    aria: { search_named: "Search {name}" },
    placeholder: { search: "Search" },
    status: { loading: "Loading", no_choices: "No choices", no_match: "Nothing found" }
  }
};

const MORE = ["Atlas", "Beacon", "Cobalt", "Delta", "Ember", "Falcon", "Garnet", "Harbor", "Indigo"];

const ENTRIES: SideEntry[] = [
  { type: "label", label: "Northwind" },
  { value: 1, label: "Northwind" },
  { value: 2, label: "Sales", depth: 1 },
  { value: 3, label: "Field team", depth: 2, line: "Northwind / Sales" },
  { type: "label", label: "Others" },
  ...MORE.map((label, index) => ({ value: 10 + index, label }))
];

// What heads the body: the value chosen in words alone, or the shared table of the choices or the
// table's placeholder above them.
type SidebarBody = "words" | "table" | "skeleton";

const COLUMNS = [
  { accessorKey: "label", header: "Name" },
  { accessorKey: "value", header: "Number" }
];

interface SidebarState {
  body: SidebarBody;
  listed: boolean;
  entries: SideEntry[] | null;
  failure: string;
  retries: number;
}

const state = ref<SidebarState>({ body: "words", listed: true, entries: ENTRIES, failure: "", retries: 0 });
const chosen = ref<string | number>(1);

const Page = defineComponent(() => {
  onMounted(() => {
    (window as unknown as { sidebar: typeof state.value }).sidebar = state.value;
  });

  return () =>
    h(UApp, null, () =>
      h("div", { style: "height:100dvh", class: "flex min-h-0 flex-col" }, [
        h(
          ChoiceSidebar,
          {
            label: "Organisations",
            entries: state.value.entries,
            chosen: chosen.value,
            saveId: "harness-sidebar",
            listed: state.value.listed,
            failure: state.value.failure,
            reading: false,
            onChoose: (value: string | number) => (chosen.value = value),
            onRetry: () => (state.value.retries += 1)
          },
          {
            actions: () => h(IconButton, { size: "sm", icon: "i-material-symbols-search", label: "Add", "data-add": "" }),
            default: () => [
              state.value.body === "table" ? h(DataTable, { data: MORE.map((label, index) => ({ label, value: 10 + index })), columns: COLUMNS, layout: "fill" }) : null,
              state.value.body === "skeleton" ? h(DataTableSkeleton, { headers: COLUMNS.map((column) => column.header), layout: "fill", label: "Loading" }) : null,
              h("p", { id: "chosen", class: "p-4 text-sm" }, String(chosen.value))
            ]
          }
        )
      ])
    );
});

const style = document.createElement("style");

style.textContent = sheet;
document.head.append(style);

Object.assign(useAppConfig(), { bmoUi: { zone: "UTC", locale: "en-GB" } });

createApp(Page)
  .use(createI18n({ legacy: false, locale: "en", messages: { en: WORDS }, missingWarn: false, fallbackWarn: false }))
  .use(ui)
  .mount("#page");

markPainted();
watchOverlays();
