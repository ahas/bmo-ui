#!/usr/bin/env bun
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

// The release verb (the README, "Version"): the one way a packed file comes to exist. It packs the
// committed tree once, from a scratch export, under the version's name in `releases/`, and adds the
// file's sha256 to the ledger beside it with the release's bound: the oldest release whose bundles
// still run on it unchanged (`docs/console-bundles.md`, "The layer a bundle is built on"). It is handed
// the bound and the reason for it, and writes the bound and the releases from it up to this one into
// the layer's version file it packs, which the shared module answers a console from.

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

/** What the ledger holds of one packed file: its bytes' sha256, its bound and the reason for that bound. */
export interface LedgerEntry {
  sha256: string;
  bound: string;
  why: string;
}

// The ledger: each packed file's entry under the file's name, in the order the files were released.
export type Ledger = Record<string, LedgerEntry>;

export const LEDGER = "sha256.json";

const PACKED = /^bmo-ui-(.+)\.tgz$/;

/** The version a packed file's name stands for, or null where the name is no packed file's. */
export function versionOf(file: string): string | null {
  return PACKED.exec(file)?.[1] ?? null;
}

/** The versions the ledger names, in the order they were released. */
export function released(ledger: Ledger): string[] {
  return Object.keys(ledger).flatMap((file) => versionOf(file) ?? []);
}

/**
 * The releases a new version attaches bundles of: from its bound up to itself, in the order they were released. A
 * bound that is the version itself attaches its own bundles alone; one the ledger does not name, nothing.
 */
export function rangeFrom(ledger: Ledger, bound: string, version: string): string[] | null {
  if (bound === version) return [version];

  const versions = released(ledger);
  const at = versions.indexOf(bound);

  return at < 0 ? null : [...versions.slice(at), version];
}

/** Why a bound cannot stand for a new version, or null where it can: it is released, and it never falls. */
export function boundRefusal(ledger: Ledger, bound: string, version: string): string | null {
  const range = rangeFrom(ledger, bound, version);

  if (range === null) return `${bound} is no release the ledger names; a bound is a release at or before ${version}.`;

  const last = Object.values(ledger).at(-1);
  const lastRange = last === undefined ? null : rangeFrom(ledger, last.bound, version);

  if (last !== undefined && lastRange !== null && lastRange.length < range.length) {
    return `${bound} is earlier than ${last.bound}, the last release's bound; a bound never falls from one release to the next.`;
  }

  return null;
}

/** The bound and its reason as the verb is handed them, or why it refuses them. */
export function boundAsked(args: string[]): { bound: string; why: string } | string {
  let values: { bound?: string; why?: string };

  try {
    ({ values } = parseArgs({ args, options: { bound: { type: "string" }, why: { type: "string" } }, strict: true }));
  } catch (fault) {
    return (fault as Error).message;
  }

  const bound = values.bound?.trim() ?? "";
  const why = values.why?.trim() ?? "";

  if (bound === "" || why === "") {
    return "Name the release's bound and why: bun run release --bound <the oldest release whose bundles still run on it unchanged> --why <the reason, read off its change against the boundary>.";
  }

  return { bound, why };
}

/** A refusal the verbs print as it stands, ending with a non-zero exit. */
export class Refused extends Error {}

function run(command: string[], cwd: string): string {
  const done = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "inherit" });

  if (!done.success) throw new Refused(`\`${command.join(" ")}\` failed in ${cwd}`);

  return done.stdout.toString();
}

function runShown(command: string[], cwd: string): void {
  const done = Bun.spawnSync(command, { cwd, stdout: "inherit", stderr: "inherit" });

  if (!done.success) throw new Refused(`\`${command.join(" ")}\` failed in ${cwd}`);
}

async function release(root: string, args: string[]): Promise<string> {
  const releases = join(root, "releases");
  const asked = boundAsked(args);

  if (typeof asked === "string") throw new Refused(asked);

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

    const refused = boundRefusal(ledger, asked.bound, version);

    if (refused !== null) throw new Refused(refused);

    const layerPath = join(tree, "shared", "layer.json");
    const layer = (await Bun.file(layerPath).json()) as { layer: string };

    if (layer.layer !== sourceLayer(version)) {
      throw new Refused(`The layer's version file names ${layer.layer} where the package's version is ${version}; it names ${sourceLayer(version)} in the source.`);
    }

    await Bun.write(layerPath, `${JSON.stringify({ ...layer, layer: version, bound: asked.bound, range: rangeFrom(ledger, asked.bound, version) }, null, 2)}\n`);
    runShown(["bun", "install", "--frozen-lockfile"], tree);
    runShown(["bun", "pm", "pack", "--destination", packed], tree);

    const target = join(releases, file);

    await copyFile(join(packed, file), target);

    const entry: LedgerEntry = { sha256: sha256(await Bun.file(target).bytes()), bound: asked.bound, why: asked.why };

    await Bun.write(ledgerPath, `${JSON.stringify({ ...ledger, [file]: entry }, null, 2)}\n`);

    return `Released ${file}, sha256 ${entry.sha256}, bound ${entry.bound}: ${entry.why}`;
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  try {
    process.stdout.write(`${await release(new URL("../", import.meta.url).pathname, Bun.argv.slice(2))}\n`);
  } catch (fault) {
    if (!(fault instanceof Refused)) throw fault;

    process.stderr.write(`${fault.message}\n`);
    process.exit(1);
  }
}
