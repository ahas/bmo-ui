<template>
  <!-- A text a list shows, with what the search found in it marked where it stands, case folded in
       the host's locale (`docs/components.md`, "List search"). -->
  <span><template v-for="(part, index) in parts" :key="index"><mark v-if="part.hit" class="rounded-sm bg-warning/25 text-highlighted">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span>
</template>

<script setup lang="ts">
import { highlightParts } from "../../shared/search";
import { countLocale } from "../domain/numbers";

interface Props {
  text: string;
  query?: string | null;
}

const props = defineProps<Props>();

const parts = computed(() => highlightParts(props.text, props.query, countLocale()));
</script>
