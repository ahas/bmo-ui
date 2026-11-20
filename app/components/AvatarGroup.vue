<!-- A row of faces (`docs/components.md`, "Avatar groups"): the library's avatars overlapping in one
     moving list along its row, the first standing over the one after it, so a face coming, going or
     changing place moves as a list item does. Each face's item is the box that folds: it draws the
     face's ring as its own padding and ground, and the face inside stands at its full size, laid
     out as a flex item rather than on a line of text, so the item is no taller than the face and
     its ring and the face keeps the row's vertical centre whatever line height it inherits. Past a
     most, one more avatar counts the rest, held in an unfolding box of its own. -->
<template>
  <MovingList :class="['isolate inline-flex items-center', frame.row]">
    <li
      v-for="(face, at) in shown"
      :key="face.id"
      :class="['relative flex shrink-0 rounded-full', frame.item, ground]"
      :style="{ zIndex: shown.length - at + 1 }"
      data-face
    >
      <UAvatar v-bind="face.avatar" :size="size" />
    </li>
    <li v-if="rest > 0" :key="CAP" :class="['relative z-0 shrink-0 rounded-full', frame.item, ground]" data-face-cap>
      <!-- Its count gaining or losing a place moves its width rather than jumping. -->
      <UnfoldingBox class="rounded-full">
        <UAvatar :text="`+${countText(rest)}`" :size="size" :class="['flex tabular-nums', frame.cap]" aria-hidden="true" />
      </UnfoldingBox>
      <span class="sr-only">{{ $t("common.aria.others_count", { n: countText(rest) }) }}</span>
    </li>
  </MovingList>
</template>

<script setup lang="ts">
import { FACE_FRAMES, facesShown } from "../domain/avatar-group";
import { countText } from "../domain/numbers";

import type { AvatarFace, FaceSize } from "../domain/avatar-group";

// The cap's key, which no face's id can take.
const CAP = Symbol("cap");

const props = withDefaults(
  defineProps<{
    faces: readonly AvatarFace[];
    // The most faces drawn; the rest are counted in the cap.
    max?: number;
    size?: FaceSize;
    // The ground each face's ring is drawn in: the page's ground, unless the row stands on one of
    // its own.
    ui?: { ground?: string };
  }>(),
  { max: undefined, size: "md", ui: undefined }
);

const frame = computed(() => FACE_FRAMES[props.size]);
const ground = computed(() => props.ui?.ground ?? "bg-default");
const split = computed(() => facesShown(props.faces, props.max));
const shown = computed(() => split.value.shown);
const rest = computed(() => split.value.rest);
</script>
