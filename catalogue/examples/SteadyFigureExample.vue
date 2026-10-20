<template>
  <SteadyFigure widest="0:00:00">{{ timerClock(elapsed) }}</SteadyFigure>
</template>

<script setup lang="ts">
import { ref } from "vue";

import { timerClock } from "../../app/domain/time";

const elapsed = ref(754);
</script>
