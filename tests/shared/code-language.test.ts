import { describe, expect, test } from "bun:test";

import { codeLanguage } from "#shared/code-language";

describe("the language a file is coloured in", () => {
  test("is the editor's name for what the end of the path says, wherever the path came from", () => {
    expect(codeLanguage("src/app/domain/graph.ts")).toBe("typescript");
    expect(codeLanguage("lib/agent/runner.ts")).toBe("typescript");
    expect(codeLanguage("docs/guide.md")).toBe("markdown");
    expect(codeLanguage("src/app/assets/css/main.css")).toBe("css");
    expect(codeLanguage("scripts/deploy.sh")).toBe("shell");
    expect(codeLanguage("src/app.config.yaml")).toBe("yaml");
    expect(codeLanguage("data/settings.ini")).toBe("ini");
    expect(codeLanguage("scripts/schema.sql")).toBe("sql");
    expect(codeLanguage("src/server/index.js")).toBe("javascript");
    expect(codeLanguage("src/public/index.html")).toBe("html");
  });

  test("reads a .vue file as html, since the editor has no language of its own for one", () => {
    expect(codeLanguage("src/app/components/CodeView.vue")).toBe("html");
  });

  test("reads JSON with the javascript tokenizer, which is the grammar JSON is written in", () => {
    expect(codeLanguage("data/graph.json")).toBe("javascript");
  });

  test("does not care how the name was cased", () => {
    expect(codeLanguage("README.MD")).toBe("markdown");
    expect(codeLanguage("Web/App/Domain/Graph.TS")).toBe("typescript");
  });

  test("is plain text where the name has no end the editor knows, or none at all", () => {
    expect(codeLanguage("Makefile")).toBe("plaintext");
    expect(codeLanguage("notes.unknown")).toBe("plaintext");
    expect(codeLanguage("some.dir/README")).toBe("plaintext");
  });
});
