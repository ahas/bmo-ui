<template>
  <RollingNumber :value="unread" :text="countText(unread)" />
</template>

<script setup lang="ts">
import { ref } from "vue";

import { countText } from "../../app/domain/numbers";

const unread = ref(1472);
</script>
