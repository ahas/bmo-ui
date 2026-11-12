<template>
  <!-- A number box as wide as the values it takes, its unit after it, and its two step buttons laid
       out by the screen it is read on (`docs/components.md`, "Forms"): on a wide screen Nuxt UI's
       vertical field, an up arrow over a down arrow stacked at its trailing end, each half the
       box's height; on a narrow one its horizontal field, − at its leading end and + at its
       trailing end. On a touch screen the box is taller and the buttons wider, so each is a
       finger's 24px or more. Each step button names itself in a tooltip, as every icon button
       does. -->
  <span class="inline-flex max-w-full items-center gap-2" :style="{ '--number-digits': props.digits }">
    <UInputNumber
      v-bind="$attrs"
      :orientation="orientation"
      class="[--step-width:1.75rem] pointer-coarse:[--step-width:2.25rem]"
      :ui="LOOKS[orientation]"
    >
      <template #increment>
        <IconButton :key="icons.increment" v-bind="STEP" :label="$t('common.aria.increase')" :icon="icons.increment" />
      </template>

      <template #decrement>
        <IconButton :key="icons.decrement" v-bind="STEP" :label="$t('common.aria.decrease')" :icon="icons.decrement" />
      </template>
    </UInputNumber>

    <span v-if="props.unit" class="text-sm text-muted">{{ props.unit }}</span>
  </span>
</template>

<script setup lang="ts">
import { useNarrow } from "../domain/screen";

defineOptions({ inheritAttrs: false });

interface Props {
  // How many characters the widest value it takes stands in, which is how wide the box is.
  digits: number;
  // The unit the value is in, written after the box.
  unit?: string;
}

const props = withDefaults(defineProps<Props>(), { unit: "" });

const appConfig = useAppConfig();
const narrow = useNarrow();

const orientation = computed(() => (narrow.value ? "horizontal" : "vertical"));

// The icons Nuxt UI's own field takes for each orientation: arrows stacked, − and + apart. A button
// is made anew when its icon changes, since the icon library writes the drawing it was still loading
// for the old name under the new one, which would draw every such icon on the page wrong.
const icons = computed(() =>
  narrow.value
    ? { increment: appConfig.ui.icons.plus, decrement: appConfig.ui.icons.minus }
    : { increment: appConfig.ui.icons.chevronUp, decrement: appConfig.ui.icons.chevronDown }
);

// The box keeps its words clear of the buttons, and is the words' width, its own room and the
// buttons' wide. Each button stands 2px in from the box's edge so its corners follow the box's:
// stacked, the two each fill half the column's height; apart, each the box's whole height. The
// tooltip's box round each button fills its place, so the button's height has one to fill.
const LOOKS = {
  vertical: {
    root: "w-[calc(var(--number-digits)*1ch+var(--step-width)+1rem)]",
    base: "pe-[calc(var(--step-width)+0.25rem)] tabular-nums pointer-coarse:h-13",
    increment: "top-0.5 bottom-1/2 end-0.5 pe-0 scale-100 *:h-full",
    decrement: "top-1/2 bottom-0.5 end-0.5 pe-0 scale-100 *:h-full"
  },
  horizontal: {
    root: "w-[calc(var(--number-digits)*1ch+2*var(--step-width)+1rem)]",
    base: "ps-[calc(var(--step-width)+0.25rem)] pe-[calc(var(--step-width)+0.25rem)] tabular-nums pointer-coarse:h-13",
    increment: "inset-y-0.5 end-0.5 pe-0 *:h-full",
    decrement: "inset-y-0.5 start-0.5 ps-0 *:h-full"
  }
} as const;

const STEP = { color: "neutral", variant: "ghost", size: "xs", class: "h-full w-(--step-width) justify-center rounded-sm p-0" } as const;
</script>
