import { describe, expect, test } from "bun:test";

import { CONSOLE_BUNDLE_SCHEMA, consoleBundle } from "../../shared/console-bundle";

// The console plugin contract's declaration (`docs/console-bundles.md`, "The declaration").

const declared = {
  name: "notes",
  title: "notes.title.screen",
  icon: "i-material-symbols-note-stack-outline",
  screenPath: "/notes",
  serviceName: "notes",
  languagePack: "lang"
};

function faultsOf(value: unknown): string {
  try {
    consoleBundle(value);
  } catch (error) {
    return String(error);
  }

  throw new Error("the declaration was read");
}

describe("a bundle's declaration", () => {
  test("is read with every optional field filled", () => {
    expect(consoleBundle(declared)).toEqual({ ...declared, events: false, websocket: false, pushKinds: [] });
  });

  test("keeps what it states of the optional fields", () => {
    const read = consoleBundle({ ...declared, screenPath: "/notes/shared", events: true, websocket: true, pushKinds: ["note.created"] });

    expect(read.screenPath).toBe("/notes/shared");
    expect([read.events, read.websocket, read.pushKinds]).toEqual([true, true, ["note.created"]]);
  });

  test("is refused naming each field at fault", () => {
    const faults = faultsOf({ ...declared, name: "Notes", screenPath: "notes/", languagePack: "../lang", pushKinds: ["created"] });

    for (const field of ["name", "screenPath", "languagePack", "pushKinds.0"]) expect(faults).toContain(`${field}:`);
    expect(faults).not.toContain("icon:");
  });

  test("is refused where its title lies outside its namespace", () => {
    expect(faultsOf({ ...declared, title: "common.title.screen" })).toContain("title: a key under the bundle's namespace");
  });

  test("is refused where it lacks a field or holds one the contract does not name", () => {
    const { serviceName: _left, ...lacking } = declared;

    expect(faultsOf(lacking)).toContain("serviceName:");
    expect(faultsOf({ ...declared, relayPrefix: "/notes" })).toContain("relayPrefix");
  });
});

describe("the declaration's JSON Schema", () => {
  test("requires the fields a bundle states and closes the object", () => {
    expect(CONSOLE_BUNDLE_SCHEMA.required).toEqual(["name", "title", "icon", "screenPath", "serviceName", "languagePack"]);
    expect(CONSOLE_BUNDLE_SCHEMA.additionalProperties).toBe(false);
    expect(Object.keys(CONSOLE_BUNDLE_SCHEMA.properties as object).toSorted()).toEqual(
      [...Object.keys(declared), "events", "websocket", "pushKinds"].toSorted()
    );
  });
});
