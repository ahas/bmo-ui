<template>
  <!-- A small piece of a screen in one theme and one mode (`docs/components.md`, "Settings"): a
       primary and a neutral button, a badge and a switch, a field, and a note's name, muted line and
       link. The box states the theme's colours and the mode's class on itself, so everything inside
       reads them as the page reads its own, whatever theme and mode the page stands in. It is a
       picture of the colours: nothing in it is pressed. -->
  <div
    data-theme-preview
    :class="props.scheme"
    :style="tokens"
    class="flex flex-col gap-3 rounded-lg bg-default px-4 py-3 text-default ring ring-default"
    inert
  >
    <div class="flex flex-wrap items-center gap-2">
      <UButton :label="$t('common.action.save')" />
      <UButton color="neutral" variant="outline" :label="$t('common.action.cancel')" />
      <UBadge variant="subtle" :label="$t('common.message.preview_badge')" />
      <USwitch :model-value="true" :aria-label="$t('common.message.preview_badge')" />
    </div>

    <UInput icon="i-material-symbols-search" :placeholder="$t('common.message.preview_field')" class="w-full" />

    <div class="flex flex-col">
      <span class="text-sm text-highlighted">{{ $t("common.message.preview_note") }}</span>
      <span class="text-sm text-muted">{{ $t("common.message.preview_meta") }}</span>
      <span class="text-sm text-primary underline">{{ $t("common.message.preview_link") }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { themeTokens } from "../../shared/themes";
import { provideBoxScheme } from "../domain/scheme";

import type { Scheme, Theme } from "../../shared/themes";

interface Props {
  theme: Theme;
  scheme: Scheme;
}

const props = defineProps<Props>();

provideBoxScheme(toRef(() => props.scheme));

const tokens = computed(() => themeTokens(props.theme));
</script>
