import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, ref } from "vue";
import { createI18n } from "vue-i18n";

import UApp from "@nuxt/ui/components/App.vue";
import UButton from "@nuxt/ui/components/Button.vue";

import SettingsDialog from "../../app/components/SettingsDialog.vue";
import { watchInputModality } from "../../app/domain/modality";
import { TOOLTIP_PROVIDER } from "../../app/domain/tooltip";
import sheet from "./dialog-head-harness.css?inline";

// The heads a dialog stands with (`docs/components.md`, "Floating things"): one button for each,
// opening the settings dialog with a one-line title, with a title and its description under it, and
// with a title long enough to wrap. The page stands outside Nuxt, so it wires itself as a host's
// page is wired: the library's app root holding the boundary's tooltip setting, the page's own mark
// of which hand last moved the focus, and the words handed over here.

const WORDS = { common: { action: { cancel: "Cancel", close: "Close", discard: "Discard" } } };

// The layer's code reaches the framework's router without importing it, since Nuxt binds it in a
// host; a page with no pages hands over one that keeps no history of its own.
Object.assign(globalThis, { useRouter: () => ({ options: {}, beforeEach: () => undefined }) });

const HEADS = {
  title: { title: "Rename" },
  described: { title: "Share", description: "draft.md" },
  long: { title: "A title long enough to run onto more than one line before it reaches the close" }
};

const Page = defineComponent(() => {
  const opened = ref<keyof typeof HEADS | null>(null);

  return () =>
    h(UApp, { tooltip: TOOLTIP_PROVIDER }, () => [
      ...Object.keys(HEADS).map((head) => h(UButton, { label: head, "data-open": head, onClick: () => (opened.value = head as keyof typeof HEADS) })),
      ...Object.entries(HEADS).map(([head, words]) =>
        h(SettingsDialog, {
          ...words,
          open: opened.value === head,
          "onUpdate:open": (standing: boolean) => (opened.value = standing ? (head as keyof typeof HEADS) : null)
        })
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
