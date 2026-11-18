<template>
  <div class="flex flex-wrap gap-4">
    <ChoiceSelect v-model="size" :items="sizes" value-key="value" class="w-40" />
    <ChoiceSelect v-model="city" :items="cities" value-key="value" class="w-56" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

// Three sizes open with no search; twelve cities open with the search at the top of the list.
const sizes = [
  { label: "Small", value: "small" },
  { label: "Medium", value: "medium" },
  { label: "Large", value: "large" }
];

const cities = ["Amsterdam", "Berlin", "Cairo", "Dublin", "Lisbon", "Madrid", "Nairobi", "Oslo", "Paris", "Quito", "Rome", "Vienna"].map((label) => ({ label, value: label.toLowerCase() }));

const size = ref("medium");
const city = ref("lisbon");
</script>
