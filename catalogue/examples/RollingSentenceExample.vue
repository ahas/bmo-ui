<template>
  <RollingSentence keypath="notes.message.synced_of" :figures="{ done: synced, all: { value: total, text: countText(total) } }" :words="{ folder: 'notes' }" tag="p" />
</template>

<script setup lang="ts">
import { ref } from "vue";

import { countText } from "../../app/domain/numbers";

const synced = ref(12);
const total = ref(1472);
</script>
