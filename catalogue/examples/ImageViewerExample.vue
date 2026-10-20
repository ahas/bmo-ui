<template>
  <ImageViewer
    v-model:open="open"
    :src="pictures[at]!.src"
    :title="pictures[at]!.name"
    :can-previous="at > 0"
    :can-next="at < pictures.length - 1"
    @previous="at -= 1"
    @next="at += 1"
  >
    <template #actions>
      <UButton icon="i-material-symbols-download" color="neutral" variant="ghost" :aria-label="t('notes.action.download')" :href="pictures[at]!.src" download />
    </template>
  </ImageViewer>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const open = ref(true);
const at = ref(0);
const pictures = [
  { name: "sea.jpg", src: "https://example.com/pictures/sea.jpg" },
  { name: "hill.jpg", src: "https://example.com/pictures/hill.jpg" }
];
</script>
