import colors from "tailwindcss/colors";

// The themes (`docs/design.md`, "Themes"). A theme names the accent and the grey and nothing else:
// the accent the primary token is read from, and the grey every ground, surface, edge and letter of
// the page is read from. The palette's grounds are the palette's, so a theme added here is offered,
// drawn and checked with nothing else changed.

// The screen mode a colour is stated for.
export type Scheme = "light" | "dark";

// A colour the library's scale names, by its name there.
export type ScaleName = { [Name in keyof typeof colors]: (typeof colors)[Name] extends Record<number, string> ? Name : never }[keyof typeof colors];

export interface Theme {
  id: string;
  // Its name in the language pack.
  label: string;
  accent: ScaleName;
  neutral: ScaleName;
}

export const THEMES: readonly Theme[] = [
  { id: "teal", label: "common.label.theme_teal", accent: "teal", neutral: "zinc" },
  { id: "sea", label: "common.label.theme_sea", accent: "sky", neutral: "zinc" },
  { id: "forest", label: "common.label.theme_forest", accent: "emerald", neutral: "stone" },
  { id: "violet", label: "common.label.theme_violet", accent: "violet", neutral: "mauve" },
  { id: "sunset", label: "common.label.theme_sunset", accent: "orange", neutral: "stone" }
];

// What a reader who never chose reads, and what a page reads before any choice is known.
export const DEFAULT_THEME: Theme = THEMES[0]!;

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export function isThemeId(value: unknown): value is string {
  return THEMES.some((theme) => theme.id === value);
}

// The theme by its id, the default where the id names none.
export function themeOf(id: string | null | undefined): Theme {
  return THEMES.find((theme) => theme.id === id) ?? DEFAULT_THEME;
}

// The custom properties a theme is stated in: the library's scales for the primary and the neutral,
// which every token of either mode is read from.
export function themeTokens(theme: Theme): Record<string, string> {
  const scale = (key: string, name: ScaleName) => SHADES.map((shade) => [`--ui-color-${key}-${shade}`, (colors[name] as Record<number, string>)[shade]!] as const);

  return Object.fromEntries([...scale("primary", theme.accent), ...scale("neutral", theme.neutral)]);
}

// The same properties as declarations, for a stylesheet's rule.
export function themeDeclarations(theme: Theme): string {
  return declarations(themeTokens(theme));
}

// Custom properties as the declarations of a stylesheet's rule.
export function declarations(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}
