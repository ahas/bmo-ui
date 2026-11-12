<template>
  <!-- The control every list that chooses more than one carries while it is choosing
       (`docs/design.md`, "Lists"): a checkbox standing at the three states of the choice — none of
       the rows shown, some of them, all of them — where some is the checkbox's own indeterminate. A
       press takes the choice to whichever end it is not at, and the words beside the box name that
       end, so what it says is what pressing would do. What the states mean and what a press means are
       decided in one place for every list, so no list answers differently.

       The box is smaller than a finger, so the box, its words and the room round them are one
       pressable control: a press anywhere on it is one press, and the hover and press colours fill
       its own rounded shape, the way a small button's do, never the cell or the toolbar it stands in.
       A press on the box or on its words is the checkbox's own and is not counted twice.

       The shape is the checkbox's own root. The box is smaller than the control a press lands on, so
       the keyboard's ring goes round the whole shape, drawn inside its edge since a toolbar clips what
       stands past it, and the box draws none of its own.

       The control stands in a cell of words. Its shape reaches out before the box by the room it keeps
       inside, so the box stands where the cell's own room puts it, which is the same room a row gives
       its own mark, and the two stand on one vertical line. -->
  <div class="flex items-center">
    <div :class="props.keys.length === 0 ? 'pointer-events-none' : ''" @click="aroundBox">
      <UCheckbox
        :model-value="state"
        :disabled="props.keys.length === 0"
        :label="label"
        :ui="CONTROL_UI"
        @update:model-value="press"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { chooseAllLabel, chooseAllPress, chooseAllState } from "../domain/chooseall";

const props = defineProps<{
  // The rows the list is showing, which is what "all" means here.
  keys: readonly string[];
  selected: ReadonlySet<string>;
}>();

const emit = defineEmits<{
  // Whether the press asked for every row shown to be chosen, or for the choice to be given up.
  choose: [all: boolean];
}>();

// The pressable shape round the box and its words, which answers the pointer and the keyboard.
const CONTROL_UI = {
  root: "-ms-2 cursor-pointer items-center rounded-md px-2 py-1 transition-colors hover:bg-elevated active:bg-elevated has-focus-visible:outline-solid has-focus-visible:outline-offset-[calc(var(--bmo-focus-width)*-1)]",
  base: "focus-visible:outline-none",
  label: "whitespace-nowrap"
};

const state = computed(() => chooseAllState(props.selected, props.keys));
const { t } = useI18n();
const label = computed(() => chooseAllLabel(t, state.value));

function press(): void {
  emit("choose", chooseAllPress(state.value));
}

// The room round the box and its words, which is the rest of what a finger aims at. The box and its
// words handle their own press — a press on the words is handed to the box — and the event goes on
// up through the control, so only a press that missed both is this one's.
function aroundBox(event: MouseEvent): void {
  if ((event.target as HTMLElement | null)?.closest("[role='checkbox'], label") !== null) return;

  press();
}
</script>
