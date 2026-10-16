<template>
  <!-- A number that changes while it is read (`docs/design.md`, "Motion"): only
       the characters that differ move. Each place, counted from the right so the ones stay over the
       ones, is a window one character wide and one line high; a character that changes leaves it one
       way and its successor comes in from the other, upward where the number grew and downward where
       it shrank. Its figures are tabular, so no width flutters as they turn. -->
  <span class="inline-flex tabular-nums">
    <span v-for="place in places" :key="place.at" class="relative inline-block overflow-hidden whitespace-pre">
      <Transition :name="direction" :appear="ready">
        <span :key="place.mark" class="inline-block">{{ place.mark }}</span>
      </Transition>
    </span>
  </span>
</template>

<script setup lang="ts">
import { countText, figurePlaces, turnOf } from "../domain/numbers";

interface Props {
  value: number;
  // The figure as it reads, where it reads otherwise than a count: a share, a span of time.
  text?: string;
}

const props = defineProps<Props>();

const text = computed<string>(() => props.text ?? countText(props.value));

const places = computed(() => figurePlaces(text.value));

// Which way the changed characters turn: the way the number went last.
const direction = ref<"rolling-up" | "rolling-down">("rolling-up");

watch(
  () => props.value,
  (now, before) => {
    direction.value = `rolling-${turnOf(now, before)}`;
  },
  { flush: "sync" }
);

// A place that comes once the number stands — a figure growing a digit — comes in turning too; the
// number as it is first drawn stands still.
const ready = ref(false);

onMounted(() => {
  ready.value = true;
});
</script>

<style scoped>
/* A character arriving comes in at the arrival easing and the one it replaces leaves at the leaving
   one, both at the length of a thing changing where it stands. The one leaving is taken out of the
   flow, so its successor holds the place from the first frame. */
.rolling-up-enter-active,
.rolling-down-enter-active {
  transition: transform var(--bmo-motion-quick) var(--bmo-ease-enter);
}

.rolling-up-leave-active,
.rolling-down-leave-active {
  position: absolute;
  inset-inline-start: 0;
  top: 0;
  transition: transform var(--bmo-motion-quick) var(--bmo-ease-exit);
}

.rolling-up-enter-from,
.rolling-down-leave-to {
  transform: translateY(100%);
}

.rolling-up-leave-to,
.rolling-down-enter-from {
  transform: translateY(-100%);
}
</style>
