<template>
  <div class="flex min-w-0 flex-col">
    <MarqueeLine>{{ track.title }} · {{ track.album }}</MarqueeLine>
  </div>
</template>

<script setup lang="ts">
const track = { title: "A long walk by the sea at the end of the summer", album: "Morning sketches" };
</script>
