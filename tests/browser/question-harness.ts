import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, ref } from "vue";
import { createI18n } from "vue-i18n";

import UApp from "@nuxt/ui/components/App.vue";
import UButton from "@nuxt/ui/components/Button.vue";

import { watchInputModality } from "../../app/domain/modality";
import { askQuestion } from "../../app/domain/question";
import { TOOLTIP_PROVIDER } from "../../app/domain/tooltip";
import sheet from "./question-harness.css?inline";

// A question asked through the question module the way a screen asks it when something is pressed
// (`docs/components.md`, "Messages"), on a page that says nothing else: the button that asks, and a
// line naming how the question came back. The page stands outside Nuxt, so it wires itself as a
// host's page is wired: the library's app root holding the boundary's tooltip setting, the page's
// own mark of which hand last moved the focus, and the words handed over here.

const WORDS = { common: { action: { cancel: "Cancel", close: "Close", discard: "Discard" } } };

const Page = defineComponent(() => {
  const answer = ref("");

  function ask(): void {
    void askQuestion({ title: "Discard changes?", item: "draft.md", confirm: "Discard" }).then((taken) => {
      answer.value = taken ? "yes" : "no";
    });
  }

  return () =>
    h(UApp, { tooltip: TOOLTIP_PROVIDER }, () => [
      h(UButton, { label: "Ask", "data-ask": "", onClick: ask }),
      h("p", { "data-answer": "" }, answer.value)
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
