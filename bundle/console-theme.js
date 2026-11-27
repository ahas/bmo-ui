import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import postcss from "postcss";
import valueParser from "postcss-value-parser";

// The theme a console bundle's stylesheet is read against (`docs/boundary.md`, "The bundle build";
// `docs/console-bundles.md`, "What a bundle is"). The bundle's stylesheet carries the utilities of its
// own screens alone, since the console's stylesheet carries the layer's; so it reads the layer's
// stylesheet for its theme, variants and utilities, by reference, with none of the sources that
// stylesheet scans. The plugin writes that stylesheet and the component library's beneath it into a
// folder of the build's own, each with its sources dropped and its addresses pointed at the copies or
// at the files beside the originals, and names the copy of the layer's by the import the bundle's
// stylesheet references. Stylesheets are read and written by PostCSS, an import's address by its
// value parser. Like the bundle plugin beside it, this is JavaScript a build loads from the installed
// package under Node.

// The import a bundle's stylesheet references the theme by.
const THEME_IMPORT = "#console-theme";

// The folder inside Nuxt's build folder the copies are written to.
const THEME_FOLDER = "console-theme";

// The layer's own stylesheet, beside this module in the package.
const LAYER_STYLESHEET = fileURLToPath(new URL("../app/assets/css/main.css", import.meta.url));

// The component library's stylesheet, as its package exports it.
const LIBRARY_STYLESHEET = "@nuxt/ui/runtime/index.css";

// The component library's theme Nuxt generates into its build folder, and the import the library's
// stylesheet names it by.
const GENERATED_THEME = "ui.css";
const GENERATED_THEME_IMPORT = "#build/ui.css";

/** The address an import's params open with: its quoted string, or what its `url()` holds. */
function importTarget(nodes) {
  const first = nodes.find((node) => node.type !== "space" && node.type !== "comment");

  if (first?.type === "string") return first;
  if (first?.type === "function" && first.value === "url") return first.nodes.find((node) => node.type !== "space");

  return undefined;
}

function isRelative(address) {
  return address.startsWith("./") || address.startsWith("../");
}

/** A path as the quoted address an import names it by. */
function quoted(path) {
  return JSON.stringify(path);
}

/** Each relative address a declaration's `url()` names, made the absolute path beside `folder`. */
function absoluteUrls(value, folder) {
  const parsed = valueParser(value);
  let changed = false;

  parsed.walk((node) => {
    if (node.type !== "function" || node.value !== "url") return;

    const address = node.nodes.find((one) => one.type !== "space");

    if (address !== undefined && isRelative(address.value)) {
      address.value = resolve(folder, address.value);
      changed = true;
    }
  });

  return changed ? valueParser.stringify(parsed.nodes) : value;
}

/**
 * The stylesheet at `file` with its `@source` rules dropped and its addresses rewritten: an import whose
 * address `imports` names takes that entry as its params, and every other relative address, of an import
 * or a `url()`, becomes the absolute path of the file it names, so what it names keeps resolving where it
 * stands.
 */
function themeStylesheet(file, imports = {}) {
  const root = postcss.parse(readFileSync(file, "utf8"), { from: file });

  root.walkAtRules("source", (rule) => {
    rule.remove();
  });
  root.walkDecls((declaration) => {
    declaration.value = absoluteUrls(declaration.value, dirname(file));
  });
  root.walkAtRules("import", (rule) => {
    const params = valueParser(rule.params);
    const target = importTarget(params.nodes);

    if (target === undefined) return;

    const named = Object.hasOwn(imports, target.value) ? imports[target.value] : undefined;

    if (named !== undefined) rule.params = named;
    else if (isRelative(target.value)) {
      target.value = resolve(dirname(file), target.value);
      rule.params = valueParser.stringify(params.nodes);
    }
  });

  return root.toString();
}

/** Writes the three copies into `folder` and answers the path of the layer's. */
function writeTheme(root, buildDir, folder) {
  const library = createRequire(join(root, "package.json")).resolve(LIBRARY_STYLESHEET);
  const generated = join(folder, GENERATED_THEME);
  const libraryCopy = join(folder, "nuxt-ui.css");
  const layerCopy = join(folder, "layer.css");

  mkdirSync(folder, { recursive: true });
  writeFileSync(generated, themeStylesheet(join(buildDir, GENERATED_THEME)));
  writeFileSync(libraryCopy, themeStylesheet(library, { [GENERATED_THEME_IMPORT]: quoted(generated) }));
  writeFileSync(
    layerCopy,
    themeStylesheet(LAYER_STYLESHEET, {
      tailwindcss: `${quoted("tailwindcss")} source(none)`,
      "@nuxt/ui": quoted(libraryCopy)
    })
  );

  return layerCopy;
}

/**
 * The plugin a console bundle's stylesheet reads the layer's theme through: the theme written into
 * Nuxt's build folder, `buildDir`, which defaults to `.nuxt` under the build's root, and named by the
 * import `#console-theme`.
 */
export function consoleTheme(options = {}) {
  const { buildDir } = options;

  if (buildDir !== undefined && typeof buildDir !== "string") {
    throw new TypeError("consoleTheme takes Nuxt's build folder as a path, where it is given");
  }

  return {
    name: "bmo-ui-console-theme",
    apply: "build",
    config(config) {
      const root = resolve(config.root ?? process.cwd());
      const nuxt = resolve(root, buildDir ?? ".nuxt");
      const layer = writeTheme(root, nuxt, join(nuxt, THEME_FOLDER));

      return { resolve: { alias: [{ find: new RegExp(`^${THEME_IMPORT}$`), replacement: layer }] } };
    }
  };
}
