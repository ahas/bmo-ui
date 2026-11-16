import { describe, expect, test } from "bun:test";
import postcss from "postcss";
import { compile } from "tailwindcss";

// A coloured word reads its own token, and every other use of the colour reads the colour (`docs/design.md`,
// "Colour"). The layer's theme rules are read out of its stylesheet as it ships and compiled the way a host's
// build compiles them, over the library's own mapping of each colour onto its token; what each utility ended up
// drawing with is then read off the compiled rules.

(globalThis as { defineAppConfig?: unknown }).defineAppConfig = (config: unknown) => config;

const appConfig = "../app/app.config";
const { ui } = (await import(appConfig)).default as { ui: { colors: Record<string, string> } };

// Every semantic colour the library paints with: its own and the ones the layer names.
const semantic = [...new Set(["primary", "secondary", "success", "info", "warning", "error", ...Object.keys(ui.colors)])].filter((key) => key !== "neutral");

const stylesheet = await Bun.file(new URL("../app/assets/css/main.css", import.meta.url)).text();
const themeRules: string[] = [];

postcss.parse(stylesheet).walkAtRules("theme", (rule) => {
  themeRules.push(rule.toString());
});

// How the library maps each colour onto its token, as its generated theme states it.
const libraryTheme = `@theme default inline { ${semantic.map((key) => `--color-${key}: var(--ui-${key});`).join(" ")} }`;

const variants = ["", "hover:", "data-[state=active]:"];
const source = `@import "tailwindcss/theme" theme(reference);\n${libraryTheme}\n${themeRules.join("\n")}\n@tailwind utilities;`;

async function stylesheetLoader(id: string, base: string) {
  const path = Bun.resolveSync(id === "tailwindcss/theme" ? "tailwindcss/theme.css" : id, base);

  return { path, base, content: await Bun.file(path).text() };
}

// The values one utility draws with, compiled on its own so nothing else stands in its output.
async function valuesOf(candidate: string): Promise<string[]> {
  const compiler = await compile(source, { base: import.meta.dir, loadStylesheet: stylesheetLoader });
  const values: string[] = [];

  // A ring's colour stands in the property its shadow reads, so every declaration counts.
  postcss.parse(compiler.build([candidate])).walkDecls((declaration) => {
    values.push(declaration.value);
  });

  return values;
}

describe("a semantic colour's utilities", () => {
  for (const key of semantic) {
    test(`draw ${key}'s words in its word token, falling back to the colour, and everything else in the colour`, async () => {
      const word = `var(--bmo-ink-${key}, var(--ui-${key}))`;

      for (const variant of variants) {
        expect([`${variant}text-${key}`, await valuesOf(`${variant}text-${key}`)]).toEqual([`${variant}text-${key}`, [word]]);
      }

      const faded = await valuesOf(`text-${key}/75`);

      expect(faded.length > 0 && faded.every((value) => value.includes(word))).toBe(true);

      for (const fill of [`bg-${key}`, `bg-${key}/10`, `border-${key}`, `ring-${key}`]) {
        const values = await valuesOf(fill);

        expect([fill, values.length > 0]).toEqual([fill, true]);
        expect([fill, values.some((value) => value.includes("--bmo-ink-"))]).toEqual([fill, false]);
        expect([fill, values.some((value) => value.includes(`var(--ui-${key})`))]).toEqual([fill, true]);
      }
    });
  }
});
