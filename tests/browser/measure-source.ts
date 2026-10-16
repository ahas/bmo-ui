import { readFileSync } from "node:fs";

// The measuring module as the JavaScript a page takes directly.
//
// The module itself is TypeScript, so it reads like the code around it and its test can import it;
// a browser wants the types gone. It is read from disk on every call rather than held, so a change
// made to it while a check is under way is served on the next load and needs no restart of
// anything.
export function measureSource(): string {
  const source = readFileSync(new URL("./measure.ts", import.meta.url), "utf8");

  return new Bun.Transpiler({ loader: "ts" }).transformSync(source);
}
