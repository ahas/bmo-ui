<template>
  <!-- A choice of two or three, as one segmented control: the choices side by side in one group of
       buttons at a button's height, the chosen one marked by its background (`docs/components.md`,
       "Settings"). It is a group of radios to a screen reader, named by the setting it stands for,
       since its row's name is not its label. -->
  <UFieldGroup role="radiogroup" :aria-label="props.label">
    <UButton
      v-for="item in props.items"
      :key="item.value"
      role="radio"
      :aria-checked="model === item.value"
      :color="model === item.value ? 'primary' : 'neutral'"
      :variant="model === item.value ? 'soft' : 'outline'"
      :label="item.label"
      @click="model = item.value"
    />
  </UFieldGroup>
</template>

<script setup lang="ts">
interface Props {
  items: { label: string; value: string }[];
  label: string;
}

const props = defineProps<Props>();
const model = defineModel<string>({ required: true });
</script>
