#!/usr/bin/env bun
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The release verb (the README, "Version"): the one way a packed file comes to exist. It packs the
// committed tree once, from a scratch export, under the version's name in `releases/`, and adds the
// file's sha256 to the ledger beside it.

const SOURCE_MARK = "+source";

/** The layer's version as its source names it: the package's version marked as no release. */
export function sourceLayer(version: string): string {
  return `${version}${SOURCE_MARK}`;
}

/** Whether a tree may be packed: its layer names the package's version, as the verb alone writes it. */
export function packable(layer: string, version: string): boolean {
  return layer === version;
}

/** The name a version's packed file stands under in `releases/`. */
export function releaseFile(version: string): string {
  return `bmo-ui-${version}.tgz`;
}

/** The sha256 of a file's bytes, in lowercase hexadecimal. */
export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// The ledger: each packed file's sha256 under the file's name.
export type Ledger = Record<string, string>;

export const LEDGER = "sha256.json";

class Refused extends Error {}

function run(command: string[], cwd: string): string {
  const done = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "inherit" });

  if (!done.success) throw new Refused(`\`${command.join(" ")}\` failed in ${cwd}`);

  return done.stdout.toString();
}

function runShown(command: string[], cwd: string): void {
  const done = Bun.spawnSync(command, { cwd, stdout: "inherit", stderr: "inherit" });

  if (!done.success) throw new Refused(`\`${command.join(" ")}\` failed in ${cwd}`);
}

async function release(root: string): Promise<string> {
  const releases = join(root, "releases");

  if (run(["git", "status", "--porcelain", "--untracked-files=normal"], root).trim() !== "") {
    throw new Refused("The working tree has changes: commit or set them aside first, so the release is the committed tree.");
  }

  const scratch = await mkdtemp(join(tmpdir(), "bmo-ui-release-"));

  try {
    const tree = join(scratch, "tree");
    const packed = join(scratch, "packed");

    await mkdir(tree);
    await mkdir(packed);
    run(["git", "archive", "--format=tar", `--output=${join(scratch, "tree.tar")}`, "HEAD"], root);
    run(["tar", "-xf", join(scratch, "tree.tar"), "-C", tree], root);

    const { version } = (await Bun.file(join(tree, "package.json")).json()) as { version: string };
    const file = releaseFile(version);
    const ledgerPath = join(releases, LEDGER);
    const ledger = (await Bun.file(ledgerPath).json()) as Ledger;

    if (file in ledger || (await Bun.file(join(releases, file)).exists())) {
      throw new Refused(`${version} has a packed file already; a version is released once. Raise the version first.`);
    }

    const layerPath = join(tree, "shared", "layer.json");
    const layer = (await Bun.file(layerPath).json()) as { layer: string };

    if (layer.layer !== sourceLayer(version)) {
      throw new Refused(`The layer's version file names ${layer.layer} where the package's version is ${version}; it names ${sourceLayer(version)} in the source.`);
    }

    await Bun.write(layerPath, `${JSON.stringify({ ...layer, layer: version }, null, 2)}\n`);
    runShown(["bun", "install", "--frozen-lockfile"], tree);
    runShown(["bun", "pm", "pack", "--destination", packed], tree);

    const target = join(releases, file);

    await copyFile(join(packed, file), target);

    const hash = sha256(await Bun.file(target).bytes());

    await Bun.write(ledgerPath, `${JSON.stringify({ ...ledger, [file]: hash }, null, 2)}\n`);

    return `Released ${file}, sha256 ${hash}`;
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  try {
    process.stdout.write(`${await release(new URL("../", import.meta.url).pathname)}\n`);
  } catch (fault) {
    if (!(fault instanceof Refused)) throw fault;

    process.stderr.write(`${fault.message}\n`);
    process.exit(1);
  }
}
