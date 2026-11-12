<template>
  <!-- The one layer over the whole page that shows a cut line whole (`docs/components.md`,
       "Tooltips"). It finds the line itself, under a pointer, a keyboard focus or a held finger,
       and brings up the shared tooltip over it, so no screen writes anything for its cut lines. -->
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
import { cutLineAt, cutLineIn, lineWords } from "../domain/cut-lines";
import { PAGE_TIP_UI, usePageTip } from "../domain/page-tip";

const { shown, words, content, anchor } = usePageTip({ at: cutLineAt, within: cutLineIn, words: lineWords });
</script>
