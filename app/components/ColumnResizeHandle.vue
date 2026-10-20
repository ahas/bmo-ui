<template>
  <!-- The right edge of a column's name: dragged by pointer, or moved with the arrow keys once it
       has focus. It stands in a header cell that is positioned, so it runs the cell's full height.
       A pointer over it or a press on it widens the line it draws; the keyboard's focus is shown by
       the shared ring, drawn inside the edge because the table's box clips what stands past it. -->
  <span
    role="separator"
    aria-orientation="vertical"
    tabindex="0"
    :aria-label="$t('common.aria.column_width', { name: props.label })"
    :aria-valuenow="props.width"
    class="focus-inset absolute inset-y-0 end-0 flex w-3 cursor-col-resize touch-none justify-center after:h-full after:w-px after:bg-(--ui-border) hover:after:w-0.5 hover:after:bg-primary active:after:bg-primary"
    @pointerdown.prevent.stop="emit('start', $event)"
    @click.stop
    @keydown.left.prevent.stop="emit('nudge', -RESIZE_STEP_PX)"
    @keydown.right.prevent.stop="emit('nudge', RESIZE_STEP_PX)"
  />
</template>

<script setup lang="ts">
import { RESIZE_STEP_PX } from "../domain/column-widths";

const props = defineProps<{ label: string; width?: number }>();

const emit = defineEmits<{ start: [event: PointerEvent]; nudge: [by: number] }>();
</script>
