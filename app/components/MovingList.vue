<!-- A list whose items come, go and change places while it is being read, each item keyed by its
     own lasting id and never by where it stands (`docs/design.md`, "Motion"). It moves by position
     alone, along the list's own axis: the items that stay slide to their new places rather than
     jumping, an item that comes unfolds from nothing where it lands, and one that goes folds to
     nothing where it stood, so the items around it close up as it does (the moving-list module).
     Nothing fades, and every item moves at once. How it fills is its own choice: read a page at a
     time, the items put at its end stand at once; an arrival of its own, they unfold too. -->
<template>
  <TransitionGroup :tag="tag" v-bind="filling === 'unfolds' ? UNFOLDING_LIST : MOVING_LIST">
    <slot />
  </TransitionGroup>
</template>

<script setup lang="ts">
import { MOVING_LIST, UNFOLDING_LIST } from "../domain/moving-list";

withDefaults(
  defineProps<{
    tag?: string;
    // How items put at its end with nothing standing after them come: standing at once, as a page
    // read in does, or unfolding, as a list whose every item is an arrival of its own.
    filling?: "stands" | "unfolds";
  }>(),
  { tag: "ul", filling: "stands" }
);
</script>
