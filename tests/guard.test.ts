import { describe, expect, test } from "bun:test";
import { marked } from "marked";
import { babelParse, compileTemplate, parse } from "vue/compiler-sfc";

import { WORDING_KEYS } from "../shared/wording-keys";

import { expressionNodes } from "./app/sources";

import type { Tokens } from "marked";

// The rules every file of the layer keeps (`CLAUDE.md`, `docs/wording.md` "The guard" and
// `docs/boundary.md`), read off the files that ship. Each kind of file is read by what already reads
// it: the list of the repository's files by git, code by the parser Vue's compiler uses, a
// component's template by that compiler, and the boundary document by a markdown lexer.

const root = new URL("../", import.meta.url);

async function text(path: string): Promise<string> {
  return Bun.file(new URL(path, root)).text();
}

// Every file of the repository, as git lists it: those it tracks and those it would take, never one
// it ignores.
const listed = Bun.spawnSync(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root.pathname });

if (!listed.success) throw new Error(`git could not list the repository's files: ${listed.stderr.toString()}`);

const repositoryPaths = listed.stdout.toString().split("\0").filter(Boolean).sort();

// The repository's text files with what they say; a file that is not text, a font, says nothing.
const textFiles: { path: string; text: string }[] = [];

for (const path of repositoryPaths) {
  try {
    textFiles.push({ path, text: new TextDecoder("utf-8", { fatal: true }).decode(await Bun.file(new URL(path, root)).bytes()) });
  } catch {
    // Not text.
  }
}

// The lockfile is written by the package manager from the manifest, which is read below, and its
// integrity sums are long runs of random letters that may spell anything; a name read in them would
// be chance.
const LOCKFILE = "bun.lock";
const prose = textFiles.filter((one) => one.path !== LOCKFILE);

type Program = ReturnType<typeof babelParse>["program"];

interface CodeFile {
  path: string;
  programs: Program[];
}

function program(code: string): Program {
  return babelParse(code, { sourceType: "module", plugins: ["typescript"] }).program;
}

// A component is read as its scripts and its template compiled to the render function it ships as, so
// what its template says is read as code too.
function programsOf(path: string, source: string): Program[] {
  if (!path.endsWith(".vue")) return [program(source)];

  const { descriptor } = parse(source, { filename: path });
  const codes = [descriptor.script?.content, descriptor.scriptSetup?.content];

  if (descriptor.template !== null) {
    const compiled = compileTemplate({ source: descriptor.template.content, filename: path, id: path, compilerOptions: { isTS: true } });

    if (compiled.errors.length > 0) throw new Error(`${path}: ${compiled.errors.join("; ")}`);

    codes.push(compiled.code);
  }

  return codes.filter((one): one is string => one !== undefined).map(program);
}

// The layer's own code: everything a host takes when it extends the layer.
const layerCode: CodeFile[] = await Promise.all(
  repositoryPaths
    .filter((path) => path === "nuxt.config.ts" || /^(app|shared)\/.+\.(ts|vue)$/.test(path))
    .map(async (path) => ({ path, programs: programsOf(path, await text(path)) }))
);

const testCode: CodeFile[] = await Promise.all(
  repositoryPaths.filter((path) => /^tests\/.+\.ts$/.test(path)).map(async (path) => ({ path, programs: programsOf(path, await text(path)) }))
);

function* nodesOf(file: CodeFile): Generator<Record<string, unknown>> {
  for (const one of file.programs) yield* expressionNodes(one);
}

// What a module names to import: its imports, its re-exports, its dynamic imports and the modules a
// type is taken from in place.
function importsOf(file: CodeFile): string[] {
  return [...nodesOf(file)].flatMap((node) => {
    const from = node.source as { type: string; value: string } | null | undefined;

    if (/^(Import|ExportNamed|ExportAll)Declaration$/.test(node.type as string) && from?.type === "StringLiteral") return [from.value];

    if (node.type === "TSImportType") {
      const argument = node.argument as { type: string; value: string };

      return argument.type === "StringLiteral" ? [argument.value] : [];
    }

    if (node.type === "ImportExpression" || (node.type === "CallExpression" && (node.callee as { type: string }).type === "Import")) {
      const [first] = ((node.arguments as unknown[] | undefined) ?? [node.source]) as { type: string; value: string }[];

      return first?.type === "StringLiteral" ? [first.value] : [];
    }

    return [];
  });
}

const OTHER_REPOSITORY = /^(@bmo\/|bmo-)/;

describe("what the layer stands on", () => {
  test("is registry packages alone, none of them another repository's", async () => {
    const manifest = (await Bun.file(new URL("package.json", root)).json()) as Record<string, unknown>;
    const declared = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"].flatMap((field) =>
      Object.entries((manifest[field] ?? {}) as Record<string, string>)
    );

    expect(declared.length).toBeGreaterThan(0);
    // A package of another repository is named for it, or reached by a path, a workspace or git
    // rather than by a version the registry answers.
    expect(declared.filter(([name, version]) => OTHER_REPOSITORY.test(name) || /^(workspace|file|link|portal|git|github)[:+]|\//.test(version))).toEqual([]);
  });

  test("and no file imports one", () => {
    const imported = [...layerCode, ...testCode].flatMap((file) => importsOf(file).filter((one) => OTHER_REPOSITORY.test(one)).map((one) => `${file.path}: ${one}`));

    expect(imported).toEqual([]);
  });
});

// The aliases Nuxt binds to a project's own folders. In a host they name the host's folders, and the
// host's build and typecheck read the layer's files under them (`docs/boundary.md`, "How a host takes
// it").
const PROJECT_ALIAS = /^(~~?|@@?|#shared|#server)(\/|$)/;

describe("how the layer reaches its own files", () => {
  test("is by relative path, never through an alias a host binds to its own folders", () => {
    const aliased = layerCode
      .filter((file) => file.path !== "nuxt.config.ts")
      .flatMap((file) => importsOf(file).filter((one) => PROJECT_ALIAS.test(one)).map((one) => `${file.path}: ${one}`));

    expect(aliased).toEqual([]);
  });
});

// Hashes of the names the layer never holds: the agents that use it, the person it was written for,
// and the machines it was written on. They stand here as hashes so the guard does not hold the names
// it keeps out.
const FORBIDDEN_NAMES = new Set([
  "0fc8d10256be80aeb2670c0c0b7fa04ed32527765c4cc4a48e6287ae9b5636da",
  "02ee4e7f75c0ba2a0083da7eb3752990aeaf4d6df05c5057d494314d4109ef6e",
  "0ab3cad9838f06812c3f9a2cae3ec74e769dbeb81222e6b251943360aae06f46",
  "97ff1c43b5f53c1255cb910bd70bb0ca00ad88dd79cef10a29ced779251d7cac",
  "e3dedc654e0a197ada9cb291f3688aac226b2463e86c9fabf1abd0bd620005b7",
  "81d5bee880ddd42048c5bdae8f3148d5923aede286964e1ccb33f7dd5e6cb897",
  "004eb446d1d3055a7808bfb19f95977ac3fab12a06342adc78171d30fe82b949",
  "9a882899305053bb1b8b619e11902afc8721bf4312990121bd0b5bf26cea6ac5",
  "3dd7f94c2eb8a0e24d1976140d2622d2052fd5be0ecf9f8ea30e9d5a4f31e358",
  "0480a93d2e9b094b89e08e01976089ac18193af802c66b631cc8d2dc1bae8c88",
  "8721d664ef60096aa559e1aa6c72caf1facf5ce08b03aa6921ed9af5645d5466",
  "88450b082ec4df2fdccd3a626c6e489b31ef8cbf151bd543acf6e8890ffa1f49",
  "4a8456f10e37689778cef532ab6a73742a152d4481190ab31de5d6f3f32f329c",
  "2d8e452e1634cae42e17cc9ec974afed94029e20e98fde4444706e3efac1bf77"
]);

// The words of the layer's own namespace after its prefix; a prefixed word naming anything else names
// another repository.
const OWN_NAMESPACE = new Set(["code", "dialog", "ease", "focus", "inset", "island", "list", "motion", "palette", "safe", "screen", "slide", "touch", "ui"]);

function words(said: string): Set<string> {
  const found = new Set<string>();

  for (const [word] of said.toLowerCase().matchAll(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu)) {
    found.add(word);

    for (const part of word.split("-")) found.add(part);
  }

  return found;
}

function hashed(word: string): string {
  return new Bun.CryptoHasher("sha256").update(word).digest("hex");
}

// Where a file says something that matches, with the line it is on.
function lines(pattern: RegExp, files: { path: string; text: string }[]): string[] {
  return files.flatMap(({ path, text }) =>
    text
      .split("\n")
      .map((line, at) => ({ line, at }))
      .filter(({ line }) => pattern.test(line))
      .map(({ line, at }) => `${path}:${at + 1}: ${line.trim()}`)
  );
}

// A host a test may name is one reserved for examples; one standing in a font's licence is the
// publisher's, whose words are carried as they stand.
const RESERVED_HOST = /(^|\.)(example\.(com|net|org)|test|example|invalid)$/;
const LICENCE = /^app\/assets\/fonts\/LICENSE-[^/]+\.txt$/;

describe("what the layer says", () => {
  test("is read off every file of the repository", () => {
    expect(repositoryPaths).toContain("package.json");
    expect(textFiles.length).toBeGreaterThan(150);
  });

  test("holds no Hangul", () => {
    expect(lines(/\p{Script=Hangul}/u, textFiles)).toEqual([]);
  });

  test("names no agent, no person and no machine", () => {
    const named = prose.flatMap(({ path, text }) => [...words(text)].filter((word) => FORBIDDEN_NAMES.has(hashed(word))).map(() => path));

    expect(named).toEqual([]);
    // The prefix is the library's namespace; the word standing alone in a sentence is a name.
    expect(lines(/(?<![^\s"'`(])bmo(?=[\s.,;:!?"'`)]|$)/i, prose)).toEqual([]);
  });

  test("names no other repository under the layer's prefix", () => {
    const others = prose.flatMap(({ path, text }) =>
      [...words(text)].filter((word) => word.startsWith("bmo-") && !OWN_NAMESPACE.has(word.split("-")[1]!)).map((word) => `${path}: ${word}`)
    );

    expect(others).toEqual([]);
  });

  // A home folder written out names the person it belongs to; one written from the tilde names nobody.
  test("holds no home folder", () => {
    expect(lines(/\/(?:home|Users)\/[\w.-]|[A-Za-z]:\\Users\\/, prose)).toEqual([]);
  });

  test("names no address and no host of anybody's", () => {
    expect(lines(/(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])/, prose)).toEqual([]);

    const hosts = prose
      .filter(({ path }) => !LICENCE.test(path))
      .flatMap(({ path, text }) => [...text.matchAll(/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'`)<>\]]+/gi)].map((one) => ({ path, url: one[0] })))
      .filter(({ url }) => {
        const host = URL.parse(url)?.hostname;

        return host === undefined || !RESERVED_HOST.test(host);
      });

    expect(hosts).toEqual([]);
  });
});

// What reaches a server: the framework's fetchers, a fixed address handed to the browser's own, or a
// server's routes written out.
const FETCHERS = new Set(["$fetch", "useFetch", "useLazyFetch", "useRequestFetch"]);
const OPENERS = new Set(["fetch", "EventSource", "WebSocket", "sendBeacon"]);

function fixedAddress(node: unknown): boolean {
  const type = (node as { type?: string } | undefined)?.type;

  return type === "StringLiteral" || type === "TemplateLiteral";
}

describe("the servers the layer calls", () => {
  test("are none: it takes no fetcher, opens no fixed address and writes no route", () => {
    const calls = layerCode.flatMap((file) =>
      [...nodesOf(file)]
        .filter((node) => {
          if (node.type === "Identifier") return FETCHERS.has(node.name as string);

          if (node.type === "CallExpression" || node.type === "NewExpression") {
            const callee = node.callee as { type: string; name?: string; property?: { name?: string } };
            const name = callee.type === "Identifier" ? callee.name : callee.type === "MemberExpression" ? callee.property?.name : undefined;

            return name !== undefined && OPENERS.has(name) && fixedAddress((node.arguments as unknown[])[0]);
          }

          if (node.type === "StringLiteral") return /^\/api(\/|$)/.test(node.value as string);
          if (node.type === "TemplateElement") return /^\/api(\/|$)/.test((node.value as { raw: string }).raw);

          return false;
        })
        .map((node) => `${file.path}: ${node.type}`)
    );

    expect(calls).toEqual([]);
  });

  test("and it serves nothing itself", () => {
    expect(repositoryPaths.filter((path) => path.startsWith("server/"))).toEqual([]);
  });
});

// A key is `<domain>.<role>.<key>` under one of the layer's two domains (`docs/wording.md`, "The
// key"). A string shaped as any domain's key is read as one, so a key of somebody else's domain is
// found too.
const ROLES = "(title|label|action|placeholder|aria|status|message|error)";
const KEY_SHAPED = new RegExp(`^[a-z][a-z0-9_]*\\.${ROLES}\\.[a-z0-9_]+$`);
const LAYER_KEY = new RegExp(`^(common|files)\\.${ROLES}\\.[a-z0-9]+(_[a-z0-9]+)*$`);
// A piece of a key: the start of one, or a domain and a role with the rest left to be filled in.
const KEY_PIECE = new RegExp(`(^(common|files)\\.)|(^|\\.)${ROLES}\\.`);

const LIST_PATH = "shared/wording-keys.ts";
const asking = layerCode.filter((file) => file.path !== LIST_PATH);

// Every key written whole in the layer's code, where it is written.
function keysAsked(): Map<string, string[]> {
  const found = new Map<string, string[]>();

  for (const file of asking) {
    for (const node of nodesOf(file)) {
      const whole =
        node.type === "StringLiteral"
          ? (node.value as string)
          : node.type === "TemplateLiteral" && (node.expressions as unknown[]).length === 0
            ? (node.quasis as { value: { cooked: string } }[])[0]!.value.cooked
            : undefined;

      if (whole !== undefined && KEY_SHAPED.test(whole)) found.set(whole, [...(found.get(whole) ?? []), file.path]);
    }
  }

  return found;
}

// A key put together out of pieces: a template with a key's start in it, or a key's start added to
// something.
function keyPieces(): string[] {
  return asking.flatMap((file) =>
    [...nodesOf(file)]
      .filter((node) => {
        if (node.type === "TemplateLiteral") {
          return (node.expressions as unknown[]).length > 0 && (node.quasis as { value: { raw: string } }[]).some((one) => KEY_PIECE.test(one.value.raw));
        }

        if (node.type === "BinaryExpression" && node.operator === "+") {
          return [node.left, node.right].some((one) => {
            const literal = one as { type: string; value?: unknown };

            return literal.type === "StringLiteral" && KEY_PIECE.test(literal.value as string);
          });
        }

        return false;
      })
      .map((node) => `${file.path}: ${node.type}`)
  );
}

// Everything written as code in one part of a markdown token tree, in order.
function codeSpans(tree: unknown): string[] {
  if (Array.isArray(tree)) return tree.flatMap(codeSpans);

  if (tree === null || typeof tree !== "object") return [];

  if ((tree as { type?: string }).type === "codespan") return [(tree as Tokens.Codespan).text];

  return Object.entries(tree).flatMap(([key, one]) => (key === "raw" || key === "text" ? [] : codeSpans(one)));
}

const boundary = marked.lexer(await text("docs/boundary.md"));

// The tokens of one second-level section of the boundary document.
function section(title: string): Tokens.Generic[] {
  const start = boundary.findIndex((one) => one.type === "heading" && (one as Tokens.Heading).depth === 2 && (one as Tokens.Heading).text === title);

  if (start < 0) throw new Error(`docs/boundary.md has no section "${title}"`);

  const end = boundary.findIndex((one, at) => at > start && one.type === "heading" && (one as Tokens.Heading).depth <= 2);

  return boundary.slice(start + 1, end < 0 ? undefined : end) as Tokens.Generic[];
}

// The rows of a section's table, each as the names written as code in each of its cells.
function tableRows(title: string): string[][][] {
  const table = section(title).find((one) => one.type === "table") as Tokens.Table | undefined;

  if (table === undefined) throw new Error(`docs/boundary.md has no table under "${title}"`);

  return table.rows.map((row) => row.map((cell) => codeSpans(cell.tokens)));
}

describe("the wording keys the layer reads", () => {
  test("are listed once each, every one under the layer's two domains and named by the rule", () => {
    expect(new Set(WORDING_KEYS).size).toBe(WORDING_KEYS.length);
    expect(WORDING_KEYS.filter((key) => !LAYER_KEY.test(key))).toEqual([]);
  });

  test("are every key the layer writes, and the list holds none it does not", () => {
    const asked = keysAsked();
    const listed = new Set<string>(WORDING_KEYS);

    expect([...asked].filter(([key]) => !listed.has(key)).map(([key, paths]) => `${key} in ${[...new Set(paths)].join(", ")}`)).toEqual([]);
    expect(WORDING_KEYS.filter((key) => !asked.has(key))).toEqual([]);
  });

  test("are each written whole, never put together out of pieces", () => {
    expect(keyPieces()).toEqual([]);
  });

  test("are the keys the boundary document names", () => {
    const named = section("Wording keys")
      .filter((one) => one.type === "list")
      .flatMap((list) =>
        (list as Tokens.List).items.flatMap((item) => {
          const [group, ...names] = codeSpans(item.tokens);

          return names.filter((name) => !name.startsWith("{")).map((name) => `${group}.${name}`);
        })
      );

    expect(named.toSorted()).toEqual([...WORDING_KEYS].toSorted());
  });
});

function exportsOf(file: CodeFile): string[] {
  const names = new Set<string>();

  for (const statement of file.programs.flatMap((one) => one.body)) {
    if (statement.type === "ExportNamedDeclaration") {
      const declared = statement.declaration;

      if (declared?.type === "VariableDeclaration") {
        for (const one of declared.declarations) names.add(one.id.type === "Identifier" ? one.id.name : `a ${one.id.type}`);
      } else if (declared !== null && declared !== undefined && "id" in declared && declared.id?.type === "Identifier") {
        names.add(declared.id.name);
      }

      for (const one of statement.specifiers) names.add(one.exported.type === "Identifier" ? one.exported.name : one.exported.value);
    } else if (statement.type === "ExportDefaultDeclaration") {
      names.add("default");
    } else if (statement.type === "ExportAllDeclaration") {
      names.add(`everything of ${statement.source.value}`);
    }
  }

  return [...names].sort();
}

// The modules in one folder, each with what it exports.
function modulesIn(folder: string): Record<string, string[]> {
  return Object.fromEntries(
    layerCode
      .filter((file) => file.path.startsWith(folder) && !file.path.slice(folder.length).includes("/") && file.path.endsWith(".ts"))
      .map((file) => [file.path.slice(folder.length, -".ts".length), exportsOf(file)])
  );
}

function namedModules(title: string): Record<string, string[]> {
  return Object.fromEntries(tableRows(title).map(([module, exports]) => [module![0]!, [...exports!].sort()]));
}

function files(pattern: RegExp): string[] {
  return repositoryPaths.flatMap((path) => pattern.exec(path)?.[1] ?? []).sort();
}

describe("the boundary document", () => {
  test("names every component the layer registers, and no other", () => {
    expect(tableRows("Components").map(([name]) => name![0]!).toSorted()).toEqual(files(/^app\/components\/([^/]+)\.vue$/));
  });

  test("names every page plugin, and no other", () => {
    expect(tableRows("Page plugins").map(([name]) => name![0]!).toSorted()).toEqual(files(/^app\/plugins\/([^/]+)\.client\.ts$/));
    // A plugin that runs on the server too would stand outside what the boundary says of them all.
    expect(files(/^app\/plugins\/(.+)$/).filter((path) => !path.endsWith(".client.ts"))).toEqual([]);
  });

  test("names every domain module with everything it exports", () => {
    expect(namedModules("Domain modules")).toEqual(modulesIn("app/domain/"));
  });

  test("names every shared module with everything it exports", () => {
    expect(namedModules("Shared modules")).toEqual(modulesIn("shared/"));
  });
});
