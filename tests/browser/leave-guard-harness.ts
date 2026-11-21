import ui from "@nuxt/ui/vue-plugin";
import { computed, createApp, defineComponent, h, ref } from "vue";
import { createI18n, useI18n } from "vue-i18n";
import { RouterView, createRouter, createWebHistory, useRoute, useRouter } from "vue-router";

import UApp from "@nuxt/ui/components/App.vue";
import UButton from "@nuxt/ui/components/Button.vue";

import { useLeaveGuard } from "../../app/domain/form-save";
import { layerCount } from "../../app/domain/layers";
import { watchOverlays } from "../../app/domain/overlays";
import sheet from "./leave-guard-harness.css?inline";

// A page holding a form, guarded as it is left (`docs/components.md`, "Forms"): its view named in the
// address, two buttons that move it to the other view and to another page, and one text box whose
// words are the form's change. The page stands outside Nuxt, so it wires itself as a host's page is
// wired: the framework's router over the browser's history, the library's app root, the overlays
// module watching the page, and the words handed over here.

const WORDS = {
  common: {
    action: { cancel: "Cancel", close: "Close", discard: "Discard" },
    title: { discard_changes: "Discard unsaved changes?" }
  }
};

const text = ref("");

const Form = defineComponent(() => {
  const route = useRoute();
  const router = useRouter();
  const { t } = useI18n();
  const dirty = computed(() => text.value !== "");

  useLeaveGuard(dirty, t);

  return () =>
    h("main", { "data-view": String(route.query.view ?? "") }, [
      h(UButton, { label: "Other view", "data-other-view": "", onClick: () => void router.push({ query: { view: route.query.view === "weekly" ? "monthly" : "weekly" } }) }),
      h(UButton, { label: "Elsewhere", "data-elsewhere": "", onClick: () => void router.push("/elsewhere") }),
      h("textarea", { "data-opinion": "", value: text.value, onInput: (event: Event) => (text.value = (event.target as HTMLTextAreaElement).value) })
    ]);
});

const Elsewhere = defineComponent(() => () => h("main", { "data-elsewhere-page": "" }, "Elsewhere"));

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: Form },
    { path: "/elsewhere", component: Elsewhere }
  ]
});

// The layer's code reaches the framework's router without importing it, since Nuxt binds it in a host.
Object.assign(globalThis, { useRouter: () => router });

const style = document.createElement("style");

style.textContent = sheet;
document.head.append(style);

createApp(defineComponent(() => () => h(UApp, null, () => h(RouterView))))
  .use(createI18n({ legacy: false, locale: "en", messages: { en: WORDS }, missingWarn: false, fallbackWarn: false }))
  .use(ui)
  .use(router)
  .mount("#page");

watchOverlays();

// Where the router stands, which the address alone does not say while a navigation waits.
function routed(): string {
  return router.currentRoute.value.fullPath;
}

// A move of the router's own, as a link of the host's makes.
function visit(path: string): Promise<unknown> {
  return router.push(path);
}

Object.assign(window, { layerCount, routed, visit });
