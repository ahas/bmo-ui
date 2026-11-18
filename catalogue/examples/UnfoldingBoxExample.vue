<template>
  <UnfoldingBox class="rounded-full bg-elevated">
    <div class="flex items-center gap-2 px-3 py-1">
      <AvatarGroup :faces="faces" size="2xs" :ui="{ ground: 'bg-elevated' }" />
      <span class="text-sm">{{ words }}</span>
    </div>
  </UnfoldingBox>
</template>

<script setup lang="ts">
import { ref } from "vue";

import type { AvatarFace } from "../../app/domain/avatar-group";

const faces = ref<AvatarFace[]>([{ id: 11, avatar: { alt: "Ada Park" } }]);
const words = ref("Writing");
</script>
