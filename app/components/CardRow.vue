<template>
  <!-- A row of cards (`docs/components.md`, "Rows of cards"): a heading naming the row, the link that opens it
       whole where the host gives one, and one line of the host's cards that scrolls sideways — paged by the two
       buttons at the heading's trailing end on a pointer, swiped by a finger. The cards are the host's, each at
       the width it hands them. -->
  <section data-card-row :aria-labelledby="headingId" class="flex min-w-0 flex-col gap-2">
    <header class="flex h-9 min-w-0 items-center gap-2 px-4">
      <h2 :id="headingId" class="min-w-0 truncate text-xl font-semibold text-highlighted">{{ props.title }}</h2>
      <UButton v-if="props.all" data-card-row-all :to="props.all" color="neutral" variant="ghost" size="sm" trailing-icon="i-material-symbols-chevron-right" :label="$t('common.action.see_all')" class="shrink-0" />
      <span class="flex-1" />
      <div v-if="canBack || canForward" data-card-row-pages class="flex shrink-0 items-center gap-1 pointer-coarse:hidden">
        <IconButton icon="i-material-symbols-chevron-left" size="sm" :label="$t('common.action.page_back')" :class="canBack ? '' : 'invisible'" @click="page(-1)" />
        <IconButton icon="i-material-symbols-chevron-right" size="sm" :label="$t('common.action.page_forward')" :class="canForward ? '' : 'invisible'" @click="page(1)" />
      </div>
    </header>

    <UCarousel
      ref="carousel"
      :items="props.items"
      align="start"
      slides-to-scroll="auto"
      drag-free
      :aria-labelledby="headingId"
      :ui="{ root: 'px-4 focus-visible:outline-solid focus-inset', item: 'basis-auto' }"
    >
      <template #default="{ item, index }">
        <slot :item="item as T" :index="index" />
      </template>
    </UCarousel>
  </section>
</template>

<script setup lang="ts" generic="T extends CarouselItem">
import { onBeforeUnmount, ref, useId, useTemplateRef, watch } from "vue";

import type { CarouselItem } from "@nuxt/ui";

interface Props {
  /** The row's name, its heading and its region's name. */
  title: string;
  /** What the row shows, each drawn by the slot. */
  items: T[];
  /** Where the row opens whole, or nowhere. */
  all?: string | Record<string, unknown> | null;
}

const props = withDefaults(defineProps<Props>(), { all: null });

defineSlots<{ default(props: { item: T; index: number }): unknown }>();

// The carousel as the library exposes it: its engine, once it stands.
interface CarouselEngine {
  canScrollPrev: () => boolean;
  canScrollNext: () => boolean;
  scrollPrev: (jump?: boolean) => void;
  scrollNext: (jump?: boolean) => void;
  on: (event: "select" | "reInit" | "scroll", listener: () => void) => void;
  off: (event: "select" | "reInit" | "scroll", listener: () => void) => void;
}

const carousel = useTemplateRef<{ emblaApi: CarouselEngine | null }>("carousel");

const headingId = useId();
const canBack = ref(false);
const canForward = ref(false);

function read(): void {
  const engine = carousel.value?.emblaApi;

  canBack.value = engine?.canScrollPrev() ?? false;
  canForward.value = engine?.canScrollNext() ?? false;
}

// A page back or forward by what the row shows at once; a reader who asked for less movement sees it stand at once.
function page(by: -1 | 1): void {
  const engine = carousel.value?.emblaApi;
  const jump = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (by < 0) engine?.scrollPrev(jump);
  else engine?.scrollNext(jump);
}

let listening: CarouselEngine | null = null;

watch(
  () => carousel.value?.emblaApi ?? null,
  (engine) => {
    for (const event of ["select", "reInit", "scroll"] as const) listening?.off(event, read);

    listening = engine;

    for (const event of ["select", "reInit", "scroll"] as const) engine?.on(event, read);

    read();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  for (const event of ["select", "reInit", "scroll"] as const) listening?.off(event, read);
});
</script>
