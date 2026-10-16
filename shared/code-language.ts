// Which of the editor's languages a file is coloured in, by the name at the end of its path. The
// editor is handed a language rather than left to guess one, because what it is given is a string of
// text and a path, and neither of those tells it anything on its own.
//
// Two of these are not the obvious answer. A `.vue` file has no language of its own in the editor, so
// it is read as html — which is what the outside of such a file is, and the editor's html tokenizer
// colours the script and the style it holds by handing them to the javascript and css tokenizers.
// JSON is read with the javascript one: the editor ships JSON as a language service with a worker of
// its own rather than as a tokenizer, and JSON is written in a corner of javascript's own grammar, so
// the tokenizer colours it without any of that being carried.
const CODE_LANGUAGES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "javascript",
  vue: "html",
  html: "html",
  css: "css",
  md: "markdown",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  yaml: "yaml",
  yml: "yaml",
  ini: "ini",
  toml: "ini",
  conf: "ini",
  jsonc: "javascript",
  json5: "javascript",
  sql: "sql"
};

// The end of the name at the end of a path, lowercased, and empty where the name has no end of its
// own. A dot in a directory further up the path is no part of it.
function extension(path: string): string {
  const named = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
  const dot = named.lastIndexOf(".");

  return dot === -1 ? "" : named.slice(dot + 1);
}

// A file the editor knows no language for stands as plain text rather than being coloured as
// something it is not: a wrong tokenizer reads worse than none.
export function codeLanguage(path: string): string {
  return CODE_LANGUAGES[extension(path)] ?? "plaintext";
}
