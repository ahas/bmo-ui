import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, ref } from "vue";
import type { Component } from "vue";

import UApp from "@nuxt/ui/components/App.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UContextMenu from "@nuxt/ui/components/ContextMenu.vue";
import UDropdownMenu from "@nuxt/ui/components/DropdownMenu.vue";
import InputMenu from "@nuxt/ui/components/InputMenu.vue";
import Select from "@nuxt/ui/components/Select.vue";
import SelectMenu from "@nuxt/ui/components/SelectMenu.vue";

import sheet from "./menus-harness.css?inline";

import type { DropdownMenuItem, SelectItem } from "@nuxt/ui";

// Every kind of list the library drops from a control (`docs/design.md`, "Lists"), each at the size
// the test asks for: a select, a select menu and an input menu each holding a group's label and three
// choices with a mark before each, one of them chosen, the two that search once more with no choice
// to say their list is empty, and a dropdown menu and a context menu each holding a label, an entry
// with a mark and a shortcut of two keys, and a checked entry. The page stands outside Nuxt, so the
// library is installed as a Vue plugin.

// The three lists of choices are generic over their items, which a render function cannot name, so
// they are drawn as plain components.
const USelect = Select as unknown as Component;
const USelectMenu = SelectMenu as unknown as Component;
const UInputMenu = InputMenu as unknown as Component;

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

type Size = (typeof SIZES)[number];

const size = ref<Size>("md");

Object.assign(window, { sizeMenus: (one: Size) => (size.value = one) });

const CHOICES: SelectItem[] = [
  { type: "label", label: "Shapes" },
  ...["Circle", "Square", "Triangle"].map((label) => ({ label, value: label.toLowerCase(), icon: "i-material-symbols-check" }))
];

const ACTIONS: DropdownMenuItem[] = [
  { type: "label", label: "Actions" },
  { label: "Open", icon: "i-material-symbols-check", kbds: ["shift", "k"] },
  { label: "Pinned", type: "checkbox", checked: true }
];

const Page = defineComponent(() => {
  // One choice of each list stands chosen, so its row draws its check.
  const choosing = { defaultValue: "square", valueKey: "value" as const, class: "w-48" };

  return () =>
    h(UApp, null, () =>
      h("div", { class: "flex flex-col items-start gap-4 p-4", key: size.value }, [
        h(USelect, { id: "select", items: CHOICES, size: size.value, ...choosing }),
        h(USelectMenu, { id: "select-menu", items: CHOICES, size: size.value, ...choosing }),
        h(USelectMenu, { id: "select-menu-empty", items: [], size: size.value, class: "w-48" }),
        h(UInputMenu, { id: "input-menu", items: CHOICES, size: size.value, openOnClick: true, ...choosing }),
        h(UInputMenu, { id: "input-menu-empty", items: [], size: size.value, openOnClick: true, class: "w-48" }),
        h(UDropdownMenu, { items: ACTIONS, size: size.value }, () => h(UButton, { id: "dropdown-menu", label: "Menu" })),
        h(UContextMenu, { items: ACTIONS, size: size.value }, () => h("div", { id: "context-menu", class: "h-16 w-48" }))
      ])
    );
});

const style = document.createElement("style");

style.textContent = sheet;
document.head.append(style);

createApp(Page).use(ui).mount("#page");
