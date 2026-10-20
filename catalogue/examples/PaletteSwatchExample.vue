<template>
  <div class="flex gap-3">
    <PaletteSwatch v-for="palette in PALETTES" :key="palette.id" :palette="palette" scheme="dark" />
  </div>
</template>

<script setup lang="ts">
import { PALETTES } from "../../shared/palettes";
</script>
