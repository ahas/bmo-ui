<template>
  <!-- A sentence of the language pack with figures in it that change while it is read: the words
       are the sentence's own and stand still, and each figure is a RollingNumber in its place. -->
  <i18n-t :keypath="props.keypath" :tag="props.tag" scope="global">
    <template v-for="(word, name) in props.words" :key="name" #[name]>{{ word }}</template>
    <template v-for="(figure, name) in props.figures" :key="name" #[name]>
      <RollingNumber v-if="typeof figure === 'number'" :value="figure" />
      <RollingNumber v-else :value="figure.value" :text="figure.text" />
    </template>
  </i18n-t>
</template>

<script setup lang="ts">
interface Props {
  keypath: string;
  // Each placeholder of the sentence and the count standing in it, or a figure that reads otherwise
  // than a count — a span of time — with the value it turns by.
  figures: Record<string, number | { value: number; text: string }>;
  // The placeholders that stand still as words, such as a name.
  words?: Record<string, string>;
  tag?: string;
}

const props = withDefaults(defineProps<Props>(), { tag: "span", words: () => ({}) });
</script>
