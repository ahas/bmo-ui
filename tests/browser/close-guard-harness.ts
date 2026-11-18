import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, ref, shallowRef } from "vue";
import { createI18n } from "vue-i18n";

import UApp from "@nuxt/ui/components/App.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UInputDate from "@nuxt/ui/components/InputDate.vue";
import UInputTime from "@nuxt/ui/components/InputTime.vue";
import UPopover from "@nuxt/ui/components/Popover.vue";

import SettingsDialog from "../../app/components/SettingsDialog.vue";
import { useOpenedWith } from "../../app/domain/form-save";
import { layerCount } from "../../app/domain/layers";
import { watchInputModality } from "../../app/domain/modality";
import { watchOverlays } from "../../app/domain/overlays";
import { TOOLTIP_PROVIDER } from "../../app/domain/tooltip";
import sheet from "./close-guard-harness.css?inline";

import type { InputDateProps, InputTimeProps } from "@nuxt/ui";

// A form's dialog closed with and without a change (`docs/components.md`, "Forms" and "Floating
// things"): the two buttons that open it, the dialog with one text box, a date field, a time field,
// a picker floating over the dialog and a save, and the page's floating things found by the
// overlays module as a host's are. Opened on a request, the box's text is the form's data, which
// lands only once the test hands it over (`land`), after the dialog opened; opened for a new
// request, the form stands at once with its defaults and loads nothing. The form hands its values
// to the opened-with snapshot, saying when it is ready where the address asks for it (`?ready`). The
// page stands outside Nuxt, so it wires itself as a host's page is wired: the library's app root
// holding the boundary's tooltip setting, the page's own mark of which hand last moved the focus,
// and the words handed over here.

const WORDS = {
  common: {
    action: { cancel: "Cancel", close: "Close", discard: "Discard", save: "Save" },
    title: { discard_changes: "Discard unsaved changes?" }
  }
};

// The layer's code reaches the framework's router without importing it, since Nuxt binds it in a
// host; a page with no pages hands over one that keeps no history of its own, as the framework's
// small router does.
Object.assign(globalThis, { useRouter: () => ({ options: {}, beforeEach: () => undefined }) });

const loaded = ref(false);
const text = ref("");
// Whether the dialog stands for a new request, and the length a new request takes by default.
const creating = ref(false);
const length = ref("");
// The day and the start time the request names, chosen in the component library's own fields.
const day = shallowRef<InputDateProps<boolean>["modelValue"]>(undefined);
const start = shallowRef<InputTimeProps<boolean>["modelValue"]>(undefined);

const Page = defineComponent(() => {
  const open = ref(false);
  const opened = useOpenedWith(() => ({ reason: text.value, length: length.value, day: day.value, start: start.value }), { open, ready: new URLSearchParams(location.search).has("ready") ? loaded : undefined });

  return () =>
    h(UApp, { tooltip: TOOLTIP_PROVIDER }, () => [
      h(UButton, {
        label: "Open request",
        "data-open": "",
        onClick: () => {
          creating.value = false;
          open.value = true;
        }
      }),
      h(UButton, {
        label: "New request",
        "data-create": "",
        onClick: () => {
          creating.value = true;
          length.value = "whole day";
          loaded.value = true;
          open.value = true;
        }
      }),
      h(
        SettingsDialog,
        {
          open: open.value,
          "onUpdate:open": (standing: boolean) => {
            open.value = standing;
            if (!standing) {
              text.value = "";
              length.value = "";
              day.value = undefined;
              start.value = undefined;
              loaded.value = false;
            }
          },
          title: creating.value ? "New request" : "Request",
          dirty: opened
        },
        {
          default: () => [
            h("textarea", { "data-reason": "", value: text.value, onInput: (event: Event) => (text.value = (event.target as HTMLTextAreaElement).value) }),
            h(UInputDate, { "data-day": "", modelValue: day.value, "onUpdate:modelValue": (value: InputDateProps<boolean>["modelValue"]) => (day.value = value) }),
            h(UInputTime, { "data-start": "", modelValue: start.value, "onUpdate:modelValue": (value: InputTimeProps<boolean>["modelValue"]) => (start.value = value) }),
            h(UPopover, null, {
              default: () => h(UButton, { label: "Pick a length", "data-pick": "" }),
              content: () => h(UButton, { label: "Half day", "data-half": "", onClick: () => (length.value = "half day") })
            })
          ],
          // The save keeps the dialog standing, so what it leaves is read by the next close.
          footer: () => h(UButton, { label: "Save", "data-save": "", onClick: () => void opened.take() })
        }
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

// The form's data landing from its read.
function land(reason: string): void {
  text.value = reason;
  loaded.value = true;
}

Object.assign(window, { layerCount, land });
