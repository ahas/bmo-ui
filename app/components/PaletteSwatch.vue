<template>
  <!-- A palette's two grounds as dots, in one mode: the reader's own and everyone else's
       (`docs/components.md`, "Settings"). The dots read the palette's colours stated on their own
       box, as the page reads its own. -->
  <span :class="props.scheme" :style="tokens" class="flex shrink-0 items-center gap-1" aria-hidden="true">
    <span class="size-3 rounded-full bg-(--bmo-palette-own) ring ring-accented ring-inset" />
    <span class="size-3 rounded-full bg-(--bmo-palette-other) ring ring-accented ring-inset" />
  </span>
</template>

<script setup lang="ts">
import { paletteTokens } from "../../shared/palettes";

import type { Palette } from "../../shared/palettes";
import type { Scheme } from "../../shared/themes";

interface Props {
  palette: Palette;
  scheme: Scheme;
}

const props = defineProps<Props>();

const tokens = computed(() => paletteTokens(props.palette));
</script>
