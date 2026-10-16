import { declarations } from "./themes";

import type { Scheme } from "./themes";

// The palettes (`docs/design.md`, "Palettes"). A palette names two grounds and nothing else: the
// reader's own and everyone else's, in each screen mode. Every ink and surface drawn on a ground is
// the host's to compute from it and the theme's colours, so a palette added here is offered, drawn
// and checked with nothing else changed, and choosing one changes nothing but those grounds.

export interface Palette {
  // A palette that shares a theme's name shares its id and its hue (`docs/design.md`, "Palettes").
  id: string;
  // Its name in the language pack.
  label: string;
  // The reader's own ground in each mode.
  mine: Record<Scheme, string>;
  // Everyone else's ground in each mode.
  theirs: Record<Scheme, string>;
}

export const PALETTES: readonly Palette[] = [
  { id: "teal", label: "common.label.palette_teal", mine: { light: "#d8f3f3", dark: "#17504f" }, theirs: { light: "#f4f4f5", dark: "#27272a" } },
  { id: "sea", label: "common.label.palette_sea", mine: { light: "#dceafa", dark: "#1b3d5c" }, theirs: { light: "#f4f4f5", dark: "#27272a" } },
  { id: "forest", label: "common.label.palette_forest", mine: { light: "#dcf2e3", dark: "#1d4a33" }, theirs: { light: "#f5f5f4", dark: "#292524" } },
  { id: "violet", label: "common.label.palette_violet", mine: { light: "#ebe5fb", dark: "#3a2d63" }, theirs: { light: "#f3f1f3", dark: "#2a212c" } },
  { id: "sunset", label: "common.label.palette_sunset", mine: { light: "#fce5d8", dark: "#5a301f" }, theirs: { light: "#f5f5f4", dark: "#292524" } },
  { id: "lemon", label: "common.label.palette_lemon", mine: { light: "#fbf0b3", dark: "#4a4216" }, theirs: { light: "#f4f4f5", dark: "#27272a" } }
];

// What a reader who never chose reads, and what a page reads before any choice is known.
export const DEFAULT_PALETTE: Palette = PALETTES[0]!;

export function isPaletteId(value: unknown): value is string {
  return PALETTES.some((palette) => palette.id === value);
}

// The palette by its id, the default where the id names none.
export function paletteOf(id: string | null | undefined): Palette {
  return PALETTES.find((palette) => palette.id === id) ?? DEFAULT_PALETTE;
}

// The custom properties a palette is stated in: both grounds for each mode, which the stylesheet's
// mode blocks resolve to the mode's own pair, `--bmo-palette-own` and `--bmo-palette-other`.
export function paletteTokens(palette: Palette): Record<string, string> {
  return {
    "--bmo-palette-own-light": palette.mine.light,
    "--bmo-palette-own-dark": palette.mine.dark,
    "--bmo-palette-other-light": palette.theirs.light,
    "--bmo-palette-other-dark": palette.theirs.dark
  };
}

// The same properties as declarations, for a stylesheet's rule.
export function paletteDeclarations(palette: Palette): string {
  return declarations(paletteTokens(palette));
}
