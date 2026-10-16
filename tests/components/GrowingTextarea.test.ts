import { describe, expect, test } from "bun:test";
import { Glob } from "bun";

// A form's text box is as tall as its text at every width, and the one box that measures it is
// GrowingTextarea (`docs/components.md`, "Forms"). A component that wrote the library's textarea
// straight in would bring back the box that is measured only as its text changes, and with it a
// scroll inside the page's whenever its width moves.

const components = new URL("../../app/components/", import.meta.url);

async function writers(): Promise<string[]> {
  const found: string[] = [];

  for await (const path of new Glob("**/*.vue").scan({ cwd: components.pathname })) {
    if (/<UTextarea\b/.test(await Bun.file(new URL(path, components)).text())) found.push(path);
  }

  return found.sort();
}

describe("the box a form's text is written in", () => {
  test("is the library's textarea only inside GrowingTextarea", async () => {
    expect(await writers()).toEqual(["GrowingTextarea.vue"]);
  });
});
