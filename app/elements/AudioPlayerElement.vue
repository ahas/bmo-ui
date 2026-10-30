<template>
  <!-- The audio player standing as a custom element (`docs/components.md`, "The audio player as an
       element"): the layer's `AudioPlayer` inside a shadow root of its own, on a ground marked with the
       scheme it is drawn in. Its popover and its tooltips open inside that ground rather than on the
       page's body, so they take the same sheet and the same scheme. -->
  <div ref="ground" :class="dark ? 'dark' : 'light'" class="audio-element">
    <UApp v-if="ground !== null" :portal="ground">
      <AudioPlayer :src="props.src" :download="props.download || props.src" :name="props.name || nameOf(props.src)" :size="props.size || null" />
    </UApp>
  </div>
</template>

<script setup lang="ts">
import { useHost } from "vue";

import AudioPlayer from "../components/AudioPlayer.vue";
import { useNarrow } from "../domain/screen";

interface Props {
  // Where the sound is played from, and where it is taken to be saved; the address it plays from
  // where none is given.
  src: string;
  download?: string;
  // The file's name, which names the player; the last part of its address where none is given.
  name?: string;
  // The stored size, already said as the page says sizes; none where none is given.
  size?: string;
  // The scheme it is drawn in, `light` or `dark`; whatever the reader's system asks where none is given.
  scheme?: string;
}

const props = withDefaults(defineProps<Props>(), { download: "", name: "", size: "", scheme: "" });

const ground = useTemplateRef<HTMLElement>("ground");
const host = useHost();
const systemDark = useNarrow("(prefers-color-scheme: dark)");
const dark = computed<boolean>(() => (props.scheme === "dark" || props.scheme === "light" ? props.scheme === "dark" : systemDark.value));

// The last part of an address, its percent-encoding undone where it decodes.
function nameOf(address: string): string {
  const last = address.split(/[?#]/)[0]!.split("/").pop() ?? "";

  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

// One sound plays at a time across the page: a player that starts stops every other one standing as
// this element, as the players inside one screen stop each other.
function playAloneOnPage(event: Event): void {
  if (!(event.target instanceof HTMLMediaElement) || host === null) {
    return;
  }

  for (const other of document.querySelectorAll<HTMLElement & { pause?: () => void }>(host.localName)) {
    if (other !== host) {
      other.pause?.();
    }
  }
}

onMounted(() => ground.value?.addEventListener("play", playAloneOnPage, true));
onBeforeUnmount(() => ground.value?.removeEventListener("play", playAloneOnPage, true));
</script>
