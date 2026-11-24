import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, ref } from "vue";
import { createI18n } from "vue-i18n";

import UApp from "@nuxt/ui/components/App.vue";
import UCheckbox from "@nuxt/ui/components/Checkbox.vue";

import ChooseAll from "../../app/components/ChooseAll.vue";
import { CHOOSE_CELL } from "../../app/domain/chooseall";
import { TOOLTIP_PROVIDER } from "../../app/domain/tooltip";
import sheet from "./choose-cell-harness.css?inline";

// A list that chooses many (`docs/design.md`, "Lists"), drawn the way a screen draws one: the
// choose-all control over the list in a cell of words, and under it rows that each stand their mark
// in the chooseall module's mark cell, the row's room round its words, and its words. The page
// stands outside Nuxt, so it wires itself as a host's page is wired: the library's app root holding
// the boundary's tooltip setting, and the words handed over here.

const WORDS = { common: { action: { choose_all: "Choose all", choose_none: "Choose none" } } };
const ROWS = ["first", "second", "third"];

const Page = defineComponent(() => {
  const selected = ref(new Set<string>(["second"]));

  function pick(key: string): void {
    const next = new Set(selected.value);

    if (next.has(key)) next.delete(key);
    else next.add(key);
    selected.value = next;
  }

  return () =>
    h(UApp, { tooltip: TOOLTIP_PROVIDER }, () =>
      h("div", { class: "mx-auto max-w-2xl px-4 py-4" }, [
        h("div", { class: "flex min-h-12 items-center gap-2", "data-choose-all": "" }, [
          h(ChooseAll, { keys: ROWS, selected: selected.value, onChoose: (all: boolean) => (selected.value = new Set(all ? ROWS : [])) })
        ]),
        ...ROWS.map((key) =>
          h("div", { class: "flex items-center gap-2 py-2.5", "data-row": key }, [
            h("div", { class: [CHOOSE_CELL, "cursor-pointer hover:bg-elevated active:bg-elevated"], "data-cell": "", onClick: () => pick(key) }, [
              h(UCheckbox, { modelValue: selected.value.has(key), "aria-label": key })
            ]),
            h("span", { class: "min-w-0 flex-1 text-sm" }, key)
          ])
        )
      ])
    );
});

const style = document.createElement("style");

style.textContent = sheet;
document.head.append(style);

createApp(Page)
  .use(createI18n({ legacy: false, locale: "en", messages: { en: WORDS }, missingWarn: false, fallbackWarn: false }))
  .use(ui)
  .mount("#page");
