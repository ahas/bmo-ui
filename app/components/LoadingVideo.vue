<template>
  <div class="relative w-full max-w-lg" :aria-busy="!ready && !failed">
    <video :key="src" :src="src" controls playsinline preload="metadata" class="aspect-video w-full rounded-lg border border-default object-contain" @loadedmetadata="ready = true" @error="failed = true" />
    <SkeletonStatus v-if="!ready && !failed" as="div" class="absolute inset-0 flex" :label="$t('common.status.video_loading')"><SkeletonBar class="size-full rounded-lg" /></SkeletonStatus>
    <p v-if="failed" role="alert" class="text-sm text-error">{{ $t("common.error.video_failed") }}</p>
  </div>
</template>
<script setup lang="ts">
const props = defineProps<{ src: string }>();
const ready = ref(false), failed = ref(false);
watch(() => props.src, () => { ready.value = false; failed.value = false; });
</script>
