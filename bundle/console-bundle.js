import { existsSync, readFileSync } from "node:fs";
import { extname, isAbsolute, relative } from "node:path";

import { babelParse, compileTemplate, parse } from "vue/compiler-sfc";

import layer from "../shared/layer.json" with { type: "json" };

// The bundle build (`docs/boundary.md`, "The bundle build"; `docs/console-bundles.md`, "The layer a
// bundle is built on" and "How a bundle mounts", the words). A service's build configuration loads
// this module from the installed package under Node, which strips no TypeScript from a file under
// `node_modules`, so it is written in JavaScript and its types stand in the declaration file beside
// it. Code is read by what already reads it: a component by Vue's compiler, its template compiled to
// the render function it ships as, and every script by the parser that compiler uses.

// The file beside the module that names the layer the bundle was built on.
const LAYER_FILE = "layer.json";

// The shared module that lists every key the layer reads. It is TypeScript, so it is read by the
// parser rather than imported.
const KEY_LIST = new URL("../shared/wording-keys.ts", import.meta.url);
const KEY_LIST_NAME = "WORDING_KEYS";

// A bundle's name, as the manifest writes it.
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// A string shaped as a key of somebody's domain in the layer's own form, `<domain>.<role>.<key>`
// (`docs/wording.md`, "The key").
const ROLES = "(title|label|action|placeholder|aria|status|message|error)";
const KEY_SHAPED = new RegExp(`^[a-z][a-z0-9_-]*\\.${ROLES}\\.[a-z0-9_]+$`);

// The screens' own code is what the build carries from the bundle's sources, never a package's.
const CODE_ENDINGS = new Set([".vue", ".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const PACKAGES = /[\\/]node_modules[\\/]/;

// The fields of a syntax tree's node that hold no code.
const NOT_CODE = new Set(["loc", "start", "end", "extra", "comments", "leadingComments", "trailingComments", "innerComments"]);

/** Whether an import names a library the bundle shares with its console, by its package's own path. */
function shared(id) {
  return layer.sharedLibraries.some((name) => id === name || id.startsWith(`${name}/`));
}

function program(code, plugins) {
  return babelParse(code, { sourceType: "module", plugins }).program;
}

// The parser's plugins for a script, by the language its file or block is written in.
function pluginsFor(language) {
  const typed = /^[mc]?tsx?$/.test(language);
  const marked = language.endsWith("x");

  return [...(typed ? ["typescript"] : []), ...(marked ? ["jsx"] : [])];
}

/** The keys the layer reads, as its shared module lists them. */
function layerKeys() {
  const declared = program(readFileSync(KEY_LIST, "utf8"), ["typescript"]).body.flatMap((statement) =>
    statement.type === "ExportNamedDeclaration" && statement.declaration?.type === "VariableDeclaration" ? statement.declaration.declarations : []
  );
  const list = declared.find((one) => one.id.type === "Identifier" && one.id.name === KEY_LIST_NAME)?.init;
  const array = list?.type === "TSAsExpression" ? list.expression : list;

  if (array?.type !== "ArrayExpression" || array.elements.some((one) => one?.type !== "StringLiteral")) {
    throw new Error(`${KEY_LIST.pathname} lists no ${KEY_LIST_NAME} as an array of strings`);
  }

  return new Set(array.elements.map((one) => one.value));
}

/** A file's code as the programs it ships as: a component's scripts and its compiled template. */
function programsOf(path, source) {
  const ending = extname(path);

  if (ending !== ".vue") return [program(source, pluginsFor(ending.slice(1)))];

  const { descriptor, errors } = parse(source, { filename: path });

  if (errors.length > 0) throw new Error(`${path}: ${errors.join("; ")}`);

  const scripts = [descriptor.script, descriptor.scriptSetup].filter((one) => one !== null);
  const language = scripts.find((one) => one.lang !== undefined)?.lang ?? "js";
  const programs = scripts.map((one) => program(one.content, pluginsFor(one.lang ?? "js")));

  if (descriptor.template !== null) {
    const typed = pluginsFor(language).includes("typescript");
    const compiled = compileTemplate({ source: descriptor.template.content, filename: path, id: path, compilerOptions: { isTS: typed } });

    if (compiled.errors.length > 0) throw new Error(`${path}: ${compiled.errors.join("; ")}`);

    programs.push(program(compiled.code, typed ? ["typescript"] : []));
  }

  return programs;
}

/** Every string a syntax tree writes whole: a literal, or a template literal with nothing put in. */
function* stringsOf(node) {
  if (Array.isArray(node)) {
    for (const one of node) yield* stringsOf(one);

    return;
  }

  if (node === null || typeof node !== "object") return;

  if (node.type === "StringLiteral") yield node.value;

  if (node.type === "TemplateLiteral" && node.expressions.length === 0) yield node.quasis[0].value.cooked;

  for (const [field, one] of Object.entries(node)) {
    if (!NOT_CODE.has(field)) yield* stringsOf(one);
  }
}

/** The tree a key names in one locale's words, or nothing where the words hold none there. */
function lookUp(tree, key) {
  return key.split(".").reduce((found, part) => (found !== null && typeof found === "object" && Object.hasOwn(found, part) ? found[part] : undefined), tree);
}

/** The bundle's name and words, refused where they do not keep the contract's shape. */
function checked(options) {
  const { name, words } = options ?? {};

  if (typeof name !== "string" || !KEBAB_CASE.test(name)) {
    throw new TypeError("consoleBundle takes the bundle's name, in kebab-case, as its manifest names it");
  }

  const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

  if (!plain(words) || !Object.values(words).every(plain)) {
    throw new TypeError("consoleBundle takes the bundle's words: each locale's tree, an object, under the locale's code");
  }

  return { name, words };
}

/**
 * What breaks the words a bundle's screens show: a key under the layer's domains the layer does not
 * read, a key under the bundle's namespace a locale's words do not answer, a key of another domain,
 * and a tree in the words beside the namespace.
 */
function wordFaults(name, words, files) {
  const keys = layerKeys();
  const layerDomains = new Set([...keys].map((key) => key.split(".")[0]));
  const faults = new Set();

  for (const [locale, tree] of Object.entries(words)) {
    for (const beside of Object.keys(tree).filter((one) => one !== name)) faults.add(`${beside}: a tree beside the namespace in the ${locale} words`);
  }

  for (const { path, source } of files) {
    for (const text of stringsOf(programsOf(path, source))) {
      const parts = text.split(".");

      if (parts.length < 2 || parts.some((part) => part === "") || /[\s/]/.test(text)) continue;

      const [domain] = parts;

      if (layerDomains.has(domain)) {
        if (!keys.has(text)) faults.add(`${text} in ${path}: not a key the layer reads`);
      } else if (domain === name) {
        for (const [locale, tree] of Object.entries(words)) {
          if (typeof lookUp(tree, text) !== "string") faults.add(`${text} in ${path}: not answered by the ${locale} words`);
        }
      } else if (KEY_SHAPED.test(text)) {
        faults.add(`${text} in ${path}: a key outside the bundle's namespace and the layer's`);
      }
    }
  }

  return [...faults];
}

/**
 * The plugin a console bundle is built with: the shared libraries left unbundled, the layer written,
 * and the words its screens ask for held to its own words and the layer's keys.
 */
export function consoleBundle(options) {
  const { name, words } = checked(options);
  let root = process.cwd();

  return {
    name: "bmo-ui-console-bundle",
    apply: "build",
    // Ahead of every resolver, so no other plugin or external setting reaches a shared library first.
    enforce: "pre",
    configResolved(config) {
      root = config.root;
    },
    resolveId(source) {
      return shared(source) ? { id: source, external: true } : null;
    },
    buildEnd(error) {
      if (error !== undefined && error !== null) return;

      const paths = new Set(
        [...this.getModuleIds()]
          .map((id) => id.split("?")[0])
          .filter((path) => isAbsolute(path) && !PACKAGES.test(path) && CODE_ENDINGS.has(extname(path)) && !path.endsWith(".d.ts") && existsSync(path))
      );
      const files = [...paths].sort().map((path) => ({ path: relative(root, path), source: readFileSync(path, "utf8") }));
      const faults = wordFaults(name, words, files);

      if (faults.length > 0) {
        this.error(`The bundle's screens ask for words a console would show raw (docs/console-bundles.md, "How a bundle mounts"):\n${faults.map((one) => `  ${one}`).join("\n")}`);
      }
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: LAYER_FILE, source: `${JSON.stringify({ layer: layer.layer })}\n` });
    }
  };
}
