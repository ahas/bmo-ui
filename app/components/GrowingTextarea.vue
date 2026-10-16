<template>
  <!-- The layer's one text box for a form's longer text: the component library's textarea, as tall
       as its text at every width and never scrolling inside, so the dialog's or the page's body is
       the one scroll (`docs/components.md`, "Forms"). Everything a place hands it — rows, size,
       label, a limit, keys — goes to the textarea as it stands.

       The library's own growth measures only as the text changes. A box whose width changes under
       it — a scrollbar coming up beside it, the window resized, the webfont landing — wraps its text
       onto more lines than it was measured for and grows a scroll of its own inside the page's. So
       the box is measured here, again on every change of its text or of its width. -->
  <UTextarea ref="box" v-model="text" class="[&>textarea]:resize-none [&>textarea]:overflow-y-hidden" />
</template>

<script setup lang="ts">
const text = defineModel<string>();

const box = useTemplateRef<{ textareaRef?: HTMLTextAreaElement }>("box");

// The box's height is its text's: measured from its rows, then as tall as what it holds. What holds
// it keeps its height while the box is measured, so the page never shrinks under the reader and the
// scroll around the box never moves.
function fit(): void {
  const area = box.value?.textareaRef;
  const holder = area?.parentElement;

  // A box not laid out — inside something hidden — has nothing to measure; it is measured once its
  // width comes up.
  if (area === undefined || holder == null || area.clientWidth === 0) return;

  holder.style.minHeight = `${holder.offsetHeight}px`;
  area.style.height = "auto";
  area.style.height = `${area.scrollHeight + area.offsetHeight - area.clientHeight}px`;
  holder.style.minHeight = "";
}

watch(text, () => fit(), { flush: "post" });

let watching: ResizeObserver | null = null;
let width = -1;

onMounted(() => {
  const area = box.value?.textareaRef;

  if (area === undefined) return;

  watching = new ResizeObserver(([entry]) => {
    const next = entry?.contentRect.width ?? 0;

    // The box's own growth reports here too; only a width it has not been measured at counts.
    if (next === width) return;
    width = next;
    fit();
  });
  watching.observe(area);
  document.fonts.addEventListener("loadingdone", fit);
  fit();
});

onBeforeUnmount(() => {
  watching?.disconnect();
  document.fonts.removeEventListener("loadingdone", fit);
});

// Where a place puts the cursor in the box.
defineExpose({ focus: (options?: FocusOptions) => box.value?.textareaRef?.focus(options) });
</script>
