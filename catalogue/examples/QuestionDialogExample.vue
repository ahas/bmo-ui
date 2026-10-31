<template>
  <QuestionDialog
    v-model:open="asking"
    :title="t('notes.title.overwrite_confirm')"
    item="plan.md"
    :confirm="t('notes.action.overwrite')"
    @close="answer"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

// A screen asks through the question module's `askQuestion`, which opens this dialog over everything
// standing and answers whether the reader went through; drawn by hand, it is closed by its answer.
const { t } = useI18n();
const asking = ref(true);

function answer(taken: boolean): void {
  asking.value = false;

  if (taken) console.info("overwriting plan.md");
}
</script>
