<template>
  <!-- The toolbar that belongs to one thing — an editor, a document — and sits flush against it
       (`docs/components.md`, "Tab bar and toolbar"). It runs from edge to edge, its borders are the
       ones of the rows it touches, and its items are cells divided by lines rather than buttons
       with borders of their own. Each child is one cell; a cell given `ms-auto` and those after it
       stand at the right end. Its bottom line is painted inside its last pixel rather than as a
       border under it, so a cell is the toolbar's whole height; a cell with a background of its own
       draws the line again over it.

       An item button — one whose whole content is a mark — is a square as wide as the toolbar is
       tall, so the row reads as one band of equal cells rather than a line of small marks floating
       in it, and so a finger has the whole height to aim at. It is set here rather than on each
       button, so a toolbar written later is held to it without being told: a button is known by
       its content being a mark and nothing else, which is what tells it from a select, a switch or
       a button that carries a word.

       That square is a floor and not a cage, and no button's word is ever folded into two lines.
       A stylesheet reads a button's elements and cannot read its text, so a word written straight
       beside a mark looks from here exactly like a mark standing alone; a fixed width would catch
       such a button and break its word down the middle of the row. A floor holds the mark-only
       button to its exact square and lets anything wider push past it, and the toolbar answers a
       row too wide for its container the way it already does — by flowing sideways.

       A cell is as wide as what it holds. A cell drawn by hand — words, a plain button — keeps the
       toolbar's room on either side; a cell holding only buttons — a group of actions, the more
       button that folds them — keeps none, its buttons already being the row's squares; and a
       component of the library, which marks its root with a slot name, keeps the padding and gap it
       comes with. -->
  <div
    role="toolbar"
    :aria-label="props.label"
    class="flex h-9 shrink-0 items-stretch divide-x divide-default overflow-x-auto shadow-[inset_0_-1px_0_var(--ui-border)] text-sm [scrollbar-width:none] pointer-coarse:h-10 [&>*]:flex [&>*]:shrink-0 [&>*]:items-center [&>:not([data-slot]):not(:has(>button):not(:has(>:not(button))))]:gap-2 [&>:not([data-slot]):not(:has(>button):not(:has(>:not(button))))]:px-3 [&_button]:whitespace-nowrap [&_button:has(>.iconify:only-child)]:h-9 [&_button:has(>.iconify:only-child)]:min-w-9 [&_button:has(>.iconify:only-child)]:justify-center [&_button:has(>.iconify:only-child)]:p-0 pointer-coarse:[&_button:has(>.iconify:only-child)]:h-10 pointer-coarse:[&_button:has(>.iconify:only-child)]:min-w-10"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ label: string }>();
</script>
