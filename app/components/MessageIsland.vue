<template>
  <!-- Into the page's own body, beside what the component library floats there. The app's root is
       an isolated stacking context, so an island drawn inside it stands under every dialog and
       drawer whatever number it is given, and a notice under a dialog is a notice unread.

       The same holds for assistive technology. A dialog or a drawer opening hides everything outside
       itself from it except what carries `aria-live` at that moment, and the pill exists only while
       a message stands, so the region it stands in carries the attribute itself — turned off, since
       the pill says for itself how it is to be announced. Without it a notice raised from inside a
       drawer is on the screen and pressable and never read out. It is marked as standing over every
       layer, so a press on it is outside none of them (the overlays module). -->
  <ClientOnly>
    <Teleport to="body">
      <div
        aria-live="off"
        data-over-layers
        class="pointer-events-none fixed inset-x-0 z-[100] flex justify-center px-4"
        :style="{ top: `calc(var(${SCREEN_TOP_PROPERTY}) + env(safe-area-inset-top, 0px) + 8px)` }"
      >
        <Transition name="bmo-island">
          <div
            v-if="message !== null"
            class="bmo-island pointer-events-auto flex items-start justify-center overflow-hidden bg-zinc-900 shadow-lg shadow-black/40 ring-1 ring-white/15 dark:bg-zinc-800"
            :style="size === null ? undefined : { width: `${size.width}px`, height: `${size.height}px` }"
            role="status"
            aria-live="polite"
          >
            <div
              ref="body"
              class="bmo-island-content w-max max-w-[calc(100vw-2rem)] shrink-0"
              :class="[wide ? 'min-w-[16rem]' : '', inline ? 'flex items-center' : '']"
            >
              <!-- A notice of one line keeps its keys on that line, centred on it; one that says more
                   lays them under its words. -->
              <button
                type="button"
                class="flex cursor-pointer items-start gap-3 p-4 text-start transition-colors hover:bg-white/10 active:bg-white/20 focus-inset"
                :class="inline ? 'min-w-0 flex-1' : 'w-full'"
                @click="press()"
              >
                <UIcon :name="message.icon" class="size-5 shrink-0" :class="MARK_TONES[message.tone]" />

                <span class="flex min-w-0 flex-col gap-2">
                  <span class="line-clamp-2 break-words text-sm font-medium text-white">{{ message.title }}</span>
                  <span v-if="message.description !== null" class="line-clamp-3 whitespace-pre-line break-words text-sm text-zinc-300">{{ message.description }}</span>
                </span>

                <!-- How many are still behind this one. It is the whole of what the reader needs to
                     know about a pile: that there is one, and how deep. -->
                <span
                  v-if="waiting > 0"
                  class="ms-2 shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-sm tabular-nums text-white"
                  :aria-label="$t('common.aria.more_notices', { n: countText(waiting) })"
                >+<RollingNumber :value="waiting" /></span>
              </button>

              <div v-if="message.actions.length > 0" class="flex shrink-0 items-center justify-end gap-2 whitespace-nowrap" :class="inline ? 'pe-3' : 'px-4 pb-4'">
                <UButton
                  v-for="action in message.actions"
                  :key="action.label"
                  :label="action.label"
                  size="sm"
                  :color="action.tone === 'error' ? 'error' : action.tone === 'primary' ? 'primary' : 'neutral'"
                  :variant="action.tone === 'error' || action.tone === 'primary' ? 'solid' : 'ghost'"
                  :ui="action.tone === 'error' || action.tone === 'primary' ? undefined : { base: 'text-white hover:bg-white/15 active:bg-white/25 pointer-coarse:min-h-11' }"
                  :class="action.tone === 'error' || action.tone === 'primary' ? 'badge-ink pointer-coarse:min-h-11' : ''"
                  @click="take(action)"
                />
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { useHeldSize } from "../domain/held-size";
import { islandState, settle, expands, type IslandAction, type IslandTone } from "../domain/island";
import { countText } from "../domain/numbers";
import { SCREEN_TOP_PROPERTY } from "../domain/screen";

// The one place for news, drawn (`docs/components.md`, "Messages"). What stands here is decided in
// the island module; this is the pill it stands as, and the two things a pill has to do that a
// list of messages cannot say on its own: morph between one size and the next rather than jumping,
// and count itself down.

// The colour each tone's mark carries. The island's surface is fixed dark in both themes, so the
// text and the marks on it are fixed with it rather than left to the theme's own colours.
const MARK_TONES: Record<IslandTone, string> = {
  info: "text-zinc-300",
  success: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400"
};

const state = islandState();
const message = computed(() => state.value.standing);
const waiting = computed(() => state.value.waiting.length);
const wide = computed(() => message.value !== null && expands(message.value));

// A notice that says one line and offers keys: its keys stand on that line rather than under it.
const inline = computed(() => message.value !== null && message.value.description === null && message.value.actions.length > 0);

const body = useTemplateRef<HTMLElement>("body");
// The size the pill is held to, taken off what it holds (the held-size module).
const size = useHeldSize(body);

function away(key: string): void {
  state.value = settle(state.value, key);
}

// Its time running out. A message with no time of its own stands until it is pressed, which is
// what the only chance to undo something does.
let timer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => (message.value === null ? null : { key: message.value.key, duration: message.value.duration }),
  (now) => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }

    if (now === null || now.duration === null) {
      return;
    }

    timer = setTimeout(() => away(now.key), now.duration);
  },
  { immediate: true }
);

onScopeDispose(() => {
  if (timer !== null) {
    clearTimeout(timer);
  }
});

// Pressing the words. Where the notice leads somewhere that is where it goes, and where it leads
// nowhere the press is how a reader is rid of it before its time is up.
async function press(): Promise<void> {
  const now = message.value;

  if (now === null) {
    return;
  }

  away(now.key);

  if (now.to !== null) {
    await navigateTo(now.to);
  }
}

// A press inside the island. A notice's own action leaves the island with it, since the thing it
// offered has been taken.
async function take(action: IslandAction): Promise<void> {
  const now = message.value;

  if (now !== null) {
    away(now.key);
  }

  await action.press();
}
</script>

<style scoped>
/* The pill's own shape and how it moves between two of them. The radius is one number at every
   size: at the height of one line it is a pill, and grown into a card it is the same rounding,
   which is what makes the widening read as one thing changing shape rather than two things. */
.bmo-island {
  border-radius: 26px;
  transition:
    width var(--bmo-motion-unfold) var(--bmo-ease-move),
    height var(--bmo-motion-unfold) var(--bmo-ease-move);
}

/* It comes out of no place in particular, so it does not grow out of one: it unfolds sideways from
   its own middle, from no width to its full width, and folds back the same way. The row it stands
   in centres it, so a width moving is the pill opening on its exact centre, and its height never
   moves. Only the words fade, while the pill opens around them; they are laid out at their full
   width from the first frame and centred in the pill, so a pill still narrower hides them past its
   edges rather than cutting them short, scrolling them or wrapping them again. The width outranks
   the size the pill is held to for as long as it is folded. */
@media (prefers-reduced-motion: no-preference) {
  .bmo-island-enter-active {
    transition: width var(--bmo-motion-unfold) var(--bmo-ease-enter);
  }

  .bmo-island-leave-active {
    transition: width var(--bmo-motion-unfold) var(--bmo-ease-exit);
  }

  .bmo-island-enter-from,
  .bmo-island-leave-to {
    width: 0 !important;
  }

  .bmo-island-enter-active .bmo-island-content {
    transition: opacity var(--bmo-motion-pop) var(--bmo-ease-enter) calc(var(--bmo-motion-unfold) - var(--bmo-motion-pop));
  }

  .bmo-island-leave-active .bmo-island-content {
    transition: opacity var(--bmo-motion-pop) var(--bmo-ease-exit);
  }

  .bmo-island-enter-from .bmo-island-content,
  .bmo-island-leave-to .bmo-island-content {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bmo-island {
    transition: none;
  }
}
</style>
