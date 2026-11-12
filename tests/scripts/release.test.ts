import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";

import { LEDGER, releaseFile, sha256, sourceLayer } from "../../scripts/release";
import { LAYER_VERSION } from "../../shared/console-manifest";

import type { Ledger } from "../../scripts/release";

// The release verb and its ledger (the README, "Version").

const root = new URL("../../", import.meta.url);
const releases = new URL("releases/", root);
const manifest = (await Bun.file(new URL("package.json", root)).json()) as { version: string };

describe("the packed files under releases/", () => {
  test("are each named in the ledger by their bytes' sha256, and the ledger names no other", async () => {
    const ledger = (await Bun.file(new URL(LEDGER, releases)).json()) as Ledger;
    const files = readdirSync(releases).filter((name) => name !== LEDGER);
    const hashed = Object.fromEntries(await Promise.all(files.map(async (name) => [name, sha256(await Bun.file(new URL(name, releases)).bytes())])));

    expect(hashed).toEqual(ledger);
  });

  test("stand under the version's name", () => {
    expect(releaseFile("0.4.0-rev.2")).toBe("bmo-ui-0.4.0-rev.2.tgz");
  });
});

describe("the layer read from its source", () => {
  test("names the package's version marked as no release", () => {
    expect(LAYER_VERSION).toBe(sourceLayer(manifest.version));
    expect(LAYER_VERSION).not.toBe(manifest.version);
  });

  test("is refused by packing, which points to the release verb", () => {
    const packing = Bun.spawnSync(["bun", "scripts/prepack.ts"], { cwd: root.pathname, stdout: "pipe", stderr: "pipe" });

    expect(packing.exitCode).toBe(1);
    expect(packing.stderr.toString()).toContain("bun run release");
  });
});
