<template>
  <div class="grid w-full max-w-xl grid-cols-3 gap-4">
    <ArtworkFrame src="https://example.com/pictures/harbour.jpg" :size="{ width: 640, height: 360 }" :shape="LANDSCAPE" icon="i-material-symbols-movie-outline" name="Harbour" class="rounded-md" />
    <ArtworkFrame src="https://example.com/pictures/field.jpg" :size="{ width: 640, height: 480 }" :shape="LANDSCAPE" icon="i-material-symbols-movie-outline" name="Field" class="rounded-md" />
    <ArtworkFrame :src="null" :shape="LANDSCAPE" icon="i-material-symbols-movie-outline" name="Morning walk" class="rounded-md" />
  </div>
</template>

<script setup lang="ts">
import { LANDSCAPE } from "../../app/domain/artwork";
</script>
