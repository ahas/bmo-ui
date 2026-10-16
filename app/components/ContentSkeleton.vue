<!-- The place a region keeps for content it is still fetching. What it draws is the caller's
     own: only the screen that draws the real piece knows what one looks like, so the piece comes
     in as the slot and this component holds what every skeleton has in common — the busy status
     under a name, a surface nothing can be pressed through, and the repetition of the piece
     inside the same container the real pieces stand in.
     Real text placed in the slot stays readable; the bars hide themselves.
     Before the browser has taken the page over, nothing has been asked for: the place is kept at
     its full size and says nothing, and the busy status stands only once the read has begun. -->
<template>
  <div :role="painted ? 'status' : undefined" :aria-busy="painted ? 'true' : undefined" class="pointer-events-none min-w-0" :aria-label="painted ? label ?? $t('common.status.loading') : undefined">
    <span v-if="painted" class="sr-only">{{ label ?? $t("common.status.loading") }}</span>
    <div class="min-w-0" :class="listClass">
      <template v-for="n in rows" :key="n"><slot :index="n - 1" /></template>
    </div>
  </div>
</template>
<script setup lang="ts">
import { usePainted } from "../domain/loading";

const painted = usePainted();

withDefaults(defineProps<{
  // How many pieces stand. It is what the region will actually hold, never more: a skeleton that
  // makes a region taller than its content leaves the screen to collapse when the content lands.
  rows?: number;
  // The class of the container the real pieces stand in, so the gap between the placeholders is
  // the gap between the real ones and nothing moves when they arrive.
  listClass?: string;
  label?: string;
}>(), { rows: 1, listClass: '' });
</script>
