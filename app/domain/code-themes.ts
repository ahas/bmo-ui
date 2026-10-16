import type { editor } from "monaco-editor/editor/editor.api";

// The layer's own two themes for the code editor (the monaco module), which are Monaco's own two
// with the background taken out of them (`docs/components.md`, "Code and files"). A code view
// stands on a surface and inside a rounded border of the host's, drawn in whatever the screen mode
// says, and an editor painting its own background over that would be a grey slab inside the page
// rather than a part of it. The focus ring is taken out too: the editor draws it around the text
// input it keeps on the cursor's line, which reads as a box around that line, and the line the
// cursor is on is already marked by the editor's own current-line highlight.
//
// The colouring is the editor's, because a palette invented here would be one nobody has read code
// in, but every colour has to read at 4.5:1 on a fenced block's ground — the muted surface, the
// theme's grey at its 50 in the light mode and at its 800 in the dark — under every theme; a host's
// surface lighter than that in the light mode or darker in the dark only betters them. Each of the
// editor's colours that falls short there is moved in lightness alone, keeping its hue and chroma,
// to the first step that reads at 4.6:1. A comment is set in italics besides, since both themes
// give comments and numbers two greens. What the tokenizer cannot place — a Korean name in Rust —
// is drawn in the theme's text colour, which a fenced block leaves to the page's own, rather than
// in the error red, which would read as a mistake in code that has none. A diff's added and removed
// lines take a green and a red of their own.

export const CODE_THEMES: Record<"light" | "dark", { name: string; theme: editor.IStandaloneThemeData }> = {
  light: {
    name: "bmo-code-light",
    theme: {
      base: "vs",
      inherit: true,
      rules: [
        { token: "invalid", foreground: "000000" },
        { token: "comment", fontStyle: "italic" },
        { token: "number", foreground: "008154" },
        { token: "annotation", foreground: "717171" },
        { token: "tag.id.pug", foreground: "4c73a9" },
        { token: "tag.class.pug", foreground: "4c73a9" },
        { token: "metatag.content.html", foreground: "e60000" },
        { token: "metatag.html", foreground: "717171" },
        { token: "metatag.xml", foreground: "717171" },
        { token: "attribute.name", foreground: "e60000" },
        { token: "attribute.value.number", foreground: "008154" },
        { token: "attribute.value.unit", foreground: "008154" },
        { token: "string.sql", foreground: "e60000" },
        { token: "operator.sql", foreground: "637384" },
        { token: "inserted.diff", foreground: "116329" },
        { token: "deleted.diff", foreground: "b31d28" }
      ],
      colors: { "editor.background": "#00000000", focusBorder: "#00000000" }
    }
  },
  dark: {
    name: "bmo-code-dark",
    theme: {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "invalid", foreground: "d4d4d4" },
        { token: "comment", foreground: "709c5e", fontStyle: "italic" },
        { token: "variable.predefined", foreground: "6f8ed8" },
        { token: "regexp", foreground: "c676a6" },
        { token: "annotation", foreground: "d87170" },
        { token: "metatag", foreground: "e06d72" },
        { token: "delimiter.html", foreground: "8f8f8f" },
        { token: "delimiter.xml", foreground: "8f8f8f" },
        { token: "tag.id.pug", foreground: "6991c9" },
        { token: "tag.class.pug", foreground: "6991c9" },
        { token: "string.sql", foreground: "ff513f" },
        { token: "operator.sql", foreground: "8091a2" },
        { token: "inserted.diff", foreground: "7ee787" },
        { token: "deleted.diff", foreground: "ff7b72" }
      ],
      colors: { "editor.background": "#00000000", focusBorder: "#00000000" }
    }
  }
};
