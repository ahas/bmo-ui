import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";

import { LEDGER, THIS_PACK, boundAsked, boundRefusal, nightly, packVersion, platformDay, rangeFrom, released, releaseFile, sha256, sourceLayer, versionOf } from "../../scripts/release";
import { LAYER_BOUND, LAYER_RANGE, LAYER_VERSION } from "../../shared/console-manifest";

import type { Ledger } from "../../scripts/release";

// The release verb and its ledger (the README, "Version"), and the bound every release carries
// (`docs/console-bundles.md`, "The layer a bundle is built on").

const root = new URL("../../", import.meta.url);
const releases = new URL("releases/", root);
const manifest = (await Bun.file(new URL("package.json", root)).json()) as { version: string };
const ledger = (await Bun.file(new URL(LEDGER, releases)).json()) as Ledger;

function entry(bound: string): Ledger[string] {
  return { sha256: "0".repeat(64), bound, why: "a reason" };
}

// Three releases in the order they went out, the second keeping the first's bound and the third raising it.
const standing: Ledger = {
  "bmo-ui-1.0.0-rev.1.tgz": entry("1.0.0-rev.1"),
  "bmo-ui-1.0.0-rev.2.tgz": entry("1.0.0-rev.1"),
  "bmo-ui-1.0.0-rev.3.tgz": entry("1.0.0-rev.3")
};

describe("the packed files under releases/", () => {
  test("are each named in the ledger by their bytes' sha256, and the ledger names no other", async () => {
    const files = readdirSync(releases).filter((name) => name !== LEDGER);
    const hashed = Object.fromEntries(await Promise.all(files.map(async (name) => [name, sha256(await Bun.file(new URL(name, releases)).bytes())])));

    expect(hashed).toEqual(Object.fromEntries(Object.entries(ledger).map(([name, held]) => [name, held.sha256])));
  });

  test("each carry a bound the ledger names at or before them, with its reason, and no bound falls", () => {
    let floor = 0;

    for (const [file, held] of Object.entries(ledger)) {
      const version = versionOf(file)!;
      const versions = released(ledger);
      const at = versions.indexOf(held.bound);

      expect([file, held.why.trim().length > 0]).toEqual([file, true]);
      expect([file, at >= 0 && at <= versions.indexOf(version)]).toEqual([file, true]);
      expect([file, at >= floor]).toEqual([file, true]);
      floor = at;
    }
  });

  test("stand under the version's name, which the name gives back", () => {
    expect(releaseFile("0.4.0-rev.2")).toBe("bmo-ui-0.4.0-rev.2.tgz");
    expect(versionOf(releaseFile("0.4.0-rev.2"))).toBe("0.4.0-rev.2");
    expect(versionOf(LEDGER)).toBeNull();
  });
});

describe("the version a pack takes", () => {
  test("is the package's version where the committed tree is that release's tagged commit", () => {
    expect(packVersion("1.0.0", ["v1.0.0"], "20261124", standing)).toBe("1.0.0");
    expect(packVersion("1.0.0", ["v0.9.0", "v1.0.0", "other"], "20261124", standing)).toBe("1.0.0");
  });

  test("is the day's nightly, the minor above the last release, on a commit no release tag names", () => {
    expect(packVersion("1.0.0", [], "20261124", standing)).toBe("1.1.0-nightly.20261124");
    expect(packVersion("1.0.0", ["v0.9.0"], "20261124", standing)).toBe("1.1.0-nightly.20261124");
    expect(nightly("1.2.3", "20270102")).toBe("1.3.0-nightly.20270102");
    expect(nightly("0.1.0-rev.73", "20261124")).toBe("0.2.0-nightly.20261124");
  });

  test("counts a second pack of the same day from 2", () => {
    const once: Ledger = { ...standing, [releaseFile("1.1.0-nightly.20261124")]: entry("1.0.0-rev.3") };
    const twice: Ledger = { ...once, [releaseFile("1.1.0-nightly.20261124.2")]: entry("1.0.0-rev.3") };

    expect(packVersion("1.0.0", [], "20261124", once)).toBe("1.1.0-nightly.20261124.2");
    expect(packVersion("1.0.0", [], "20261124", twice)).toBe("1.1.0-nightly.20261124.3");
    expect(packVersion("1.0.0", [], "20261125", twice)).toBe("1.1.0-nightly.20261125");
  });

  test("orders every nightly after the last release and before the release it leads to", () => {
    const ordered = ["1.0.0", "1.1.0-nightly.20261124", "1.1.0-nightly.20261124.2", "1.1.0-nightly.20261125", "1.1.0"];

    expect([...ordered].reverse().sort(Bun.semver.order)).toEqual(ordered);
  });

  test("names its day in the platform's time zone", () => {
    expect(platformDay(new Date("2026-11-23T14:59:59Z"))).toBe("20261123");
    expect(platformDay(new Date("2026-11-23T15:00:00Z"))).toBe("20261124");
  });

  test("is refused where the package's version is no semantic version", () => {
    expect(() => nightly("next", "20261124")).toThrow("no semantic version");
  });
});

describe("a release's bound", () => {
  test("attaches the releases from it up to the new version, in the order they went out", () => {
    expect(rangeFrom(standing, "1.0.0-rev.3", "1.0.0-rev.4")).toEqual(["1.0.0-rev.3", "1.0.0-rev.4"]);
    expect(rangeFrom(standing, "1.0.0-rev.4", "1.0.0-rev.4")).toEqual(["1.0.0-rev.4"]);
    expect(rangeFrom(standing, "1.0.0-rev.9", "1.0.0-rev.4")).toBeNull();
  });

  test("stands where it keeps or raises the last release's bound, and is refused where it falls or is no release", () => {
    expect(boundRefusal(standing, "1.0.0-rev.3", "1.0.0-rev.4")).toBeNull();
    expect(boundRefusal(standing, "1.0.0-rev.4", "1.0.0-rev.4")).toBeNull();
    expect(boundRefusal(standing, "1.0.0-rev.2", "1.0.0-rev.4")).toContain("never falls");
    expect(boundRefusal(standing, "1.0.0-rev.9", "1.0.0-rev.4")).toContain("no release the ledger names");
  });

  test("is asked for with its reason, and a release naming either not at all is refused", () => {
    expect(boundAsked(["--bound", "1.0.0-rev.3", "--why", "adds only"])).toEqual({ bound: "1.0.0-rev.3", why: "adds only" });
    expect(boundAsked([])).toContain("--bound");
    expect(boundAsked(["--bound", "1.0.0-rev.3"])).toContain("--why");
    expect(boundAsked(["--bound", "1.0.0-rev.3", "--why", " "])).toContain("--why");
    expect(boundAsked(["--bound", THIS_PACK, "--why", "raises it"])).toEqual({ bound: THIS_PACK, why: "raises it" });
    expect(boundAsked([])).toContain(THIS_PACK);
  });

  test("is asked for by the verb before it reads anything else", () => {
    const releasing = Bun.spawnSync(["bun", "scripts/release.ts"], { cwd: root.pathname, stdout: "pipe", stderr: "pipe" });

    expect(releasing.exitCode).toBe(1);
    expect(releasing.stderr.toString()).toContain("bun run release --bound");
  });
});

describe("the layer read from its source", () => {
  test("names the package's version marked as no release, its own bound and its own range", () => {
    expect(LAYER_VERSION).toBe(sourceLayer(manifest.version));
    expect(LAYER_VERSION).not.toBe(manifest.version);
    expect(LAYER_BOUND).toBe(LAYER_VERSION);
    expect(LAYER_RANGE).toEqual([LAYER_VERSION]);
  });

  test("is refused by packing, which points to the release verb", () => {
    const packing = Bun.spawnSync(["bun", "scripts/prepack.ts"], { cwd: root.pathname, stdout: "pipe", stderr: "pipe" });

    expect(packing.exitCode).toBe(1);
    expect(packing.stderr.toString()).toContain("bun run release");
  });
});
