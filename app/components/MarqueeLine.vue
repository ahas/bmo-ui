<template>
  <!-- One line of a row of names and figures (`docs/components.md`, "A line longer than its box").
       The words are one copy — the same text that is selected, copied and read out as the one
       sentence it is — and it is that copy that slides, so nothing is duplicated to make the
       movement. A line that fits carries no moving class and stands exactly as a clipped line
       stands. -->
  <p ref="boxRef" class="marquee">
    <span ref="lineRef" class="marquee-line" :class="{ 'marquee-line--moving': moving }" :style="vars">
      <slot />
    </span>
  </p>
</template>

<script setup lang="ts">
import { useMarquee } from "../domain/marquee";

const boxRef = useTemplateRef<HTMLElement>("boxRef");
const lineRef = useTemplateRef<HTMLElement>("lineRef");

const { moving, vars } = useMarquee(boxRef, lineRef);
</script>
