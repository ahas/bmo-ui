import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, nextTick, ref } from "vue";

import UApp from "@nuxt/ui/components/App.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UModal from "@nuxt/ui/components/Modal.vue";
import UTabs from "@nuxt/ui/components/Tabs.vue";

import sheet from "./tabs-indicator-harness.css?inline";

// A row of the library's tabs whose tabs change while one stays chosen (`docs/components.md`, "Tab
// bar and toolbar"): a dialog opened with three tabs and the middle one chosen, a tab put in front of
// them once it stands open, as a part of the dialog's data that lands late brings one, and that tab's
// name then made longer. The chosen tab moves with each and keeps its size; the line under it follows.

interface Tab {
  label: string;
  value: string;
}

const tabs = ref<Tab[]>([
  { label: "Status", value: "status" },
  { label: "Brief", value: "brief" },
  { label: "Request", value: "request" }
]);
const chosen = ref("brief");
const open = ref(false);

const Page = defineComponent(
  () => () =>
    h(UApp, null, () => [
      h(UButton, { label: "Open", "data-open": "", onClick: () => (open.value = true) }),
      h(
        UModal,
        { open: open.value, "onUpdate:open": (standing: boolean) => (open.value = standing), title: "Item" },
        {
          body: () =>
            h(UTabs, {
              items: tabs.value,
              modelValue: chosen.value,
              "onUpdate:modelValue": (value: string | number) => (chosen.value = String(value)),
              content: false,
              color: "neutral",
              variant: "link"
            })
        }
      )
    ])
);

const style = document.createElement("style");

style.textContent = sheet;
document.head.append(style);

createApp(Page).use(ui).mount("#page");

// A tab put in front of the others, the chosen one kept.
async function putInFront(label: string): Promise<void> {
  tabs.value = [{ label, value: "front" }, ...tabs.value];
  await nextTick();
}

// The front tab's name changed, the chosen one kept.
async function renameFront(label: string): Promise<void> {
  tabs.value = [{ label, value: "front" }, ...tabs.value.slice(1)];
  await nextTick();
}

Object.assign(window, { putInFront, renameFront });
