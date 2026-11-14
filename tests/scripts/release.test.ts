import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";

import { LEDGER, boundAsked, boundRefusal, rangeFrom, released, releaseFile, sha256, sourceLayer, versionOf } from "../../scripts/release";
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
