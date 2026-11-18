import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, ref } from "vue";
import { createI18n } from "vue-i18n";

import UApp from "@nuxt/ui/components/App.vue";
import UButton from "@nuxt/ui/components/Button.vue";

import SettingsDialog from "../../app/components/SettingsDialog.vue";
import { layerCount } from "../../app/domain/layers";
import { watchInputModality } from "../../app/domain/modality";
import { watchOverlays } from "../../app/domain/overlays";
import { TOOLTIP_PROVIDER } from "../../app/domain/tooltip";
import sheet from "./close-guard-harness.css?inline";

// A form's dialog left by the back gesture while it holds a change (`docs/components.md`, "Forms" and
// "Floating things"): the button that opens it, the dialog with one text box, and the page's
// floating things found by the overlays module as a host's are. The form holds a change while the
// box holds any text. The page stands outside Nuxt, so it wires itself as a host's page is wired: the
// library's app root holding the boundary's tooltip setting, the page's own mark of which hand last
// moved the focus, and the words handed over here.

const WORDS = {
  common: {
    action: { cancel: "Cancel", close: "Close", discard: "Discard" },
    title: { discard_changes: "Discard unsaved changes?" }
  }
};

// The layer's code reaches the framework's router without importing it, since Nuxt binds it in a
// host; a page with no pages hands over one that keeps no history of its own, as the framework's
// small router does.
Object.assign(globalThis, { useRouter: () => ({ options: {}, beforeEach: () => undefined }) });

const Page = defineComponent(() => {
  const open = ref(false);
  const text = ref("");

  return () =>
    h(UApp, { tooltip: TOOLTIP_PROVIDER }, () => [
      h(UButton, { label: "New request", "data-open": "", onClick: () => (open.value = true) }),
      h(
        SettingsDialog,
        {
          open: open.value,
          "onUpdate:open": (standing: boolean) => {
            open.value = standing;
            if (!standing) text.value = "";
          },
          title: "New request",
          dirty: text.value !== ""
        },
        () => h("textarea", { "data-reason": "", value: text.value, onInput: (event: Event) => (text.value = (event.target as HTMLTextAreaElement).value) })
      )
    ]);
});

const style = document.createElement("style");

style.textContent = sheet;
document.head.append(style);

watchInputModality(document);

createApp(Page)
  .use(createI18n({ legacy: false, locale: "en", messages: { en: WORDS }, missingWarn: false, fallbackWarn: false }))
  .use(ui)
  .mount("#page");

watchOverlays();

Object.assign(window, { layerCount });
