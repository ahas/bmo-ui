// The screen mode (`docs/design.md`, "Themes"): what a reader asked to read in, beside the theme and
// apart from it, where "system" is whatever the reader's own system asks for.
export type DocumentScheme = "light" | "dark" | "system";

// A reader who never chose a mode reads dark.
export const DEFAULT_SCHEME: DocumentScheme = "dark";

// The cookie the screen mode is kept in, so a server rendering a page knows the mode it stands in.
export const SCHEME_COOKIE = "nuxt-color-mode";

export function isDocumentScheme(value: unknown): value is DocumentScheme {
  return value === "light" || value === "dark" || value === "system";
}
