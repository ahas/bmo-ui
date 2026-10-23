import { beforeEach, describe, expect, test } from "bun:test";

import { relayAddress, relaySocketAddress } from "../../app/domain/relay";

// The address a bundle's screen calls a service at (`docs/console-bundles.md`, "How a bundle mounts").

function hostSays(relayBase?: string, baseURL = "/"): void {
  Object.assign(globalThis, {
    useAppConfig: () => ({ bmoUi: { relayBase } }),
    useRuntimeConfig: () => ({ app: { baseURL } })
  });
}

function pageAt(address: string): void {
  (globalThis as unknown as { happyDOM: { setURL: (url: string) => void } }).happyDOM.setURL(address);
}

beforeEach(() => hostSays("/relay"));

describe("a service's address", () => {
  test("is the host's relay base, the service's name, then the path", () => {
    expect(relayAddress("notes", "/notes/12")).toBe("/relay/notes/notes/12");
    expect(relayAddress("notes", "events?after=4")).toBe("/relay/notes/events?after=4");
    expect(relayAddress("notes", "?limit=20")).toBe("/relay/notes?limit=20");
    expect(relayAddress("notes")).toBe("/relay/notes");
  });

  test("takes the base with or without its closing slash", () => {
    hostSays("/relay/");

    expect(relayAddress("notes", "/health")).toBe("/relay/notes/health");
  });

  test("stands at the root where the host states no base", () => {
    hostSays(undefined);

    expect(relayAddress("notes", "/health")).toBe("/notes/health");
  });
});

describe("under the app's base path", () => {
  test("the address starts with the base the app is served under", () => {
    hostSays("/relay", "/console/");

    expect(relayAddress("notes", "/notes/12/picture")).toBe("/console/relay/notes/notes/12/picture");
    expect(relayAddress("notes", "?limit=20")).toBe("/console/relay/notes?limit=20");
  });

  test("takes the base with or without its closing slash", () => {
    hostSays("/relay", "/console");

    expect(relayAddress("notes", "/health")).toBe("/console/relay/notes/health");
  });

  test("stands at the base where the host states no relay base", () => {
    hostSays(undefined, "/console/");

    expect(relayAddress("notes", "/health")).toBe("/console/notes/health");
  });

  test("is not given the base twice where the relay base already holds it", () => {
    hostSays("/console/relay", "/console/");

    expect(relayAddress("notes", "/health")).toBe("/console/relay/notes/health");
  });

  test("is given it where the relay base only starts with the same letters", () => {
    hostSays("/consoles", "/console/");

    expect(relayAddress("notes", "/health")).toBe("/console/consoles/notes/health");
  });
});

describe("a service's socket address", () => {
  test("is the relay address over the page's origin, in the socket scheme matching the page's", () => {
    hostSays("/relay", "/console/");
    pageAt("https://console.example.test/console/notes");

    expect(relaySocketAddress("notes", "/live?from=3")).toBe("wss://console.example.test/console/relay/notes/live?from=3");

    pageAt("http://console.example.test:3000/console/");

    expect(relaySocketAddress("notes", "/live")).toBe("ws://console.example.test:3000/console/relay/notes/live");
  });

  test("stands at the page's root where the app has no base path", () => {
    pageAt("https://console.example.test/notes");

    expect(relaySocketAddress("notes", "/live")).toBe("wss://console.example.test/relay/notes/live");
  });
});
