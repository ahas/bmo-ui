<template>
  <!-- The control every list that chooses more than one carries while it is choosing
       (`docs/design.md`, "Lists"): a checkbox standing at the three states of the choice — none of
       the rows shown, some of them, all of them — where some is the checkbox's own indeterminate. A
       press takes the choice to whichever end it is not at, and the name it carries is that end, so
       the tooltip and the accessible name say what pressing would do. What the states mean and what
       a press means are decided in one place for every list, so no list answers differently.

       The box itself is a checkbox's own size, which is smaller than a finger and smaller than the
       cells it stands among, so it sits in a cell as wide as a toolbar is tall: the whole cell is
       pressed, and the cell carries the hover and the press colors, the way every other cell of a
       toolbar does. A press that landed on the box is the box's own and is not counted twice.

       The cell's shape, and the box standing at its leading edge rather than in its middle, are the
       choosing module's: what they are for is that this box and the mark on each row stand on one
       vertical line, which is decided there once for every list rather than here. -->
  <UTooltip :text="label">
    <div
      class="hover:bg-elevated active:bg-elevated"
      :class="[CHOOSE_CELL, props.keys.length === 0 ? 'pointer-events-none' : '']"
      @click="aroundBox"
    >
      <UCheckbox
        :model-value="state"
        :disabled="props.keys.length === 0"
        :aria-label="label"
        @update:model-value="press"
      />
    </div>
  </UTooltip>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { CHOOSE_CELL, chooseAllLabel, chooseAllPress, chooseAllState } from "../domain/chooseall";

const props = defineProps<{
  // The rows the list is showing, which is what "all" means here.
  keys: readonly string[];
  selected: ReadonlySet<string>;
}>();

const emit = defineEmits<{
  // Whether the press asked for every row shown to be chosen, or for the choice to be given up.
  choose: [all: boolean];
}>();

const state = computed(() => chooseAllState(props.selected, props.keys));
const { t } = useI18n();
const label = computed(() => chooseAllLabel(t, state.value));

function press(): void {
  emit("choose", chooseAllPress(state.value));
}

// The cell around the box, which is the rest of what a finger aims at. The box handles its own
// press and the event goes on up through the cell, so only a press that missed the box is this
// one's.
function aroundBox(event: MouseEvent): void {
  if ((event.target as HTMLElement | null)?.closest("[role='checkbox']") !== null) return;

  press();
}
</script>
