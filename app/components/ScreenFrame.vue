<!-- The frame of a screen that stands on no shell: pinned to what is visible, as the shell is, and
     clipping rather than scrolling, so every scroll on the screen is a part's own. Being pinned is
     what anchors whatever inside it is laid out absolutely — a word kept for a screen reader, a
     hidden native control — so none of it finds its place against the page itself and gives the
     page a scroll beside the parts'. What the screen is made of is the slot, in a column. -->
<template>
  <div class="fixed inset-x-0 flex flex-col overflow-hidden" :style="SCREEN_FRAME">
    <slot />
  </div>
</template>
<script setup lang="ts">
import { SCREEN_FRAME, useVisibleScreen } from "../domain/screen";

useVisibleScreen();
</script>
