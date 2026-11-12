<template>
  <!-- The one layer over the whole page that names a button a host writes as markup
       (`docs/components.md`, "Tooltips"): a button carrying its name in `data-tooltip`, found under
       a pointer, a keyboard focus or a held finger and named in the shared tooltip over it. Its words
       follow the button's, so a name a press changes comes up over the button at once. -->
  <UTooltip
    v-model:open="shown"
    :text="words"
    :content="content"
    :reference="anchor ?? undefined"
    :disabled="anchor === null"
    disable-hoverable-content
    disable-closing-trigger
    :ui="PAGE_TIP_UI"
  />
</template>

<script setup lang="ts">
import { markupButtonAt, markupButtonIn, markupButtonWords } from "../domain/markup-buttons";
import { PAGE_TIP_UI, usePageTip } from "../domain/page-tip";

import type { PageTipBy } from "../domain/page-tip";

const { shown, words, content, anchor, show, close } = usePageTip({ at: markupButtonAt, within: markupButtonIn, words: markupButtonWords });

// The kind of pointer the last press came by.
let pointer = "";
// The button the last press pressed and what pressed it, until its name changes in answer or the
// next press lands.
let pressed: { button: HTMLElement; how: PageTipBy } | null = null;
let watcher: MutationObserver | null = null;

function onPointerDown(event: PointerEvent): void {
  pointer = event.pointerType;
  pressed = null;
}

// A click the keyboard made carries no count of presses; the one a lifting finger ends its hold in
// was refused already and pressed nothing.
function onClick(event: MouseEvent): void {
  const button = markupButtonAt(event.target);

  if (button === null || event.defaultPrevented) {
    pressed = null;
    return;
  }

  const how: PageTipBy = event.detail === 0 ? "focus" : pointer === "mouse" ? "pointer" : "finger";

  pressed = { button, how };
}

function onNamed(records: MutationRecord[]): void {
  for (const { target } of records) {
    if (!(target instanceof HTMLElement)) continue;

    if (pressed?.button === target) {
      // The press's answer, brought up as whatever pressed it would bring it up.
      show(target, pressed.how);
      pressed = null;
    } else if (shown.value && target === anchor.value) {
      // The name as it now reads; one taken away leaves nothing to show, and the tooltip goes.
      words.value = markupButtonWords(target);

      if (words.value === "") close();
    }
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
  document.addEventListener("click", onClick, { capture: true });
  watcher = new MutationObserver(onNamed);
  watcher.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ["data-tooltip"] });
});

onBeforeUnmount(() => {
  watcher?.disconnect();
  document.removeEventListener("pointerdown", onPointerDown, true);
  document.removeEventListener("click", onClick, true);
});
</script>
