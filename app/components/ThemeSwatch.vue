<template>
  <!-- A theme's two colours as dots, in one mode: the accent and the raised grey (`docs/components.md`,
       "Settings"). The dots read the theme's colours stated on their own box, as the page reads its
       own. -->
  <span :class="props.scheme" :style="tokens" class="flex shrink-0 items-center gap-1" aria-hidden="true">
    <span class="size-3 rounded-full bg-primary" />
    <span class="size-3 rounded-full bg-elevated ring ring-accented ring-inset" />
  </span>
</template>

<script setup lang="ts">
import { themeTokens } from "#shared/themes";

import type { Scheme, Theme } from "#shared/themes";

interface Props {
  theme: Theme;
  scheme: Scheme;
}

const props = defineProps<Props>();

const tokens = computed(() => themeTokens(props.theme));
</script>
