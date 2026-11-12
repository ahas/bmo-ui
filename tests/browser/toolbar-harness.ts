import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, ref } from "vue";
import { createI18n } from "vue-i18n";

import UApp from "@nuxt/ui/components/App.vue";
import UButton from "@nuxt/ui/components/Button.vue";
import UTooltip from "@nuxt/ui/components/Tooltip.vue";

import ActionGroup from "../../app/components/ActionGroup.vue";
import ChooseAll from "../../app/components/ChooseAll.vue";
import HintTip from "../../app/components/HintTip.vue";
import IconButton from "../../app/components/IconButton.vue";
import NumberInput from "../../app/components/NumberInput.vue";
import ImageViewer from "../../app/components/ImageViewer.vue";
import MarkupButtonTip from "../../app/components/MarkupButtonTip.vue";
import TabBar from "../../app/components/TabBar.vue";
import TabSwitch from "../../app/components/TabSwitch.vue";
import ToolBar from "../../app/components/ToolBar.vue";
import { copyFromPress } from "../../app/domain/code-copy";
import sheet from "./toolbar-harness.css?inline";

// The rows a screen lays under the title bar, as a screen builds them, drawn by the layer's own
// components and the library's own buttons (`docs/components.md`, "Tab bar and toolbar"). The toolbar
// holds the way back at its left end, given a route as a screen gives it, the control that chooses
// every row, a view switch, a cell of words, a cell of buttons given routes, which the library draws as
// links, a cell of buttons the shared tooltip names, a cell of named words beside a named button, and
// the group of actions at its right end. Under it stand a tab bar with its view switch and actions,
// and a diagram's zoom buttons as the host's renderer writes them. Opened with `?viewer`, the page
// holds the picture viewer instead, open, with its zoom buttons at its foot; opened with `?icons`, it
// holds the layer's icon button, a group of standing actions, a view switch showing its icons alone
// and a number box, each press counted; opened with `?markup`, it holds a fenced block's copy button
// and a diagram's zoom buttons as the host's renderer writes them, named by the markup button layer,
// the copy button copying through the code-copy module and each press counted. The page stands
// outside Nuxt, so the library is installed as a Vue plugin and the words are handed over here.

const WORDS = {
  common: {
    action: { choose_all: "Choose all", choose_none: "Choose none", more: "More", zoom_in: "Zoom in", zoom_out: "Zoom out", fit_screen: "Fit" },
    aria: { increase: "Increase", decrease: "Decrease" },
    label: { properties: "Properties" }
  }
};

const VIEWS = [
  { value: "rendered", label: "Rendered", icon: "i-material-symbols-visibility-outline" },
  { value: "source", label: "Source", icon: "i-material-symbols-code" }
] as const;

const KEYS = ["one", "two", "three"];
const TABS = [
  { id: "plan", label: "plan.md" },
  { id: "notes", label: "notes.md" }
];
// The picture the viewer opens: a grey field, drawn here so the page fetches nothing for it.
function picture(): string {
  const canvas = document.createElement("canvas");

  canvas.width = 400;
  canvas.height = 300;
  canvas.getContext("2d")!.fillRect(0, 0, 400, 300);

  return canvas.toDataURL();
}

// The zoom buttons a host's renderer writes beside a drawn diagram, by the markup the layer's
// stylesheet reads (`docs/boundary.md`, "Classes and keyframes"), named for the markup button layer
// where it is asked to be.
const MARK = '<svg viewBox="0 0 24 24"><path d="M4 11h16v2H4z"/></svg>';

function diagram(named: boolean): string {
  const tools = ["out", "in", "fit"].map((zoom) => `<button type="button" data-diagram-zoom="${zoom}" aria-label="${zoom}"${named ? ` data-tooltip="${zoom}"` : ""}>${MARK}</button>`);

  return `<div class="markdown-diagram" data-drawn><div class="markdown-diagram-figure"></div><div class="markdown-diagram-tools">${tools.join("")}</div></div>`;
}

// The words the code-copy module names its button with, as a host's language pack would hand them.
const COPY_WORDS: Record<string, string> = { "common.action.copy": "Copy", "common.status.copied": "Copied" };
const MARKUP = `<div class="markdown-code"><pre><code>one\ntwo\nthree</code></pre><button type="button" class="markdown-copy" data-copy aria-label="Copy" data-tooltip="Copy">${MARK}</button></div>${diagram(true)}`;

const Page = defineComponent(() => {
  const chosen = ref(new Set<string>());
  const view = ref<string>("rendered");
  const narrow = window.innerWidth < 640;
  const actions = ["refresh", "edit", "share"].map((id) => ({ id, label: id, icon: "i-material-symbols-refresh", onSelect: () => undefined }));

  const open = ref(true);
  const active = ref("plan");

  if (new URLSearchParams(location.search).has("icons")) {
    const pressed: string[] = [];

    (window as unknown as { pressed: string[] }).pressed = pressed;
    const press = (id: string) => () => pressed.push(id);
    const standing = ["edit", "share"].map((id) => ({ id, label: id, icon: "i-material-symbols-refresh", onSelect: press(id) }));

    return () =>
      h(UApp, null, () =>
        h("div", { class: "flex items-center gap-4 p-4" }, [
          h(IconButton, { id: "alone", label: "Refresh", icon: "i-material-symbols-refresh", onClick: press("alone") }),
          h(ActionGroup, { id: "standing", actions: standing, narrowFold: false }),
          h(TabSwitch, { id: "icons-switch", items: VIEWS, modelValue: view.value, label: "View", compact: true, "onUpdate:modelValue": (value: string) => (view.value = value) }),
          h("div", { id: "number" }, [h(NumberInput, { modelValue: 3, digits: 2 })])
        ])
      );
  }

  if (new URLSearchParams(location.search).has("markup")) {
    const pressed: string[] = [];

    (window as unknown as { pressed: string[] }).pressed = pressed;

    const onClick = (event: MouseEvent): void => {
      const button = (event.target as Element).closest("button");

      copyFromPress((key) => COPY_WORDS[key] ?? key, event, async () => true);

      if (button !== null) pressed.push(button.getAttribute("data-diagram-zoom") ?? "copy");
    };

    return () => h(UApp, null, () => [h("div", { class: "markdown p-4 pt-16", innerHTML: MARKUP, onClick }), h(MarkupButtonTip)]);
  }

  if (new URLSearchParams(location.search).has("viewer")) {
    return () => h(UApp, null, () => h(ImageViewer, { open: open.value, "onUpdate:open": (value: boolean) => (open.value = value), src: picture(), title: "Picture" }));
  }

  return () =>
    h(UApp, null, () => [
      h(ToolBar, { label: "Toolbar" }, () => [
        h("div", { id: "back" }, [
          h(UTooltip, { text: "Back" }, () => h(UButton, { to: "#previous-screen", icon: "i-material-symbols-arrow-back", color: "neutral", variant: "ghost", square: true, "aria-label": "Back" }))
        ]),
        h(ChooseAll, {
          id: "choose",
          keys: KEYS,
          selected: chosen.value,
          onChoose: (all: boolean) => {
            chosen.value = new Set(all ? KEYS : []);
          }
        }),
        h(TabSwitch, { id: "switch", items: VIEWS, modelValue: view.value, label: "View", compact: narrow, "onUpdate:modelValue": (value: string) => (view.value = value) }),
        h("div", { id: "words" }, [h("span", "Words")]),
        h("div", { id: "links" }, [
          h(UTooltip, { text: "Previous" }, () => h(UButton, { to: "#previous", icon: "i-material-symbols-chevron-left", color: "neutral", variant: "ghost", square: true, "aria-label": "Previous" })),
          h(UTooltip, { text: "Next" }, () => h(UButton, { to: "#next", icon: "i-material-symbols-chevron-right", color: "neutral", variant: "ghost", square: true, "aria-label": "Next" }))
        ]),
        h("div", { id: "named" }, [
          h(HintTip, { text: "Earlier" }, () => h(UButton, { icon: "i-material-symbols-chevron-left", color: "neutral", variant: "ghost", square: true, "aria-label": "Earlier" })),
          h(HintTip, { text: "Later" }, () => h(UButton, { icon: "i-material-symbols-chevron-right", color: "neutral", variant: "ghost", square: true, "aria-label": "Later" }))
        ]),
        h("div", { id: "named-words" }, [
          h(HintTip, { text: "Words named" }, () => "Named"),
          h(HintTip, { text: "Again" }, () => h(UButton, { icon: "i-material-symbols-refresh", color: "neutral", variant: "ghost", square: true, "aria-label": "Again" }))
        ]),
        h(ActionGroup, { id: "actions", class: "ms-auto", actions })
      ]),
      h(
        TabBar,
        { id: "tabs", tabs: TABS, active: active.value, label: "Tabs", actions: actions.slice(0, 2), "onUpdate:active": (id: string) => (active.value = id) },
        {
          switch: () => h(TabSwitch, { id: "tab-switch", items: VIEWS, modelValue: view.value, label: "Tab view", compact: narrow, "onUpdate:modelValue": (value: string) => (view.value = value) })
        }
      ),
      h("div", { class: "markdown p-4", innerHTML: diagram(false) })
    ]);
});

const style = document.createElement("style");

style.textContent = sheet;
document.head.append(style);

createApp(Page)
  .use(createI18n({ legacy: false, locale: "en", messages: { en: WORDS }, missingWarn: false, fallbackWarn: false }))
  .use(ui)
  .mount("#page");
