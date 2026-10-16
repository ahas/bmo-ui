<!-- The panel under a row of tabs that show one list in different ways (`docs/design.md`,
     "Motion"). The panel is the one keyed element in the slot, keyed by what it shows. When the tab
     changes, the new panel comes in from the side its tab stands on in the tab order while the old
     one leaves to the other side, both together; what is inside either moves with it and has no
     movement of its own. A panel replaced with the tab standing where it was — the same tab read
     for another place — is a different list and stands at once. -->
<template>
  <div class="relative overflow-hidden">
    <Transition :name="direction === null ? undefined : `bmo-slide-${direction}`" :css="direction !== null">
      <slot />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useSlideDirection } from "../domain/tab-slide";

// Where the tab now shown stands in the tab order.
const props = defineProps<{ at: number }>();

const direction = useSlideDirection(() => props.at);
</script>
