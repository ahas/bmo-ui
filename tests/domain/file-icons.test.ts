import { describe, expect, test } from "bun:test";

import { fileIcon, folderIcon, iconNames } from "~/domain/file-icons";

describe("the marks of an explorer", () => {
  test("know a file by its whole name first", () => {
    expect(fileIcon("client/package.json")).toBe("i-material-icon-theme-nodejs");
    expect(fileIcon("Dockerfile")).toBe("i-material-icon-theme-docker");
  });

  test("then by a two-part ending, then by its last part", () => {
    expect(fileIcon("server/a.test.ts")).toBe("i-material-icon-theme-test-ts");
    expect(fileIcon("server/a.ts")).toBe("i-material-icon-theme-typescript");
    expect(fileIcon("tool/main.py")).toBe("i-material-icon-theme-python");
    expect(fileIcon("crate/lib.rs")).toBe("i-material-icon-theme-rust");
  });

  test("and wear the plain mark where the set has nothing particular", () => {
    expect(fileIcon("notes/unknown.qqq")).toBe("i-material-icon-theme-document");
    expect(fileIcon("bin/runner")).toBe("i-material-icon-theme-document");
  });

  test("a folder is open or shut, named or plain", () => {
    expect(folderIcon("client/app/components", false)).toBe("i-material-icon-theme-folder-components");
    expect(folderIcon("client/app/components", true)).toBe("i-material-icon-theme-folder-components-open");
    expect(folderIcon("misc", false)).toBe("i-material-icon-theme-folder-base");
  });

  test("every name handed out is one of the set's names in its own spelling", () => {
    for (const name of iconNames()) {
      expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});
