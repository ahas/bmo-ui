<template>
  <!-- The one select a value is chosen from a list in (`docs/components.md`, "Choosing a value"): the
       library's select menu, its search held to one rule by the choices module. A list searches once
       it holds more than seven choices, and a list found over a road or taking free entry always;
       words typed that no choice shows are offered in free entry as a new value, handed to the screen
       as it is chosen, a list of one value then closing. A list of several values in free entry ends
       a value at the separators the screen names, as Enter does where no entry stands highlighted:
       the words before it are taken and the search cleared, a paste is cut at them, and the words left
       typed are taken as the list closes where the screen asks. A choice of nothing, keyed by the empty
       string, is listed and chosen as every choice is. The field stands at the top of the opened list
       with the pack's words for a search, takes the focus unless a finger opened it, and matches what
       each choice shows, its hits marked where they stand. An empty list says whether nothing matched,
       nothing is there or the road refused, and the road's first answer, or the first choices the
       screen says are on their way, is awaited under a skeleton line. The list opens against the
       control's leading edge, and against its trailing edge where the leading one leaves it no room.
       The control names what is chosen from every choice it knows, whatever the words typed leave in
       the list. The words typed stay while the list closes and are cleared as it opens again, so a
       closing list keeps what it showed. The list moves as the words change it once it stands open, a
       moving list drawn by the library's select menu as the layer's patch of it lets it be, and stands
       still as it opens. Everything else it is handed is the library's select menu's, its slots read
       as each drawing hands them, so a slot the screen fills only later is drawn once it is. -->
  <USelectMenu
    ref="menu"
    v-bind="$attrs"
    :search-term="words"
    :model-value="toList(props.modelValue)"
    :default-value="toList(attrs.defaultValue)"
    :multiple="props.multiple"
    :value-key="props.valueKey"
    :items="handed"
    :label-key="props.labelKey"
    :description-key="props.descriptionKey"
    :search-input="searchInput"
    :loading="busy"
    :content="content"
    :create-item="offered === null ? false : CREATE_ALWAYS"
    :list-transition="MOVES ? (moving ? MOVING_LIST : STANDING_LIST) : undefined"
    :reset-search-term-on-blur="false"
    :reset-search-term-on-select="props.multiple"
    ignore-filter
    @create="takeOffered"
    @update:search-term="takeWords"
    @update:open="followOpen"
    @update:model-value="takeChosen"
    @highlight="passHighlight"
  >
    <template v-for="name in passedSlots()" #[name]="scope" :key="name">
      <slot :name="name" v-bind="fromListScope(scope)" />
    </template>

    <template v-if="!slots.default" #default="{ modelValue: value, ui }">
      <template v-for="name in [chosenName(fromList(value))]" :key="name">
        <span v-if="name !== undefined" data-slot="value" :class="ui.value({ class: ownUi?.value })">{{ name }}</span>
        <span v-else data-slot="placeholder" :class="ui.placeholder({ class: ownUi?.placeholder })">{{ attrs.placeholder ?? "\u00A0" }}</span>
      </template>
    </template>

    <template #item-label="{ item }">
      <SearchText :text="shownWords(fromListChoice(item)).label" :query="words" />
    </template>

    <template v-if="described" #item-description="{ item }">
      <SearchText :text="shownWords(fromListChoice(item)).description" :query="words" />
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
import SelectMenu from "@nuxt/ui/components/SelectMenu.vue";
import { compare, get, getDisplayValue } from "@nuxt/ui/utils";
import { useI18n } from "vue-i18n";

import { CHOICE_FIND_PAUSE_MS, choiceFields, cutValues, endsValue, namedChoice, narrowChoices, narrowChoicesInPlace, searchesChoices, typedValue } from "../domain/choices";
import { MOVING_LIST, STANDING_LIST } from "../domain/moving-list";
import { countLocale } from "../domain/numbers";
import { TOUCH_QUERY } from "../domain/prompt";
import { useNarrow } from "../domain/screen";

import type { SelectMenuItem, SelectMenuProps } from "@nuxt/ui";
import type { ChoiceFind, ChoiceItems } from "../domain/choices";

// The library's virtual scrolling opens a list's groups out into one, and the select keeps its groups,
// so it is not taken.
interface Props extends /* @vue-ignore */ Omit<SelectMenuProps, "items" | "virtualize" | "modelValue" | "multiple" | "valueKey" | "searchInput" | "searchTerm" | "resetSearchTermOnBlur" | "resetSearchTermOnSelect" | "ignoreFilter" | "filterFields" | "labelKey" | "descriptionKey" | "createItem" | "listTransition"> {
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
  // The characters that end the words typed as a value, in free entry on a list of several values.
  separators?: string[];
  // Whether the words left typed are taken as a value as the list closes, where separators would be.
  takeOnClose?: boolean;
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
  createItem: false,
  separators: () => [],
  takeOnClose: false
});

// The new value free entry offered, chosen, which the screen adds and chooses; the value chosen; and the
// choice the pointer or the keyboard rests on. The last two are the library's select menu's own, handed
// on with a choice of nothing given back as the empty string. A value is of whatever kind the screen's
// choices hold, so the screen's own handler names its kind.
const emit = defineEmits<{ create: [value: string]; "update:modelValue": [value: any]; highlight: [highlighted: Highlighted | undefined] }>();

interface Highlighted {
  ref: HTMLElement;
  value: any;
}

// The library is asked for its new value only where the select offers one, so the select decides
// which words are new. It draws the new value nowhere unless told where, so the select names the
// list's end.
const CREATE_ALWAYS = { when: "always", position: "bottom" } as const;

// Whether the library's select menu takes a list transition, as the layer's patch of it lets it
// (`docs/boundary.md`, "What the host owes"). It then draws the list as a moving list, knowing each
// group by its place, so the words narrow each group in its place and an emptied group is the menu's
// to take away; without the patch the list changes at once and an emptied group is dropped here.
const MOVES = "listTransition" in ((SelectMenu as { props?: object }).props ?? {});
const narrow = MOVES ? narrowChoicesInPlace : narrowChoices;

const slots = useSlots();
const { t } = useI18n();
const appConfig = useAppConfig();
const touch = useNarrow(TOUCH_QUERY);

// The slots the select draws itself; every other slot of the library's select menu is the caller's,
// read as each drawing hands them: the names a caller fills are no reactive state, so a slot the
// caller fills only from a later drawing on is passed on from that drawing.
const OWN_SLOTS = new Set(["item-label", "item-description", "empty", "create-item-label"]);

function passedSlots(): string[] {
  return Object.keys(slots).filter((name) => !OWN_SLOTS.has(name));
}

const keys = computed(() => ({ label: props.labelKey, description: props.descriptionKey, value: props.valueKey }));

// The words typed into the search. The library would clear them as the list closes, and a list of one
// value as its choice is made, which swaps the closing list's choices for all of them while it is
// still on the screen; they are cleared as the list opens instead. A list of several values stays open
// as a choice is made, so the library clears them then.
const words = ref("");

// Whether the list moves as its choices change: only once the words change in the open list, typed
// or cleared by the library on a choice of several. As the list opens it stands, so the words cleared
// then and the list being placed on the screen move none of its choices.
const moving = ref(false);

function takeWords(now: string): void {
  moving.value = true;
  words.value = now;
}

function followOpen(open: boolean): void {
  if (open) {
    moving.value = false;
    words.value = "";
  } else if (takesOnClose.value) {
    takeValues([words.value]);
  }
}

// What the road answered for the last words asked, null while no answer stands for the words typed.
const found = shallowRef<SelectMenuItem[] | null>(null);
const finding = ref(false);
const refused = ref(false);

const typed = computed(() => words.value.trim() !== "");

const attrs = useAttrs();
// Whether the screen says its own choices are on their way.
const loadingOwn = computed(() => attrs.loading !== undefined && attrs.loading !== false);
// Busy while the road is asked, and wherever the screen says its own choices are on their way.
const busy = computed(() => finding.value || loadingOwn.value);
// Whether the screen's own choices have landed once: it never said they were on their way, or it no
// longer does. A list that landed holding none is content, and a later read of it keeps its words.
const landed = ref(!loadingOwn.value);

watch(loadingOwn, (loading) => {
  if (!loading) landed.value = true;
});

const searches = computed(() => searchesChoices(props.items, props.find !== undefined, props.createItem));

const searchInput = computed(() =>
  searches.value
    ? {
        placeholder: t("common.placeholder.search"),
        icon: appConfig.ui.icons.search,
        ...(touch.value ? { autofocus: false } : {}),
        ...(cuts.value ? { onKeydown: endOnKey, onPaste: cutPasted } : {})
      }
    : false
);

const shown = computed((): ChoiceItems => {
  if (props.find === undefined) {
    return narrow(props.items, words.value, keys.value, countLocale());
  }

  return typed.value ? (found.value ?? []) : props.items;
});

// The choices the select presents: those it is handed and the road's last answer.
const presented = computed(() => [...everyChoice(props.items), ...everyChoice(found.value ?? [])]);

// The choices standing chosen, as the select last knew them. A value chosen from one of the road's
// answers is kept here as it is chosen, before the words cleared on a choice of several take that
// answer away, so the control still names it once a later answer leaves it out.
const kept = shallowRef<SelectMenuItem[]>([]);

// The library's list takes no entry whose value is the empty string, which it reads as nothing chosen.
// Where a choice of nothing is presented, it is handed to the list under a key of its own and given
// back as the empty string, in the value and the highlight handed on and in every slot. The key is no
// text a reader can type, so no choice's own value is ever read as it.
const NOTHING = "\u0000";

function valueOf(item: unknown): unknown {
  return typeof item === "object" && item !== null && props.valueKey ? get(item, props.valueKey) : item;
}

const holdsNothing = computed(() => presented.value.some((item) => valueOf(item) === ""));

// The choice each entry handed to the list in a choice's place stands for.
const standsFor = new WeakMap<object, SelectMenuItem>();

// A record with the value at a path of its fields replaced, sharing nothing along the path with the
// record it was copied from.
function withValue(record: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  const [field, ...rest] = path as [string, ...string[]];

  return { ...record, [field]: rest.length === 0 ? value : withValue((record[field] ?? {}) as Record<string, unknown>, rest, value) };
}

function toListChoice(item: SelectMenuItem): SelectMenuItem {
  if (valueOf(item) !== "") return item;
  if (typeof item !== "object" || item === null) return NOTHING;

  const entry = withValue(item as Record<string, unknown>, props.valueKey!.split("."), NOTHING) as SelectMenuItem;

  standsFor.set(entry as object, item);

  return entry;
}

function fromListChoice(entry: unknown): SelectMenuItem {
  if (entry === NOTHING) return "";

  return (typeof entry === "object" && entry !== null ? (standsFor.get(entry) ?? entry) : entry) as SelectMenuItem;
}

// The choices as the list is handed them.
const handed = computed((): ChoiceItems => {
  if (!holdsNothing.value) return shown.value;

  return (shown.value as unknown[]).map((entry) => (Array.isArray(entry) ? entry.map(toListChoice) : toListChoice(entry as SelectMenuItem))) as ChoiceItems;
});

function toList(value: unknown): unknown {
  if (!holdsNothing.value) return value;
  if (props.multiple && Array.isArray(value)) return value.map((one: unknown) => (one === "" ? NOTHING : one));

  return value === "" ? NOTHING : value;
}

function fromList(value: unknown): unknown {
  if (props.multiple && Array.isArray(value)) return value.map((one: unknown) => (one === NOTHING ? "" : one));

  return value === NOTHING ? "" : value;
}

// What a slot of the library's is handed, its choice and its value as the screen knows them. The scope
// keeps the library's own type for that slot, so the screen's slot reads what the library's would.
function fromListScope<Scope extends object>(scope: Scope | undefined): Scope {
  if (scope === undefined) return {} as Scope;

  return {
    ...scope,
    ...("item" in scope ? { item: fromListChoice(scope.item) } : {}),
    ...("modelValue" in scope ? { modelValue: fromList(scope.modelValue) } : {})
  };
}

function takeChosen(value: unknown): void {
  const chosen = fromList(value);

  keepChosen(chosen);
  emit("update:modelValue", chosen);
}

function passHighlight(highlighted: Highlighted | undefined): void {
  emit("highlight", highlighted === undefined ? undefined : { ...highlighted, value: fromList(highlighted.value) });
}

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

// The library's select menu holds the list open once its new value is chosen, as it must for a list of
// several values. A list of one value closes as it does on any choice: through its control, as a press
// on the control closes an open list, so the menu hears its list close as it hears any closing.
const menu = useTemplateRef<{ triggerRef?: HTMLElement }>("menu");

function takeOffered(): void {
  if (offered.value === null) return;

  emit("create", offered.value);
  if (cuts.value) words.value = "";
  if (!props.multiple) menu.value?.triggerRef?.click();
}

// Whether the words typed end as a value at the screen's separators, and as the list closes: only in
// free entry on a list of several values, since a list of one value takes the value it closes on.
const cuts = computed(() => props.createItem && props.multiple && props.separators.length > 0);
const takesOnClose = computed(() => props.createItem && props.multiple && props.takeOnClose);

// Takes each of the words given as a value: the choice whose label or value it is, chosen where it
// is not yet, and otherwise a new value handed to the screen. The choices are chosen first and at
// once, so a screen that adds each new value to the values it holds adds it to them all.
function takeValues(given: string[]): void {
  const values = given.flatMap((one) => (one.trim() === "" ? [] : [one.trim()]));
  const chosen = chosenValues(props.modelValue).filter((one) => one !== undefined);
  const by = attrs.by as DisplayOptions["by"];
  const added: unknown[] = [];
  const created: string[] = [];

  for (const value of values) {
    const choice = namedChoice(known.value, value, keys.value, countLocale());

    if (choice === undefined) {
      if (!created.includes(value)) created.push(value);
    } else if (![...chosen, ...added].some((one) => compare(one, valueOf(choice), by))) {
      added.push(valueOf(choice));
    }
  }

  if (added.length > 0) {
    const next = [...chosen, ...added];

    keepChosen(next);
    emit("update:modelValue", next);
  }

  for (const value of created) emit("create", value);
}

// Whether the open list holding a field stands an entry highlighted, which Enter takes. The library
// hears a highlight as it moves onto an entry and never as the entry leaves the list, so the list
// itself is read, as the library reads it as Enter is pressed.
function holdsHighlight(field: EventTarget | null): boolean {
  return field instanceof HTMLElement && field.closest("[data-slot=content]")?.querySelector("[data-highlighted]") != null;
}

// A key in the search: a separator, never written, ends the words typed as a value, and so does Enter
// where no entry stands highlighted for it to take; a word an input method is still composing is
// left whole.
function endOnKey(event: KeyboardEvent): void {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;

  const separator = props.separators.includes(event.key);

  if (!separator && (event.key !== "Enter" || !typed.value || holdsHighlight(event.target))) return;

  event.preventDefault();
  takeValues([words.value]);
  words.value = "";
}

// A paste into the search: words that then hold a separator or a line break are cut there and each
// piece taken, the search cleared; any other paste is typed as it is.
function cutPasted(event: ClipboardEvent): void {
  const field = event.target;

  if (!(field instanceof HTMLInputElement)) return;

  const pasted = event.clipboardData?.getData("text") ?? "";
  const whole = `${field.value.slice(0, field.selectionStart ?? field.value.length)}${pasted}${field.value.slice(field.selectionEnd ?? field.value.length)}`;

  if (!endsValue(whole, props.separators)) return;

  event.preventDefault();
  takeValues(cutValues(whole, props.separators));
  words.value = "";
}

// The road is being asked, or the screen's first choices are on their way: the list stands empty only
// where no earlier answer is left to show and nothing has landed yet, so its place is kept by a
// skeleton line rather than by words. A road that refused says so whatever the screen still awaits.
const awaited = computed(() => finding.value || (loadingOwn.value && !landed.value && !refused.value));

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
