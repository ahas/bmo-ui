<template>
  <!-- The toolbar that belongs to one thing — an editor, a document — and sits flush against it
       (`docs/components.md`, "Tab bar and toolbar"). It runs from edge to edge, its borders are the
       ones of the rows it touches, and its items are cells divided by lines rather than buttons
       with borders of their own. Each child is one cell; a cell given `ms-auto` and those after it
       stand at the right end. Its bottom line is painted inside its last pixel rather than as a
       border under it, so a cell is the toolbar's whole height; a cell with a background of its own
       draws the line again over it.

       A button in it is the library's small button at its own size, centred in the cell with room
       above and below it, so its hover and press fill its own rounded shape and never the cell. The
       small size is set here once, as the library's default for every button standing inside, so a
       toolbar written later is held to it without being told and a button that names a size of its
       own keeps it. Nothing here sizes, pads or squares a button.

       No button's word is ever folded into two lines; a row too wide for its container flows
       sideways instead. Flowing sideways clips what stands past the row's edge, so a button's focus
       ring is drawn inside its own edge, where the row cannot cut it.

       A cell is as wide as what it holds. A cell drawn by hand — words, a plain control — keeps the
       toolbar's room on either side. A cell holding only the library's buttons — a group of actions,
       the more button that folds them, a view switch — keeps none of it, only the small room its
       buttons stand from the row's top and bottom, at its ends and between them. A library button is
       told by the slot name the library marks it with, which it carries whether it is drawn as a
       button or as a link, so a button given a route is a button here too. A component of the
       library, which marks its root with a slot name, keeps the padding and gap it comes with. -->
  <div
    role="toolbar"
    :aria-label="props.label"
    class="flex h-9 shrink-0 items-stretch divide-x divide-default overflow-x-auto shadow-[inset_0_-1px_0_var(--ui-border)] text-sm [scrollbar-width:none] pointer-coarse:h-10 [&>*]:flex [&>*]:shrink-0 [&>*]:items-center [&>:not([data-slot]):not(:has(>:is(button,a)[data-slot=base]):not(:has(>:not(:is(button,a)[data-slot=base]))))]:gap-2 [&>:not([data-slot]):not(:has(>:is(button,a)[data-slot=base]):not(:has(>:not(:is(button,a)[data-slot=base]))))]:px-3 [&>:not([data-slot]):has(>:is(button,a)[data-slot=base]):not(:has(>:not(:is(button,a)[data-slot=base])))]:gap-1 [&>:not([data-slot]):has(>:is(button,a)[data-slot=base]):not(:has(>:not(:is(button,a)[data-slot=base])))]:px-1 [&_:is(button,a)]:whitespace-nowrap [&_:is(button,a)[data-slot=base]]:focus-inset"
  >
    <UTheme :props="SMALL">
      <slot />
    </UTheme>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ label: string }>();

// Every library button standing in the toolbar is the library's small one unless it names its own.
const SMALL = { button: { size: "sm" } } as const;
</script>
