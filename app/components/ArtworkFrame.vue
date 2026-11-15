<template>
  <!-- A card's picture at one of the artwork shapes (`docs/components.md`, "Artwork"): the picture whole inside the
       frame, over a ground made of itself where its shape is not the frame's, never cut or stretched; with no
       picture, the kind's mark over the name. What the host lays on the picture stands in the slot, over it. -->
  <span data-artwork :data-shape="props.shape.name" class="relative block w-full overflow-hidden bg-elevated" :class="props.shape.aspect">
    <template v-if="props.src">
      <img v-if="grounded" data-artwork-ground :src="props.src" alt="" aria-hidden="true" class="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-xl">
      <LoadingImage :src="props.src" :alt="props.alt" fill image-class="relative block size-full object-contain" @loaded="(natural) => (loaded = natural)" />
    </template>
    <span v-else data-artwork-placeholder class="flex size-full flex-col items-center justify-center gap-2 p-4 text-center text-muted">
      <UIcon :name="props.icon" class="size-8 shrink-0" aria-hidden="true" />
      <span class="line-clamp-3 text-sm text-default">{{ props.name }}</span>
    </span>
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { fillsShape } from "../domain/artwork";

import type { ArtworkShape, PictureSize } from "../domain/artwork";

interface Props {
  /** The picture's address, or none where the thing has no picture. */
  src: string | null;
  /** The shape the frame stands at. */
  shape: ArtworkShape;
  /** The picture's own size where the host knows it before the picture loads. */
  size?: PictureSize | null;
  /** The picture's alternative words; empty where the card names the thing beside it. */
  alt?: string;
  /** The mark of the thing's kind, drawn where it has no picture. */
  icon: string;
  /** The thing's name, set in the frame where it has no picture. */
  name: string;
}

const props = withDefaults(defineProps<Props>(), { size: null, alt: "" });

// The size the picture turned out to have, where the host did not know it.
const loaded = ref<PictureSize | null>(null);

watch(
  () => props.src,
  () => {
    loaded.value = null;
  }
);

// A ground of the picture itself stands round it only where its shape is not the frame's.
const grounded = computed(() => {
  const size = props.size ?? loaded.value;

  return size !== null && !fillsShape(size, props.shape);
});
</script>
