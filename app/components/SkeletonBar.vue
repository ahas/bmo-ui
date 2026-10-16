<!-- One shimmering bar, which is the whole of what a skeleton is drawn out of. It says nothing to
     a reader who cannot see it — the region around it carries the busy status and the name — and
     it stands still for a reader who asked for less movement. Before the browser has taken the
     page over nothing has been asked for yet, so the bar keeps its place and draws nothing. All of
     that holds wherever a bar is drawn, so it is stated here and never at the place that draws
     one. Its size is the caller's: a bar is as tall as the line it stands for and as wide as that
     line ends up. -->
<template>
  <USkeleton aria-hidden="true" class="motion-reduce:animate-none" :class="{ invisible: !painted }" />
</template>
<script setup lang="ts">
import { usePainted } from "../domain/loading";

const painted = usePainted();
</script>
