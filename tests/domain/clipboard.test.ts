import { afterEach, describe, expect, test } from "bun:test";

import { copyText } from "~/domain/clipboard";

// Text put on the clipboard: through the clipboard API where it takes it, through the browser's
// older copy where it refuses, and an answer of whether either went through.

const standing = Object.getOwnPropertyDescriptor(navigator, "clipboard");

function clipboardSays(writeText: ((text: string) => Promise<void>) | undefined): void {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: writeText === undefined ? undefined : { writeText } });
}

function olderCopySays(copied: boolean): string[] {
  const asked: string[] = [];

  Object.assign(document, { execCommand: (command: string) => (asked.push(command), copied) });

  return asked;
}

afterEach(() => {
  if (standing !== undefined) Object.defineProperty(navigator, "clipboard", standing);
});

describe("a copy", () => {
  test("goes through the clipboard API where it takes the text", async () => {
    const written: string[] = [];

    clipboardSays(async (text) => void written.push(text));

    expect(await copyText("one")).toBe(true);
    expect(written).toEqual(["one"]);
  });

  test("falls back to the older copy where the API refuses, and leaves nothing behind", async () => {
    clipboardSays(async () => Promise.reject(new Error("refused")));
    const asked = olderCopySays(true);

    expect(await copyText("two")).toBe(true);
    expect(asked).toEqual(["copy"]);
    expect(document.querySelector("textarea")).toBeNull();
  });

  test("says it failed where neither takes the text", async () => {
    clipboardSays(undefined);
    olderCopySays(false);

    expect(await copyText("three")).toBe(false);
  });
});
