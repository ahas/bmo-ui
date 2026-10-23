import { describe, expect, test } from "bun:test";

import { CONSOLE_MANIFEST_ROUTE, CONSOLE_MANIFEST_SCHEMA, CONSOLE_ROLES, consoleManifest, relaysRoute, roleAllows, screensCall } from "../../shared/console-manifest";

// The console plugin contract's manifest (`docs/console-bundles.md`, "The manifest").

const answered = {
  name: "notes",
  title: "notes.title.screen",
  icon: "i-material-symbols-note-stack-outline",
  screenPath: "/notes",
  serviceName: "notes",
  bundle: "/console/bundle-4f2a.js",
  words: "/console/words",
  role: "member"
};

function faultsOf(value: unknown): string {
  try {
    consoleManifest(value);
  } catch (error) {
    return String(error);
  }

  throw new Error("the manifest was read");
}

describe("a service's manifest", () => {
  test("is answered at the contract's one route", () => {
    expect(CONSOLE_MANIFEST_ROUTE).toBe("/console-manifest");
  });

  test("is read with every optional field but the stylesheet filled", () => {
    expect(consoleManifest(answered)).toEqual({
      ...answered,
      role: "member",
      apiPrefix: "/",
      ownerKey: false,
      events: false,
      websocket: false,
      pushKinds: [],
      calls: [],
      relays: []
    });
  });

  test("keeps what it states of the optional fields", () => {
    const read = consoleManifest({
      ...answered,
      role: "administrator",
      stylesheet: "/console/bundle-4f2a.css",
      apiPrefix: "/api/v1",
      ownerKey: true,
      events: true,
      websocket: true,
      pushKinds: ["note.created"]
    });

    expect([read.role, read.stylesheet, read.apiPrefix, read.ownerKey]).toEqual(["administrator", "/console/bundle-4f2a.css", "/api/v1", true]);
    expect([read.events, read.websocket, read.pushKinds]).toEqual([true, true, ["note.created"]]);
  });

  test("is refused naming each field at fault", () => {
    const faults = faultsOf({ ...answered, name: "Notes", screenPath: "notes/", role: "owner", pushKinds: ["created"] });

    for (const field of ["name", "screenPath", "role", "pushKinds.0"]) expect(faults).toContain(`${field}:`);
    expect(faults).not.toContain("icon:");
  });

  test("is refused where a path of the service's API leaves its root or is no path from it", () => {
    for (const bundle of ["console/bundle.js", "/console/../admin/bundle.js", "/./bundle.js", "https://notes.example.test/bundle.js", "/bundle.js?v=2", "/console//bundle.js"]) {
      expect(faultsOf({ ...answered, bundle })).toContain("bundle: a path of the service's API from its root");
    }

    expect(faultsOf({ ...answered, words: "/console/words/.." })).toContain("words:");
    expect(faultsOf({ ...answered, apiPrefix: "api" })).toContain("apiPrefix:");
    expect(consoleManifest({ ...answered, apiPrefix: "/" }).apiPrefix).toBe("/");
    expect(consoleManifest({ ...answered, bundle: "/console/bundle.v2.min.js" }).bundle).toBe("/console/bundle.v2.min.js");
  });

  test("keeps the services its screens call, and refuses its own, a name named twice or one out of kebab-case", () => {
    expect(consoleManifest({ ...answered, calls: ["words-out", "files"] }).calls).toEqual(["words-out", "files"]);
    expect(faultsOf({ ...answered, calls: ["notes"] })).toContain("calls: another service than the bundle's own");
    expect(faultsOf({ ...answered, calls: ["files", "files"] })).toContain("calls: each service named once");
    expect(faultsOf({ ...answered, calls: ["Files"] })).toContain("calls.0:");
  });

  test("keeps the routes it relays outside its prefix, and refuses one named twice, an unknown method or no path", () => {
    const relays = [
      { method: "POST", path: "/readings" },
      { method: "GET", path: "/readings/kept" }
    ] as const;

    expect(consoleManifest({ ...answered, relays }).relays).toEqual([...relays]);
    expect(faultsOf({ ...answered, relays: [relays[0], relays[0]] })).toContain("relays: each route named once");
    expect(faultsOf({ ...answered, relays: [{ method: "TRACE", path: "/readings" }] })).toContain("relays.0.method:");
    expect(faultsOf({ ...answered, relays: [{ method: "POST", path: "readings" }] })).toContain("relays.0.path:");
    expect(faultsOf({ ...answered, relays: [{ method: "POST", path: "/readings", role: "member" }] })).toContain("relays.0");
  });

  test("is refused where its title lies outside its namespace", () => {
    expect(faultsOf({ ...answered, title: "common.title.screen" })).toContain("title: a key under the bundle's namespace");
  });

  test("is refused where it lacks a field or holds one the contract does not name", () => {
    const { role: _left, ...lacking } = answered;

    expect(faultsOf(lacking)).toContain("role:");
    expect(faultsOf({ ...answered, languagePack: "lang" })).toContain("languagePack");
  });
});

describe("a role", () => {
  test("allows itself, and an administrator's allows a member's but not the other way", () => {
    expect(CONSOLE_ROLES).toEqual(["administrator", "member"]);
    expect(roleAllows("administrator", "administrator")).toBe(true);
    expect(roleAllows("administrator", "member")).toBe(true);
    expect(roleAllows("member", "member")).toBe(true);
    expect(roleAllows("member", "administrator")).toBe(false);
  });
});

describe("the services a bundle's screens call", () => {
  test("are their own and those named under calls, and no other", () => {
    const read = consoleManifest({ ...answered, calls: ["files"] });

    expect(screensCall(read, "notes")).toBe(true);
    expect(screensCall(read, "files")).toBe(true);
    expect(screensCall(read, "mail")).toBe(false);
    expect(screensCall(consoleManifest(answered), "files")).toBe(false);
  });
});

describe("the routes a manifest relays", () => {
  test("are its method, in any letter case, and its whole path, and no other", () => {
    const read = consoleManifest({ ...answered, relays: [{ method: "POST", path: "/readings" }] });

    expect(relaysRoute(read, "POST", "/readings")).toBe(true);
    expect(relaysRoute(read, "post", "/readings")).toBe(true);
    expect(relaysRoute(read, "GET", "/readings")).toBe(false);
    expect(relaysRoute(read, "POST", "/readings/kept")).toBe(false);
    expect(relaysRoute(consoleManifest(answered), "POST", "/readings")).toBe(false);
  });
});

describe("the manifest's JSON Schema", () => {
  test("requires the fields a service states and closes the object", () => {
    expect(CONSOLE_MANIFEST_SCHEMA.required).toEqual(["name", "title", "icon", "screenPath", "serviceName", "bundle", "words", "role"]);
    expect(CONSOLE_MANIFEST_SCHEMA.additionalProperties).toBe(false);
    expect(Object.keys(CONSOLE_MANIFEST_SCHEMA.properties as object).toSorted()).toEqual(
      [...Object.keys(answered), "stylesheet", "apiPrefix", "ownerKey", "events", "websocket", "pushKinds", "calls", "relays"].toSorted()
    );
    expect((CONSOLE_MANIFEST_SCHEMA.properties as Record<string, { enum?: unknown }>).role!.enum).toEqual(["administrator", "member"]);
  });
});
