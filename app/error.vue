<template>
  <!-- The app's error page, in place of the framework's own in every host that brings none of its own
       (`docs/components.md`, "The error page"). The app's root is not drawn while it stands, so it stands the
       library's app of its own, with the tooltip setting every host's root is handed. -->
  <UApp :tooltip="TOOLTIP_PROVIDER" :toaster="null">
    <ErrorScreen :status="error.statusCode" :message="error.message" :stack="error.stack" />
  </UApp>
</template>

<script setup lang="ts">
import { TOOLTIP_PROVIDER } from "./domain/tooltip";

import type { NuxtError } from "#app";

defineProps<{ error: NuxtError }>();
</script>
