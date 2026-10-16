// The marks a file explorer puts on its rows: the icons of the Material Icon Theme, which is what a
// reader of code already knows files by. They are an outside set with names of its own, so the
// names below are that set's names and nothing of the layer's; a file the set has nothing
// particular for wears its plain document mark, and a folder its plain folder.

const SET = "i-material-icon-theme-";

// Whole file names the set marks on their own, lowercased.
const BY_NAME: Record<string, string> = {
  "package.json": "nodejs",
  "bun.lock": "bun",
  "bun.lockb": "bun",
  "bunfig.toml": "bun",
  "tsconfig.json": "tsconfig",
  "dockerfile": "docker",
  "containerfile": "docker",
  "docker-compose.yml": "docker",
  "compose.yaml": "docker",
  "readme.md": "readme",
  "license": "license",
  "license.md": "license",
  "claude.md": "claude",
  ".gitignore": "git",
  ".gitattributes": "git",
  ".env": "tune",
  "makefile": "makefile",
  "cargo.toml": "rust",
  "cargo.lock": "lock",
  "nuxt.config.ts": "nuxt",
  "vite.config.ts": "vite",
  "vitest.config.ts": "vitest"
};

// Two-part endings, which are read before the last part alone.
const BY_DOUBLE_END: Record<string, string> = {
  "test.ts": "test-ts",
  "spec.ts": "test-ts",
  "test.js": "test-js",
  "spec.js": "test-js",
  "d.ts": "typescript-def",
  "js.map": "javascript-map"
};

const BY_END: Record<string, string> = {
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "react-ts",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "react",
  json: "json",
  jsonc: "json",
  vue: "vue",
  md: "markdown",
  markdown: "markdown",
  py: "python",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  c: "c",
  h: "h",
  cc: "cpp",
  cpp: "cpp",
  cxx: "cpp",
  hpp: "hpp",
  cs: "csharp",
  rb: "ruby",
  php: "php",
  lua: "lua",
  swift: "swift",
  dart: "dart",
  ex: "elixir",
  exs: "elixir",
  r: "r",
  pl: "perl",
  ps1: "powershell",
  sh: "console",
  bash: "console",
  zsh: "console",
  bat: "console",
  cmd: "console",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  ini: "settings",
  conf: "settings",
  service: "settings",
  env: "tune",
  sql: "database",
  db: "database",
  sqlite: "database",
  html: "html",
  css: "css",
  scss: "sass",
  sass: "sass",
  less: "less",
  svg: "svg",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  ico: "image",
  xml: "xml",
  lock: "lock",
  txt: "document",
  log: "log",
  pdf: "pdf",
  zip: "zip",
  gz: "zip",
  tar: "zip",
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  mp4: "video",
  webm: "video",
  csv: "table",
  graphql: "graphql",
  gql: "graphql",
  proto: "proto",
  diff: "diff",
  patch: "diff",
  pem: "certificate",
  crt: "certificate",
  key: "key",
  woff: "font",
  woff2: "font",
  ttf: "font"
};

// Folders by name, each with an open form of the same name.
const FOLDERS: Record<string, string> = {
  src: "folder-src",
  app: "folder-app",
  components: "folder-components",
  pages: "folder-views",
  views: "folder-views",
  docs: "folder-docs",
  scripts: "folder-scripts",
  test: "folder-test",
  tests: "folder-test",
  server: "folder-server",
  public: "folder-public",
  assets: "folder-resource",
  node_modules: "folder-node",
  ".git": "folder-git",
  ".github": "folder-github",
  ".vscode": "folder-vscode",
  ".claude": "folder-claude",
  config: "folder-config",
  utils: "folder-utils",
  api: "folder-api",
  layouts: "folder-layout",
  types: "folder-typescript",
  shared: "folder-shared",
  agents: "folder-robot",
  rules: "folder-rules",
  data: "folder-database",
  lib: "folder-lib",
  client: "folder-client",
  browser: "folder-client",
  hooks: "folder-hook",
  plugins: "folder-plugin",
  modules: "folder-packages",
  packages: "folder-packages",
  domain: "folder-core",
  core: "folder-core",
  images: "folder-images",
  icons: "folder-images",
  tools: "folder-tools",
  middleware: "folder-middleware",
  routes: "folder-routes",
  store: "folder-store",
  i18n: "folder-i18n",
  mocks: "folder-mock",
  logs: "folder-log",
  tmp: "folder-temp",
  dist: "folder-dist",
  prompts: "folder-prompts"
};

function nameOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1).toLowerCase();
}

// The icon a file stands with.
export function fileIcon(path: string): string {
  const name = nameOf(path);
  const parts = name.split(".");
  const named = BY_NAME[name];

  if (named !== undefined) {
    return `${SET}${named}`;
  }

  const double = parts.length > 2 ? BY_DOUBLE_END[parts.slice(-2).join(".")] : undefined;
  const single = parts.length > 1 ? BY_END[parts.at(-1)!] : undefined;

  return `${SET}${double ?? single ?? "document"}`;
}

// The icon a folder stands with, open or shut.
export function folderIcon(path: string, open: boolean): string {
  const base = FOLDERS[nameOf(path)] ?? "folder-base";

  return `${SET}${base}${open ? "-open" : ""}`;
}

// Every name this module can hand out, for a check against the set itself.
export function iconNames(): string[] {
  const files = [...Object.values(BY_NAME), ...Object.values(BY_DOUBLE_END), ...Object.values(BY_END), "document"];
  const folders = [...Object.values(FOLDERS), "folder-base"].flatMap((one) => [one, `${one}-open`]);

  return [...new Set([...files, ...folders])];
}
