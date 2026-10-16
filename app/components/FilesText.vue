<template>
  <!-- A text file in the layer's read-only code viewer, coloured in the language its name says.
       The editor is fetched only once a text file is first shown. -->
  <div class="relative min-h-0 flex-1">
    <div ref="box" class="absolute inset-0" />
    <p v-if="failed !== ''" class="absolute inset-0 flex items-center justify-center p-4 text-sm text-error" role="alert">{{ failed }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { failureText } from "../domain/errors";

import type { CodeView } from "../domain/monaco";

const props = defineProps<{ text: string; name: string }>();

const { t } = useI18n();
const colorMode = useColorMode();
const box = useTemplateRef<HTMLElement>("box");
const failed = ref("");
let view: CodeView | null = null;

watch(
  () => [props.text, props.name],
  () => view?.show(props.text, props.name, null)
);

// The screen mode's light and dark are the editor's own two, followed rather than read once.
watch(
  () => colorMode.value,
  (mode) => view?.paint(mode === "dark")
);

onMounted(async () => {
  try {
    const { openCodeView } = await import("../domain/monaco");

    // The view may have gone while the editor was on its way.
    if (box.value === null) {
      return;
    }

    view = openCodeView(box.value, colorMode.value === "dark");
    view.show(props.text, props.name, null);
  } catch (error) {
    failed.value = failureText(error, t("common.error.editor_failed"));
  }
});

onBeforeUnmount(() => {
  view?.close();
  view = null;
});
</script>
