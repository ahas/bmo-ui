<!-- A list whose items come, go and change places while it is being read, each item keyed by its
     own lasting id and never by where it stands (`docs/design.md`, "Motion"). It moves by position
     alone, along the list's own axis: the items that stay slide to their new places rather than
     jumping, an item that comes unfolds from nothing where it lands, and one that goes folds to
     nothing where it stood, so the items around it close up as it does (the moving-list module).
     Nothing fades, and every item moves at once. -->
<template>
  <TransitionGroup :tag="tag" name="bmo-list" @enter="unfoldItem" @after-enter="settleItem" @leave="foldItem">
    <slot />
  </TransitionGroup>
</template>

<script setup lang="ts">
import { foldItem, settleItem, unfoldItem } from "../domain/moving-list";

withDefaults(defineProps<{ tag?: string }>(), { tag: "ul" });
</script>
