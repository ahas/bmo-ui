import { describe, expect, test } from "bun:test";

import {
  CONSOLE_MANIFEST_ROUTE,
  CONSOLE_MANIFEST_SCHEMA,
  CONSOLE_ROLES,
  CONSOLE_SIDEBAR_SECTIONS,
  LAYER_VERSION,
  SHARE_HEAD_LANGUAGE_QUERY,
  consoleManifest,
  movedScreenAddress,
  noticePlace,
  onThisLayer,
  relaysRoute,
  roleAllows,
  screensCall,
  shareHead,
  shareHeadPath,
  shareRead
} from "../../shared/console-manifest";

// The console plugin contract's manifest (`docs/console-bundles.md`, "The manifest").

const answered = {
  name: "notes",
  title: "notes.title.screen",
  icon: "i-material-symbols-note-stack-outline",
  screenPath: "/notes",
  serviceName: "notes",
  layer: "0.4.0-rev.2",
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

  test("is read with each optional field that states a default filled, and the two without one left out", () => {
    expect(consoleManifest(answered)).toEqual({
      ...answered,
      role: "member",
      sidebarSection: "application",
      formerScreenPaths: [],
      apiPrefix: "/",
      ownerKey: false,
      events: false,
      websocket: false,
      pushKinds: [],
      pushPlaces: {},
      calls: [],
      relays: [],
      shareReads: []
    });
    expect(consoleManifest(answered).stylesheet).toBeUndefined();
    expect(consoleManifest(answered).sidebarUnread).toBeUndefined();
    expect(consoleManifest(answered).shareHead).toBeUndefined();
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
      pushKinds: ["note.created"],
      sidebarUnread: { path: "/api/v1/summary", field: "unreadCount" }
    });

    expect([read.role, read.stylesheet, read.apiPrefix, read.ownerKey]).toEqual(["administrator", "/console/bundle-4f2a.css", "/api/v1", true]);
    expect([read.events, read.websocket, read.pushKinds]).toEqual([true, true, ["note.created"]]);
    expect(read.sidebarUnread).toEqual({ path: "/api/v1/summary", field: "unreadCount" });
  });

  test("keeps the sidebar count it declares, and refuses one outside the API prefix, a field out of camelCase or a field of its own", () => {
    expect(consoleManifest({ ...answered, sidebarUnread: { path: "/summary", field: "unreadCount" } }).sidebarUnread).toEqual({ path: "/summary", field: "unreadCount" });
    expect(faultsOf({ ...answered, apiPrefix: "/screen", sidebarUnread: { path: "/summary", field: "unreadCount" } })).toContain("sidebarUnread: a path under the API prefix");
    expect(faultsOf({ ...answered, sidebarUnread: { path: "summary", field: "unreadCount" } })).toContain("sidebarUnread.path:");
    expect(faultsOf({ ...answered, sidebarUnread: { path: "/summary", field: "UnreadCount" } })).toContain("sidebarUnread.field:");
    expect(faultsOf({ ...answered, sidebarUnread: { path: "/summary", field: "unreadCount", label: "notes.label.unread" } })).toContain("sidebarUnread");
  });

  test("keeps the sidebar section it names, and refuses one the contract does not name", () => {
    expect(CONSOLE_SIDEBAR_SECTIONS.map((sidebarSection) => consoleManifest({ ...answered, sidebarSection }).sidebarSection)).toEqual(["administration", "application"]);
    expect(faultsOf({ ...answered, sidebarSection: "settings" })).toContain("sidebarSection:");
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

  test("keeps the reads a share token permits, and refuses a pattern without the token, outside the prefix or named twice", () => {
    const shareReads = ["/api/v1/links/{token}", "/api/v1/links/{token}/files/{fileId}"];

    expect(consoleManifest({ ...answered, apiPrefix: "/api/v1", shareReads }).shareReads).toEqual(shareReads);
    expect(faultsOf({ ...answered, shareReads: ["/links/{id}"] })).toContain("shareReads.0: a pattern holding {token} once");
    expect(faultsOf({ ...answered, shareReads: ["/links/{token}/{token}"] })).toContain("shareReads.0: a pattern holding {token} once");
    expect(faultsOf({ ...answered, shareReads: ["/links/{Token}"] })).toContain("shareReads.0:");
    expect(faultsOf({ ...answered, shareReads: ["/links/../{token}"] })).toContain("shareReads.0:");
    expect(faultsOf({ ...answered, shareReads: ["links/{token}"] })).toContain("shareReads.0:");
    expect(faultsOf({ ...answered, apiPrefix: "/api/v1", shareReads: ["/links/{token}"] })).toContain("shareReads: patterns under the API prefix");
    expect(faultsOf({ ...answered, shareReads: ["/links/{token}", "/links/{token}"] })).toContain("shareReads: each pattern named once");
  });

  test("keeps the paths its screens stood under before, and refuses one out of shape, the screen path, one under or over it, or one named twice or under another", () => {
    expect(consoleManifest({ ...answered, formerScreenPaths: ["/memos", "/old-notes"] }).formerScreenPaths).toEqual(["/memos", "/old-notes"]);
    expect(faultsOf({ ...answered, formerScreenPaths: ["memos/"] })).toContain("formerScreenPaths.0:");
    expect(faultsOf({ ...answered, formerScreenPaths: ["/Memos"] })).toContain("formerScreenPaths.0:");

    for (const former of ["/notes", "/notes/old"]) {
      expect(faultsOf({ ...answered, formerScreenPaths: [former] })).toContain("formerScreenPaths: paths neither the screen path nor under or over it");
    }

    expect(faultsOf({ ...answered, screenPath: "/memos/notes", formerScreenPaths: ["/memos"] })).toContain("formerScreenPaths: paths neither the screen path nor under or over it");
    expect(consoleManifest({ ...answered, formerScreenPaths: ["/notes-old"] }).formerScreenPaths).toEqual(["/notes-old"]);
    expect(faultsOf({ ...answered, formerScreenPaths: ["/memos", "/memos"] })).toContain("formerScreenPaths: each path named once, none under or over another");
    expect(faultsOf({ ...answered, formerScreenPaths: ["/memos", "/memos/old"] })).toContain("formerScreenPaths: each path named once, none under or over another");
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

describe("the share reads a manifest names", () => {
  test("are a GET or a HEAD whose path a pattern matches segment by segment, and no other", () => {
    const read = consoleManifest({ ...answered, shareReads: ["/links/{token}", "/links/{token}/files/{fileId}"] });

    expect(shareRead(read, "GET", "/links/Ab3_x")).toBe(true);
    expect(shareRead(read, "head", "/links/Ab3_x")).toBe(true);
    expect(shareRead(read, "GET", "/links/Ab3_x/files/12")).toBe(true);
    expect(shareRead(read, "GET", "/links/a%2Fb/files/12")).toBe(true);
    expect(shareRead(read, "POST", "/links/Ab3_x")).toBe(false);
    expect(shareRead(read, "DELETE", "/links/Ab3_x")).toBe(false);
    expect(shareRead(read, "GET", "/links")).toBe(false);
    expect(shareRead(read, "GET", "/links/")).toBe(false);
    expect(shareRead(read, "GET", "/links/Ab3_x/files")).toBe(false);
    expect(shareRead(read, "GET", "/links/Ab3_x/files/12/more")).toBe(false);
    expect(shareRead(read, "GET", "/notes/Ab3_x")).toBe(false);
    for (const climbing of ["/links/..", "/links/.", "/links/%2e%2e", "/links/%2E", "/links/Ab3_x/files/.."]) {
      expect(shareRead(read, "GET", climbing)).toBe(false);
    }
    expect(shareRead(consoleManifest(answered), "GET", "/links/Ab3_x")).toBe(false);
  });
});

describe("the address a moved screen's path moved to", () => {
  const moved = consoleManifest({ ...answered, formerScreenPaths: ["/memos", "/old/notes"] });

  test("is the same path under the screen path, its query kept, for the former path itself and every path below it", () => {
    expect(movedScreenAddress(moved, "/memos")).toBe("/notes");
    expect(movedScreenAddress(moved, "/memos/")).toBe("/notes/");
    expect(movedScreenAddress(moved, "/memos/share/a1B2c3")).toBe("/notes/share/a1B2c3");
    expect(movedScreenAddress(moved, "/memos/42?tab=sources&page=2")).toBe("/notes/42?tab=sources&page=2");
    expect(movedScreenAddress(moved, "/memos?q=a%2Fb")).toBe("/notes?q=a%2Fb");
    expect(movedScreenAddress(moved, "/old/notes/7")).toBe("/notes/7");
  });

  test("is none for a path under no former screen path, the screen path itself among them", () => {
    for (const path of ["/notes", "/notes/42", "/memosx", "/memos-old/1", "/old", "/", "", "/x/memos"]) {
      expect(movedScreenAddress(moved, path)).toBeNull();
    }

    expect(movedScreenAddress(consoleManifest(answered), "/memos")).toBeNull();
  });
});

describe("the layer a manifest names", () => {
  test("is required, as the bundle build wrote it", () => {
    const { layer: _layer, ...unnamed } = answered;

    expect(faultsOf(unnamed)).toContain("layer");
    expect(faultsOf({ ...answered, layer: "" })).toContain("layer");
  });

  test("attaches the bundle only where it is the layer this module is part of, taken from its source", () => {
    expect(onThisLayer(consoleManifest({ ...answered, layer: LAYER_VERSION }))).toBe(true);
    expect(onThisLayer(consoleManifest(answered))).toBe(false);
    expect(onThisLayer(consoleManifest({ ...answered, layer: `${LAYER_VERSION}.1` }))).toBe(false);
  });

  test("attaches a bundle built on any release of a release's range, and none outside it", () => {
    const range = ["1.0.0-rev.3", "1.0.0-rev.4", "1.0.0-rev.5"];

    expect(range.map((layer) => onThisLayer(consoleManifest({ ...answered, layer }), range))).toEqual([true, true, true]);
    expect(["1.0.0-rev.2", "1.0.0-rev.6", "1.0.0-rev.4+source"].map((layer) => onThisLayer(consoleManifest({ ...answered, layer }), range))).toEqual([false, false, false]);
  });
});

describe("the manifest's JSON Schema", () => {
  test("requires the fields a service states and closes the object", () => {
    expect(CONSOLE_MANIFEST_SCHEMA.required).toEqual(["name", "title", "icon", "screenPath", "serviceName", "layer", "bundle", "words", "role"]);
    expect(CONSOLE_MANIFEST_SCHEMA.additionalProperties).toBe(false);
    expect(Object.keys(CONSOLE_MANIFEST_SCHEMA.properties as object).toSorted()).toEqual(
      [...Object.keys(answered), "formerScreenPaths", "stylesheet", "apiPrefix", "ownerKey", "events", "websocket", "pushKinds", "pushPlaces", "sidebarUnread", "sidebarSection", "calls", "relays", "shareReads", "shareHead"].toSorted()
    );
    expect((CONSOLE_MANIFEST_SCHEMA.properties as Record<string, { enum?: unknown }>).role!.enum).toEqual(["administrator", "member"]);
    expect((CONSOLE_MANIFEST_SCHEMA.properties as Record<string, unknown>).sidebarSection).toMatchObject({
      enum: ["administration", "application"],
      default: "application"
    });
  });
});

describe("a notice's place", () => {
  const notes = { ...answered, pushKinds: ["note.created", "note.changed"], pushPlaces: { "note.created": "/notes/{bookName}/open/{noteId}" } };

  test("is named per kind under pushKinds, as a pattern at or below the screen path", () => {
    expect(consoleManifest(notes).pushPlaces).toEqual({ "note.created": "/notes/{bookName}/open/{noteId}" });
    expect(faultsOf({ ...notes, pushPlaces: { "note.deleted": "/notes/{noteId}" } })).toContain("pushPlaces: places of kinds under pushKinds");
    expect(faultsOf({ ...notes, pushPlaces: { "note.created": "/books/{noteId}" } })).toContain("pushPlaces: patterns at or below the screen path");
    expect(faultsOf({ ...notes, pushPlaces: { "note.created": "/notes/../{noteId}" } })).toContain("pushPlaces");
    expect(faultsOf({ ...notes, pushPlaces: { "note.created": "/notes/{NoteId}" } })).toContain("pushPlaces");
    expect(faultsOf({ ...notes, pushPlaces: { created: "/notes" } })).toContain("pushPlaces");
  });

  test("is the pattern with each placeholder filled from the member and escaped as one segment", () => {
    const read = consoleManifest(notes);

    expect(noticePlace(read, "note.created", { bookName: "home", noteId: "a/b c" })).toBe("/notes/home/open/a%2Fb%20c");
    expect(noticePlace(read, "note.created", { bookName: "home", noteId: 42 })).toBe("/notes/home/open/42");
  });

  test("is the screen path for a kind with no place, and where a placeholder's field cannot fill its segment", () => {
    const read = consoleManifest(notes);

    expect(noticePlace(read, "note.changed", { bookName: "home", noteId: "n1" })).toBe("/notes");
    expect(noticePlace(consoleManifest(answered), "note.created", { noteId: "n1" })).toBe("/notes");

    for (const noteId of [undefined, "", "  ", ".", "..", null, true, Number.NaN, { name: "n1" }]) {
      expect(noticePlace(read, "note.created", { bookName: "home", noteId })).toBe("/notes");
    }
  });
});

describe("a share address's head", () => {
  const head = {
    title: "Plan <one>",
    description: "What the plan holds",
    image: "/links/Ab3_x/picture",
    url: "https://console.example/notes/share/Ab3_x",
    locale: "en_US",
    siteName: "Notes",
    type: "article",
    kind: "Plan"
  };

  test("is named as a pattern under the API prefix holding the token once and no other placeholder", () => {
    expect(consoleManifest({ ...answered, apiPrefix: "/api", shareHead: "/api/links/{token}/head" }).shareHead).toBe("/api/links/{token}/head");
    expect(faultsOf({ ...answered, shareHead: "/links/head" })).toContain("shareHead: a pattern holding {token} once");
    expect(faultsOf({ ...answered, shareHead: "/links/{token}/{token}" })).toContain("shareHead: a pattern holding {token} once");
    expect(faultsOf({ ...answered, shareHead: "/links/{token}/{fileId}" })).toContain("shareHead:");
    expect(faultsOf({ ...answered, shareHead: "/links/../{token}" })).toContain("shareHead:");
    expect(faultsOf({ ...answered, apiPrefix: "/api", shareHead: "/links/{token}/head" })).toContain("shareHead: a pattern under the API prefix");
  });

  test("is asked at the pattern with the address's token in place, and nowhere for a manifest naming none", () => {
    const read = consoleManifest({ ...answered, shareHead: "/links/{token}/head" });

    expect(SHARE_HEAD_LANGUAGE_QUERY).toBe("language");
    expect(shareHeadPath(read, "Ab3_x")).toBe("/links/Ab3_x/head");
    expect(shareHeadPath(read, "a%20b")).toBe("/links/a%20b/head");
    expect(shareHeadPath(consoleManifest(answered), "Ab3_x")).toBeNull();

    for (const token of ["", ".", "..", "%2E", "%2e%2E", "a/b", "a?b", "a#b"]) {
      expect(shareHeadPath(read, token)).toBeNull();
    }
  });

  test("reads an answer of the shape, letting go of fields it does not name", () => {
    expect(shareHead({ ...head, extra: 1 })).toEqual(head);

    const { description: _description, image: _image, kind: _kind, ...bare } = head;

    expect(shareHead(bare)).toEqual(bare);
  });

  test("refuses an answer out of the shape, naming each field at fault", () => {
    const faults = (value: unknown) => {
      try {
        shareHead(value);
      } catch (error) {
        return String(error);
      }

      throw new Error("the head was read");
    };

    expect(faults({ ...head, title: "" })).toContain("title:");
    expect(faults({ ...head, url: "/notes/share/Ab3_x" })).toContain("url: an absolute http or https address");
    expect(faults({ ...head, url: "javascript:alert(1)" })).toContain("url:");
    expect(faults({ ...head, image: "https://elsewhere.example/a.png" })).toContain("image:");
    expect(faults({ ...head, locale: "en-US" })).toContain("locale:");
    expect(faults({ ...head, type: "<script>" })).toContain("type:");
    expect(faults({ ...head, siteName: undefined })).toContain("siteName:");
    expect(faults("<meta>")).toContain("The share head does not keep the contract");
  });
});
