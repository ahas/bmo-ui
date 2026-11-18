<!-- A box held to what it holds (`docs/components.md`, "A box that follows what it holds"). What it
     holds is laid out at its own widest and tallest from the first frame and measured, and the box is
     given that size: a change that comes at once moves the box to it, and a part that unfolds or
     folds of its own is followed frame by frame (`docs/design.md`, "Motion"). Whatever lies past the
     box's edge while it is smaller is hidden. Its ground is its classes', or one laid behind it. -->
<template>
  <div
    class="unfolding-box overflow-clip"
    :data-following="size?.following ? '' : undefined"
    :style="size === null ? undefined : { width: `${size.width}px`, height: `${size.height}px` }"
  >
    <div ref="content" class="w-max">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHeldSize } from "../domain/held-size";

const content = useTemplateRef<HTMLElement>("content");
const size = useHeldSize(content);
</script>

<style scoped>
/* A box changing size: at unfold, eased as a thing that stays on the screen. While a part of what it
   holds moves its own size, that movement is the box's too, and the box only follows it. */
.unfolding-box {
  transition:
    width var(--bmo-motion-unfold) var(--bmo-ease-move),
    height var(--bmo-motion-unfold) var(--bmo-ease-move);
}

.unfolding-box[data-following] {
  transition: none;
}
</style>
