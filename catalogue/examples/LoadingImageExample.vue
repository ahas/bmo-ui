<template>
  <LoadingImage src="https://example.com/pictures/sea.jpg" :alt="t('notes.label.cover_picture')" :shape="shape" image-class="rounded-sm" @loaded="loaded" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const shape = ref<{ width: number; height: number } | null>(null);

function loaded(natural: { width: number; height: number }): void {
  shape.value = natural;
}
</script>
