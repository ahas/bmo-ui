import { beforeEach, describe, expect, test } from "bun:test";

import { relayAddress } from "../../app/domain/relay";

// The address a bundle's screen calls a service at (`docs/console-bundles.md`, "How a bundle mounts").

function hostSays(relayBase?: string): void {
  Object.assign(globalThis, { useAppConfig: () => ({ bmoUi: { relayBase } }) });
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
