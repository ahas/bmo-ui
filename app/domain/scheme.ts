import { DEFAULT_SCHEME } from "../../shared/screen-mode";

import type { ComputedRef, InjectionKey, Ref, WritableComputedRef } from "vue";
import type { Scheme } from "../../shared/themes";

// The mode a part of the screen is drawn in. It is the page's own screen mode, except inside a box
// drawn in a mode of its own — a theme's preview — which hands its mode to everything under it, so
// what colours itself by mode rather than by the stylesheet, a code block or a diagram, is coloured
// in the box's mode (`docs/design.md`, "Both on the page").
const BOX_SCHEME: InjectionKey<Readonly<Ref<Scheme>>> = Symbol("box-scheme");

export function provideBoxScheme(scheme: Readonly<Ref<Scheme>>): void {
  provide(BOX_SCHEME, scheme);
}

// Whether the part calling it is drawn in the dark mode.
export function useDarkScheme(): ComputedRef<boolean> {
  const box = inject(BOX_SCHEME, null);
  const mode = useColorMode();

  return computed(() => (box?.value ?? mode.value) === "dark");
}

// The mode the page is read in, as a choice drawn for it — a swatch's dots — stands in it. The
// server does not know the reader's screen mode, which the browser settles, so it is the default
// mode until the page is in the browser and then the one it reads.
export function usePageScheme(): ComputedRef<Scheme> {
  const mode = useColorMode();
  const settled = ref(false);

  onMounted(() => {
    settled.value = true;
  });

  return computed(() => (settled.value ? (mode.value === "dark" ? "dark" : "light") : DEFAULT_SCHEME === "light" ? "light" : "dark"));
}

// The mode a preview is drawn in: the page's until it is switched on its own, and from then on the
// one it was switched to, whatever the page does.
export function usePreviewScheme(page: Readonly<Ref<Scheme>>): WritableComputedRef<Scheme> {
  const chosen = ref<Scheme | null>(null);

  return computed({
    get: () => chosen.value ?? page.value,
    set: (scheme) => {
      chosen.value = scheme;
    }
  });
}
