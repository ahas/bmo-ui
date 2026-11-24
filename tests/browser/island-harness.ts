import ui from "@nuxt/ui/vue-plugin";
import { computed, createApp, defineComponent, h, nextTick, onScopeDispose, ref, useTemplateRef, watch } from "vue";
import { createI18n } from "vue-i18n";

import UApp from "@nuxt/ui/components/App.vue";

import MessageIsland from "../../app/components/MessageIsland.vue";
import { islandState, messageOf, raise } from "../../app/domain/island";
import { TOOLTIP_PROVIDER } from "../../app/domain/tooltip";
import sheet from "./island-harness.css?inline";

import type { Ref } from "vue";

// The message island (`docs/components.md`, "Messages") on a page that says nothing else, holding
// one notice that stands until it is pressed. The page's address says which: `?layout=inline` a
// notice of one line with a key at its end, anything else one that says more with its keys under
// its words; `&theme=dark` draws it in the dark mode. The page stands outside Nuxt, so it wires
// itself as a host's page is wired: the framework's names a host binds, the library's app root and
// the words handed over here.

const states = new Map<string, Ref<unknown>>();

Object.assign(globalThis, {
  computed,
  watch,
  nextTick,
  onScopeDispose,
  useTemplateRef,
  useState: (key: string, start: () => unknown) => {
    if (!states.has(key)) states.set(key, ref(start()));

    return states.get(key);
  },
  useAppConfig: () => ({ bmoUi: { locale: "en" } }),
  navigateTo: async () => undefined
});

const WORDS = { common: { aria: { more_notices: "{n} more notices" } } };

const query = new URLSearchParams(location.search);
const inline = query.get("layout") === "inline";

if (query.get("theme") === "dark") document.documentElement.classList.add("dark");

// What a host's page stands its client-only parts in: here every part is on the client.
const ClientOnly = defineComponent((_, { slots }) => () => slots.default?.());

const Page = defineComponent(() => {
  const state = islandState();

  state.value = raise(
    state.value,
    messageOf({
      title: inline ? "A new version is ready" : "A new version is ready to load",
      description: inline ? null : "Reload the page to start using it.",
      duration: null,
      actions: inline ? [{ label: "Reload", tone: "primary", press: () => undefined }] : [{ label: "Later", press: () => undefined }, { label: "Reload", tone: "primary", press: () => undefined }]
    })
  );

  return () => h(UApp, { tooltip: TOOLTIP_PROVIDER }, () => [h(MessageIsland)]);
});

const style = document.createElement("style");

style.textContent = sheet;
document.head.append(style);

createApp(Page)
  .component("ClientOnly", ClientOnly)
  .use(createI18n({ legacy: false, locale: "en", messages: { en: WORDS }, missingWarn: false, fallbackWarn: false }))
  .use(ui)
  .mount("#page");
