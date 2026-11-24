<template>
  <UApp :tooltip="TOOLTIP_PROVIDER" :toaster="null">
    <ErrorScreen :status="error.statusCode" home="/notes" />
  </UApp>
</template>

<script setup lang="ts">
import { TOOLTIP_PROVIDER } from "../../app/domain/tooltip";

import type { NuxtError } from "#app";

defineProps<{ error: NuxtError }>();
</script>
