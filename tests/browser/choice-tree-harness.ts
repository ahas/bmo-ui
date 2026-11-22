import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, nextTick, onMounted, onScopeDispose, ref, watch } from "vue";
import { createI18n } from "vue-i18n";

import UApp from "@nuxt/ui/components/App.vue";

import ChoiceTree from "../../app/components/ChoiceTree.vue";
import { markPainted } from "../../app/domain/loading";
import { watchOverlays } from "../../app/domain/overlays";
import sheet from "./choice-tree-harness.css?inline";

import type { SideNode } from "../../app/domain/side-parts";
import type { Component } from "vue";

// The side tree (`docs/components.md`, "Choosing from a side tree") on a page that says nothing else:
// three companies, the first holding a unit with a team under it and a second unit wearing a badge, the second named
// with an icon and holding nothing until the test hands it its units, the key chosen written in the
// body. The test reaches the page's state through `window.tree`: it hands the second company its
// units, chooses another node of its own accord, takes the nodes away as unread, says the read failed, has the body place the phone's opener
// in a toolbar row of its own, and counts the choices, the refreshes and the drops handed over; the rows
// take a drag of the harness's own kind, every row but the third company's. The page stands outside Nuxt, so the library is installed as a Vue plugin and the words
// are handed over here.

Object.assign(globalThis, {
  watch,
  nextTick,
  onScopeDispose,
  useRouter: () => ({ options: {}, beforeEach: () => undefined })
});

const WORDS = {
  common: {
    action: { refresh: "Refresh" },
    aria: { search_named: "Search {name}", holds_chosen: "Holds the chosen" },
    placeholder: { search: "Search" },
    status: { loading: "Loading", no_choices: "No choices", no_match: "Nothing found" }
  }
};

// The kind of data a drag carries that the rows take.
const HARNESS_DRAG = "application/x-harness-rows";

// The second company's units, handed over by the test once the company is chosen.
const ATLAS_UNITS: SideNode[] = [
  { key: 6, label: "Harbor", children: [{ key: 8, label: "Night shift" }] },
  { key: 7, label: "Indigo" }
];

function nodesOf(atlasUnits: readonly SideNode[] | null): SideNode[] {
  return [
    {
      key: "north",
      label: "Northwind",
      children: [
        { key: 2, label: "Sales", children: [{ key: 3, label: "Field team" }] },
        { key: 4, label: "Support", badge: "Desk" }
      ]
    },
    { key: "atlas", label: "Atlas", icon: "i-material-symbols-domain", ...(atlasUnits === null ? {} : { children: [...atlasUnits] }) },
    { key: "beacon", label: "Beacon" }
  ];
}

interface TreeState {
  unread: boolean;
  // Whether the body places the phone's opener in a toolbar row of its own.
  openerInBody: boolean;
  atlasUnits: boolean;
  failure: string;
  choices: (string | number)[];
  retries: number;
  drops: (string | number)[];
}

const state = ref<TreeState>({ unread: false, openerInBody: false, atlasUnits: false, failure: "", choices: [], retries: 0, drops: [] });
const chosen = ref<string | number>(3);

const Page = defineComponent(() => {
  onMounted(() => {
    (window as unknown as { tree: typeof state.value }).tree = state.value;
    // The host choosing another node of its own accord, as an address it follows would.
    (window as unknown as { choose: (key: string | number) => void }).choose = (key) => (chosen.value = key);
  });

  return () =>
    h(UApp, null, () =>
      h("div", { style: "height:100dvh", class: "flex min-h-0 flex-col" }, [
        h(
          ChoiceTree,
          {
            label: "Organisations",
            nodes: state.value.unread ? null : nodesOf(state.value.atlasUnits ? ATLAS_UNITS : null),
            chosen: chosen.value,
            saveId: "harness-tree",
            failure: state.value.failure,
            reading: false,
            openerInBody: state.value.openerInBody,
            onChoose: (key: string | number) => {
              state.value.choices.push(key);
              chosen.value = key;
            },
            onRetry: () => (state.value.retries += 1),
            dropTypes: [HARNESS_DRAG],
            dropTakes: (key: string | number) => key !== "beacon",
            onDrop: (key: string | number) => state.value.drops.push(key)
          },
          {
            default: ({ opener }: { opener: Component }) => [
              state.value.openerInBody ? h("div", { class: "flex h-12 shrink-0 items-center px-2", "data-toolbar": "" }, [h(opener)]) : null,
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
