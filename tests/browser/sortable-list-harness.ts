import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h, nextTick, onMounted, onScopeDispose, ref, watch } from "vue";
import { createI18n } from "vue-i18n";

import UApp from "@nuxt/ui/components/App.vue";

import SortableList from "../../app/components/SortableList.vue";
import { markPainted } from "../../app/domain/loading";
import sheet from "./sortable-list-harness.css?inline";

// The sortable list (`docs/components.md`, "Sortable lists") on a page that says nothing else: twelve named
// items in a box short enough to scroll, each a row as tall as a list item. The page keeps the order the list
// answers and writes it below the box, and the test reaches it and the moves answered through `window.sortable`.
// The page stands outside Nuxt, so the library is installed as a Vue plugin and the words are handed over here.

Object.assign(globalThis, {
  watch,
  nextTick,
  onScopeDispose,
  useRouter: () => ({ options: {}, beforeEach: () => undefined })
});

const WORDS = {
  common: {
    aria: { move_named: "Move {name}" },
    status: {
      item_moved: "{name}, place {place} of {count}",
      item_picked: "{name} picked up",
      item_put_back: "{name} put back",
      item_set_down: "{name} set down at place {place}"
    }
  }
};

const NAMES = ["Alder", "Birch", "Cedar", "Dogwood", "Elm", "Fir", "Ginkgo", "Hazel", "Ivy", "Juniper", "Kapok", "Larch"];

interface Named {
  id: number;
  name: string;
}

const order = ref<Named[]>(NAMES.map((name, index) => ({ id: index + 1, name })));
const moves = ref<[number, number][]>([]);

const Page = defineComponent(() => {
  onMounted(() => {
    (window as unknown as { sortable: unknown }).sortable = { order, moves };
  });

  return () =>
    h(UApp, null, () =>
      h("div", { class: "p-4" }, [
        h("div", { style: "height:320px", class: "overflow-y-auto rounded-md border border-default", "data-scroller": "" }, [
          h(
            SortableList,
            {
              items: order.value,
              itemKey: (item: unknown) => (item as Named).id,
              itemLabel: (item: unknown) => (item as Named).name,
              onMove: (from: number, to: number) => {
                const next = [...order.value];
                const [moved] = next.splice(from, 1);

                next.splice(to, 0, moved!);
                order.value = next;
                moves.value.push([from, to]);
              }
            },
            { item: ({ item }: { item: { name: string } }) => h("div", { class: "flex h-12 items-center text-sm", "data-name": item.name }, item.name) }
          )
        ]),
        h("p", { id: "order", class: "pt-4 text-sm" }, order.value.map((item) => item.name).join(" "))
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

markPainted();
