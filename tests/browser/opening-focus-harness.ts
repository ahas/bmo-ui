import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, onMounted, ref } from "vue";
import { createI18n } from "vue-i18n";

import UApp from "@nuxt/ui/components/App.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UModal from "@nuxt/ui/components/Modal.vue";

import { watchInputModality } from "../../app/domain/modality";
import { watchOverlays } from "../../app/domain/overlays";
import { TOOLTIP_PROVIDER } from "../../app/domain/tooltip";
import sheet from "./opening-focus-harness.css?inline";

// A dialog opened from the address as the page loads, by a press and by a key (`docs/design.md`,
// "Focus"): one button that opens it, and the library's own dialog with its own close and two
// controls in its body, so the focus it takes up as it opens lands on the close. The address asks
// for it open once the page is up (`?open`), as a screen reading its query does. The page stands
// outside Nuxt, so it wires itself as a host's page is wired: the library's app root holding the
// boundary's tooltip setting, the page's own mark of which hand last moved the focus, and the
// floating things found by the overlays module.

const WORDS = { common: { action: { close: "Close" } } };

// The layer's code reaches the framework's router without importing it, since Nuxt binds it in a
// host; a page with no pages hands over one that keeps no history of its own, as the framework's
// small router does.
Object.assign(globalThis, { useRouter: () => ({ options: {}, beforeEach: () => undefined }) });

const Page = defineComponent(() => {
  const open = ref(false);

  onMounted(() => {
    open.value = new URLSearchParams(location.search).has("open");
  });

  return () =>
    h(UApp, { tooltip: TOOLTIP_PROVIDER }, () => [
      h(UButton, { label: "Open item", "data-open": "", onClick: () => (open.value = true) }),
      h(
        UModal,
        { open: open.value, "onUpdate:open": (standing: boolean) => (open.value = standing), title: "Item" },
        { body: () => [h(UButton, { label: "Edit", "data-edit": "" }), h(UButton, { label: "Remove", "data-remove": "" })] }
      )
    ]);
});

const style = document.createElement("style");

style.textContent = sheet;
document.head.append(style);

watchInputModality(document);
watchOverlays();

createApp(Page)
  .use(createI18n({ legacy: false, locale: "en", messages: { en: WORDS }, missingWarn: false, fallbackWarn: false }))
  .use(ui)
  .mount("#page");
