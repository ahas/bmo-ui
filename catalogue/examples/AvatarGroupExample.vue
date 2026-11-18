<template>
  <AvatarGroup :faces="faces" :max="3" size="sm" />
</template>

<script setup lang="ts">
import { ref } from "vue";

import type { AvatarFace } from "../../app/domain/avatar-group";

const faces = ref<AvatarFace[]>([
  { id: 11, avatar: { alt: "Ada Park" } },
  { id: 12, avatar: { alt: "Ben Ito" } },
  { id: 13, avatar: { alt: "Cleo Ruiz" } },
  { id: 14, avatar: { alt: "Dan Moss" } }
]);
</script>
