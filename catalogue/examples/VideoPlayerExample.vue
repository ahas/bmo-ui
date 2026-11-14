<template>
  <div class="flex flex-col gap-4">
    <div class="aspect-video w-full max-w-3xl">
      <VideoPlayer v-model:track="track" :video="12" src="https://example.com/videos/walk.mp4" title="walk.mp4" :tracks="tracks" next="harbour.mp4" @position="(video, seconds) => kept.set(video, seconds)" />
    </div>
    <div class="w-fit max-w-80 overflow-hidden rounded-lg bg-elevated">
      <VideoPlayer size="still" src="https://example.com/videos/harbour.mp4" title="harbour.mp4" :shape="{ width: 1280, height: 720 }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const track = ref<number | null>(null);
const kept = new Map<number | string, number>();
const tracks = [{ id: 1, src: "https://example.com/videos/walk.en.vtt", label: "English", language: "en" }];
</script>
