<template>
  <!-- The one select a value is chosen from a list in (`docs/components.md`, "Choosing a value"): the
       library's select menu, its search held to one rule by the choices module. A list searches once
       it holds more than seven choices, and a list found over a road or taking free entry always;
       words typed that no choice shows are offered in free entry as a new value, handed to the screen
       as it is chosen. The field stands at the top of the opened list with the pack's words for a
       search, takes the focus unless a finger opened it, and matches what each choice shows, its hits
       marked where they stand. An empty list says whether nothing matched, nothing is there or the
       road refused, and the road's first answer is awaited under a skeleton line. The list opens
       against the control's leading edge, and against its trailing edge where the leading one leaves
       it no room. The control names what is chosen from every choice it knows, whatever the words
       typed leave in the list. The words typed stay while the list closes and are cleared as it opens
       again, so a closing list keeps what it showed. Everything else it is handed is the library's
       select menu's. -->
  <USelectMenu
    v-bind="$attrs"
    v-model:search-term="words"
    :model-value="props.modelValue"
    :multiple="props.multiple"
    :value-key="props.valueKey"
    :items="shown"
    :label-key="props.labelKey"
    :description-key="props.descriptionKey"
    :search-input="searchInput"
    :loading="busy"
    :content="content"
    :create-item="offered === null ? false : CREATE_ALWAYS"
    :reset-search-term-on-blur="false"
    :reset-search-term-on-select="props.multiple"
    ignore-filter
    @create="takeOffered"
    @update:open="clearOnOpen"
    @update:model-value="keepChosen"
  >
    <template v-for="name in passedSlots" #[name]="scope" :key="name">
      <slot :name="name" v-bind="scope ?? {}" />
    </template>

    <template v-if="!slots.default" #default="{ modelValue: value, ui }">
      <template v-for="name in [chosenName(value)]" :key="name">
        <span v-if="name !== undefined" data-slot="value" :class="ui.value({ class: ownUi?.value })">{{ name }}</span>
        <span v-else data-slot="placeholder" :class="ui.placeholder({ class: ownUi?.placeholder })">{{ attrs.placeholder ?? "\u00A0" }}</span>
      </template>
    </template>

    <template #item-label="{ item }">
      <SearchText :text="shownWords(item).label" :query="words" />
    </template>

    <template v-if="described" #item-description="{ item }">
      <SearchText :text="shownWords(item).description" :query="words" />
    </template>

    <template #create-item-label>
      {{ t("common.action.add_choice", { value: offered }) }}
    </template>

    <template #empty>
      <ContentSkeleton v-if="awaited">
        <SkeletonLine width="w-1/2" class="mx-auto" />
      </ContentSkeleton>
      <template v-else>
        {{ emptyWords }}
      </template>
    </template>
  </USelectMenu>
</template>

<script setup lang="ts">
import { compare, get, getDisplayValue } from "@nuxt/ui/utils";
import { useI18n } from "vue-i18n";

import { CHOICE_FIND_PAUSE_MS, choiceFields, narrowChoices, searchesChoices, typedValue } from "../domain/choices";
import { countLocale } from "../domain/numbers";
import { TOUCH_QUERY } from "../domain/prompt";
import { useNarrow } from "../domain/screen";

import type { SelectMenuItem, SelectMenuProps } from "@nuxt/ui";
import type { ChoiceFind, ChoiceItems } from "../domain/choices";

// The library's virtual scrolling opens a list's groups out into one, and the select keeps its groups,
// so it is not taken.
interface Props extends /* @vue-ignore */ Omit<SelectMenuProps, "items" | "virtualize" | "modelValue" | "multiple" | "valueKey" | "searchInput" | "searchTerm" | "resetSearchTermOnBlur" | "resetSearchTermOnSelect" | "ignoreFilter" | "filterFields" | "labelKey" | "descriptionKey" | "createItem"> {
  // The value chosen, or the values where several are.
  modelValue?: unknown;
  multiple?: boolean;
  // The field of a choice holding its value; the choice itself where unset.
  valueKey?: string;
  // The choices: one list, or groups of lists. With a road, those the list shows before anything is
  // typed, the ones already chosen among them.
  items: ChoiceItems;
  // The road that finds choices on the server for the words typed; the list searches always with one.
  find?: ChoiceFind;
  // The screen's own word for its list when it holds nothing, where the wording guide gives one.
  empty?: string;
  // The fields of a choice holding its label and the line under it.
  labelKey?: string;
  descriptionKey?: string;
  // How long typing stands still before the road is asked.
  findPauseMs?: number;
  // Free entry: words typed that no choice shows are offered as a new value.
  createItem?: boolean;
}

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  multiple: false,
  valueKey: undefined,
  find: undefined,
  empty: undefined,
  labelKey: "label",
  descriptionKey: "description",
  findPauseMs: CHOICE_FIND_PAUSE_MS,
  createItem: false
});

// The new value free entry offered, chosen; the screen adds it and chooses it.
const emit = defineEmits<{ create: [value: string] }>();

// The library is asked for its new value only where the select offers one, so the select decides
// which words are new. It draws the new value nowhere unless told where, so the select names the
// list's end.
const CREATE_ALWAYS = { when: "always", position: "bottom" } as const;

const slots = useSlots();
const { t } = useI18n();
const appConfig = useAppConfig();
const touch = useNarrow(TOUCH_QUERY);

// The slots the select draws itself; every other slot of the library's select menu is the caller's.
const OWN_SLOTS = new Set(["item-label", "item-description", "empty", "create-item-label"]);
const passedSlots = computed(() => Object.keys(slots).filter((name) => !OWN_SLOTS.has(name)));

const keys = computed(() => ({ label: props.labelKey, description: props.descriptionKey, value: props.valueKey }));

// The words typed into the search. The library would clear them as the list closes, and a list of one
// value as its choice is made, which swaps the closing list's choices for all of them while it is
// still on the screen; they are cleared as the list opens instead. A list of several values stays open
// as a choice is made, so the library clears them then.
const words = ref("");

function clearOnOpen(open: boolean): void {
  if (open) words.value = "";
}

// What the road answered for the last words asked, null while no answer stands for the words typed.
const found = shallowRef<SelectMenuItem[] | null>(null);
const finding = ref(false);
const refused = ref(false);

const typed = computed(() => words.value.trim() !== "");

const attrs = useAttrs();
// Busy while the road is asked, and wherever the screen says its own choices are on their way.
const busy = computed(() => finding.value || (attrs.loading !== undefined && attrs.loading !== false));

const searches = computed(() => searchesChoices(props.items, props.find !== undefined, props.createItem));

const searchInput = computed(() =>
  searches.value ? { placeholder: t("common.placeholder.search"), icon: appConfig.ui.icons.search, ...(touch.value ? { autofocus: false } : {}) } : false
);

const shown = computed((): ChoiceItems => {
  if (props.find === undefined) {
    return narrowChoices(props.items, words.value, keys.value, countLocale());
  }

  return typed.value ? (found.value ?? []) : props.items;
});

// The choices the select presents: those it is handed and the road's last answer.
const presented = computed(() => [...everyChoice(props.items), ...everyChoice(found.value ?? [])]);

// The choices standing chosen, as the select last knew them. A value chosen from one of the road's
// answers is kept here as it is chosen, before the words cleared on a choice of several take that
// answer away, so the control still names it once a later answer leaves it out.
const kept = shallowRef<SelectMenuItem[]>([]);

// Every choice the select knows: those it presents and those standing chosen.
const known = computed(() => [...presented.value, ...kept.value]);

// Whether any choice carries a line under its label; the library draws that line's place for every
// choice once its slot is filled, so it is filled only then.
const described = computed(() => known.value.some((item) => shownWords(item).description !== ""));

// The entries of a list, its groups opened out.
function everyChoice(items: ChoiceItems): SelectMenuItem[] {
  return (items as unknown[]).flatMap((entry) => (Array.isArray(entry) ? entry : [entry])) as SelectMenuItem[];
}

// The words free entry offers as a new value: none while the road is asked, since its answer may
// hold them.
const offered = computed(() => (props.createItem && !finding.value ? typedValue(shown.value, words.value, keys.value, countLocale()) : null));

function takeOffered(): void {
  if (offered.value !== null) emit("create", offered.value);
}

// The road is being asked; the list stands empty only where no earlier answer is left to show, so its
// place is kept by a skeleton line rather than by words.
const awaited = computed(() => finding.value);

// The list opens against the control's leading edge unless the screen says where. Where that edge
// leaves the list no room on the screen, the library tries the trailing edge before it slides the
// list along, which it otherwise does first.
const content = computed(() => ({ align: "start" as const, prioritizePosition: true, ...(attrs.content as object | undefined) }));

// The library names what is chosen from the list it shows, which the words typed may have narrowed
// past the chosen choice; the control names it from every choice the select knows instead, in the
// library's own value and placeholder parts, as the library would name it there.
type DisplayOptions = NonNullable<Parameters<typeof getDisplayValue>[2]>;

const ownUi = computed(() => attrs.ui as { value?: string; placeholder?: string } | undefined);

// The values a model value holds: each of several, or the one.
function chosenValues(value: unknown): unknown[] {
  return props.multiple && Array.isArray(value) ? value : [value];
}

// The choice among those given whose value is the one asked for, compared as the library compares them.
function choiceOf(among: SelectMenuItem[], value: unknown): SelectMenuItem | undefined {
  const by = attrs.by as DisplayOptions["by"];

  return among.find((item) => compare(typeof item === "object" && item !== null && props.valueKey ? get(item, props.valueKey) : item, value, by));
}

// Keeps the choices a value holds, found among every choice the select knows now; it is told of a
// choice made in the list, of a value the host sets and of the choices presented changing.
function keepChosen(value: unknown): void {
  const among = known.value;

  kept.value = chosenValues(value).flatMap((one) => choiceOf(among, one) ?? []);
}

watch([() => props.modelValue, presented], ([value]) => keepChosen(value), { immediate: true });

function chosenName(value: unknown): string | undefined {
  const options = { labelKey: props.labelKey, valueKey: props.valueKey, by: attrs.by as DisplayOptions["by"] };
  const names = chosenValues(value).map((one) => getDisplayValue(known.value, one, options) as unknown);
  const said = names.filter((name) => name !== undefined && name !== null && name !== "").map(String);

  if (props.multiple) return said.length > 0 ? said.join(", ") : undefined;

  return names[0] === undefined || names[0] === null ? undefined : String(names[0]);
}

const emptyWords = computed(() => {
  if (refused.value) return t("common.error.choices_find_failed");
  if (typed.value) return t("common.status.no_match");

  return props.empty ?? t("common.status.no_choices");
});

// A choice's label and the line under it, as the list shows them.
function shownWords(item: SelectMenuItem): { label: string; description: string } {
  const [label, description] = choiceFields(item, keys.value);

  return { label: label?.text ?? "", description: description?.text ?? "" };
}

// Only the answer to the last words asked may land: an answer to words already typed past is dropped.
let asked = 0;
let pause: ReturnType<typeof setTimeout> | undefined;

function stopPause(): void {
  clearTimeout(pause);
  pause = undefined;
}

async function ask(given: ChoiceFind, typedWords: string, ticket: number): Promise<void> {
  try {
    const answer = await given(typedWords);

    if (ticket === asked) found.value = answer;
  } catch {
    if (ticket === asked) {
      found.value = [];
      refused.value = true;
    }
  } finally {
    if (ticket === asked) finding.value = false;
  }
}

// Typing asks the road once it stands still; the last answer stays shown while the next is awaited.
watch(words, (now) => {
  stopPause();
  refused.value = false;
  asked += 1;

  const given = props.find;

  if (given === undefined || now.trim() === "") {
    found.value = null;
    finding.value = false;

    return;
  }

  const ticket = asked;

  finding.value = true;
  pause = setTimeout(() => void ask(given, now, ticket), props.findPauseMs);
});

onScopeDispose(stopPause);
</script>
