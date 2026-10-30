import { describe, expect, test } from "bun:test";
import { createApp, defineComponent } from "vue";

import { createVolume, FULL_VOLUME, muteToggled, slid, UNMUTED_LEVEL, useVolume, VOLUME_KEY } from "~/domain/volume";

import type { Volume } from "~/domain/volume";

// How loud the players on a page play (`docs/components.md`, "Skeletons and loading"): the mute, the
// slider, the one volume every player stands on, and the storage it is kept in.

function memory(): { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void; held: Map<string, string> } {
  const held = new Map<string, string>();

  return { getItem: (key) => held.get(key) ?? null, setItem: (key, value) => void held.set(key, value), held };
}

// A page's own storage, empty.
function fresh(): () => ReturnType<typeof memory> {
  const storage = memory();

  return () => storage;
}

const refused = (): never => {
  throw new Error("storage refused");
};

// A player mounted as a screen mounts it, standing on the volume it is handed.
function mountPlayer(volume: Volume): { stood: () => Volume; unmount: () => void } {
  let stood: Volume | null = null;
  const app = createApp(
    defineComponent({
      setup() {
        stood = useVolume(volume);

        return () => null;
      }
    })
  );

  app.mount(document.createElement("div"));

  return { stood: () => stood!, unmount: () => app.unmount() };
}

describe("the mute", () => {
  test("mutes keeping the level, and unmutes back to it", () => {
    const muted = muteToggled({ level: 0.3, muted: false });

    expect(muted).toEqual({ level: 0.3, muted: true });
    expect(muteToggled(muted)).toEqual({ level: 0.3, muted: false });
  });

  test("unmuting a level of nothing comes back to half", () => {
    expect(muteToggled({ level: 0, muted: true })).toEqual({ level: UNMUTED_LEVEL, muted: false });
  });

  test("toggles a page's volume, and the slider shows nothing while it is muted", () => {
    const volume = createVolume(fresh());

    volume.slide(0.6);
    volume.toggleMute();

    expect(volume.loudness.value).toEqual({ level: 0.6, muted: true });
    expect(volume.heard.value).toBe(0);

    volume.toggleMute();

    expect(volume.heard.value).toBe(0.6);
  });
});

describe("the slider", () => {
  test("sets the level, held between nothing and full", () => {
    expect(slid(0.4)).toEqual({ level: 0.4, muted: false });
    expect(slid(1.5)).toEqual({ level: 1, muted: false });
  });

  test("mutes at nothing and unmutes above it", () => {
    const volume = createVolume(fresh());

    volume.slide(0);

    expect(volume.loudness.value).toEqual({ level: 0, muted: true });

    volume.slide(0.25);

    expect(volume.loudness.value).toEqual({ level: 0.25, muted: false });
    expect(volume.heard.value).toBe(0.25);
  });
});

describe("the kept volume", () => {
  test("is written as it moves and stood on a player as it mounts", () => {
    const storage = memory();

    createVolume(() => storage).slide(0.35);

    const page = createVolume(() => storage);

    expect(page.loudness.value).toEqual(FULL_VOLUME);

    const { stood, unmount } = mountPlayer(page);

    expect(stood().loudness.value).toEqual({ level: 0.35, muted: false });
    unmount();
  });

  test("is one for the page: a change on one player moves the other", () => {
    const page = createVolume(fresh());
    const [first, second] = [mountPlayer(page), mountPlayer(page)];

    first.stood().slide(0.2);

    expect(second.stood().loudness.value).toEqual({ level: 0.2, muted: false });
    first.unmount();
    second.unmount();
  });

  test("leaves the players at full where storage holds nothing, or nothing a volume reads from", () => {
    for (const kept of [null, "not json", '{"level":"loud","muted":false}', '{"level":0.5}', "[]"]) {
      const storage = memory();

      if (kept !== null) {
        storage.held.set(VOLUME_KEY, kept);
      }

      const { stood, unmount } = mountPlayer(createVolume(() => storage));

      expect(stood().loudness.value).toEqual(FULL_VOLUME);
      unmount();
    }
  });

  test("where storage is refused, starts at full and holds the reader's choice for the page alone", () => {
    const page = createVolume(refused);
    const { stood, unmount } = mountPlayer(page);

    expect(stood().loudness.value).toEqual(FULL_VOLUME);

    stood().slide(0.4);
    mountPlayer(page).unmount();

    expect(page.loudness.value).toEqual({ level: 0.4, muted: false });
    unmount();
  });
});
