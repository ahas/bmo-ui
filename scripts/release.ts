#!/usr/bin/env bun
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { compare, parse } from "semver";

// The release verb (the README, "Version"): the one way a packed file comes to exist. It packs the
// committed tree once, from a scratch export, under the pack's version in `releases/`, and adds the
// file's sha256 to the ledger beside it with the pack's bound: the oldest pack whose bundles still run
// on it unchanged (`docs/console-bundles.md`, "The layer a bundle is built on"). The pack's version is
// the set's release where the committed tree is that release's tagged commit, else the day's nightly, read off the
// tags alone.
// It is handed the bound and the reason for it, and writes the bound and the packs from it up to this
// one into the layer's version file it packs, which the shared module answers a console from.

const SOURCE_MARK = "+source";

/** The layer's version as its source names it: the package's version marked as no release. */
export function sourceLayer(version: string): string {
  return `${version}${SOURCE_MARK}`;
}

/** Whether a tree may be packed: its layer names the package's version, as the verb alone writes it. */
export function packable(layer: string, version: string): boolean {
  return layer === version;
}

/** The time zone the platform's days are counted in, which names a nightly's day. */
export const PLATFORM_TIME_ZONE = "Asia/Seoul";

/** The bound word that names the pack being made, whose version the caller cannot know before the verb runs. */
export const THIS_PACK = "this";

/** The day a moment falls on in the platform's time zone, written `YYYYMMDD`. */
export function platformDay(at: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: PLATFORM_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
  const part = (type: string): string => parts.find((one) => one.type === type)?.value ?? "";

  return `${part("year")}${part("month")}${part("day")}`;
}

/**
 * The version main's nightly leads to from the set's last release, the package's version: the minor above a stable
 * release, a beta or a release candidate, whose first beta cut the release line's branch; the alpha's own version
 * while an alpha is the last release; and `1.0.0`, the set's first release, before it, from a version of major 0, the
 * base or one of its `0.1.0-rev.<n>` revisions.
 */
export function leadsTo(released: string): string {
  const last = parse(released);

  if (last === null) throw new Refused(`${released} is no semantic version; the package's version names the set's last release.`);

  if (last.major === 0) return "1.0.0";

  const minorAbove = `${last.major}.${last.minor + 1}.0`;
  const kind = last.prerelease[0];

  if (kind === undefined) return minorAbove;
  if (kind === "alpha") return `${last.major}.${last.minor}.${last.patch}`;
  if (kind === "beta" || kind === "rc" || kind === "rev") return minorAbove;

  throw new Refused(`${released} is no release the set makes; the package's version names a stable release, an alpha, a beta, a release candidate or a 0.1.0-rev revision.`);
}

/**
 * The set's last release a commit reaches, read off the tags it reaches: the newest `v<version>` of major 1 or above
 * that is a stable release, an alpha, a beta or a release candidate, an upstream's or any other tag counting for
 * nothing; `0.0.0` before the set's first release, which main leads to `1.0.0` from.
 */
export function lastRelease(tags: string[]): string {
  const releases = tags.flatMap((tag) => {
    const read = parse(tag.trim().replace(/^v/, ""));
    const kind = read?.prerelease[0];

    if (read === null || !tag.trim().startsWith("v") || read.major < 1 || read.build.length > 0) return [];
    if (kind !== undefined && kind !== "alpha" && kind !== "beta" && kind !== "rc") return [];

    return [read.version];
  });

  return releases.sort(compare).at(-1) ?? "0.0.0";
}

/** The nightly a day's first pack is named for: the version main leads to, then the day. */
export function nightly(released: string, day: string): string {
  return `${leadsTo(released)}-0.nightly.${day}`;
}

/**
 * A version read in the present nightly form: a pack named in the earlier form, `X.Y.Z-nightly.<YYYYMMDD>[.<n>]`,
 * stands as the same day's pack of the present form, `X.Y.Z-0.nightly.<YYYYMMDD>[.<n>]`; every other version as it
 * is. Its file keeps the name it was packed under.
 */
export function presentForm(version: string): string {
  const read = parse(version);

  if (read === null || read.prerelease[0] !== "nightly") return version;

  return `${read.major}.${read.minor}.${read.patch}-0.${read.prerelease.join(".")}`;
}

/** Whether a version is a day's nightly, in either form. */
export function isNightly(version: string): boolean {
  const read = parse(presentForm(version));

  return read !== null && read.prerelease[0] === 0 && read.prerelease[1] === "nightly";
}

/** The order of two packs' versions: semver's, each read in the present nightly form. */
export function packOrder(left: string, right: string): number {
  return compare(presentForm(left), presentForm(right));
}

/**
 * The version the committed tree packs under, from `declared`, the set's last release the tree reaches: that
 * release where the tree is its commit, tagged `v<version>`, else the day's nightly, with `.<n>` from 2 for each
 * later pack of the same day in either nightly form.
 */
export function packVersion(declared: string, tags: string[], day: string, ledger: Ledger): string {
  if (tags.includes(`v${declared}`)) return declared;

  const first = nightly(declared, day);
  const packed = new Set(released(ledger).map(presentForm));
  let version = first;

  for (let n = 2; packed.has(version); n += 1) version = `${first}.${n}`;

  return version;
}

/** Why a nightly cannot be packed, or null where it can: it stands after the last nightly the ledger names. */
export function nightlyRefusal(ledger: Ledger, version: string): string | null {
  if (!isNightly(version)) return null;

  const last = released(ledger).filter(isNightly).at(-1);

  if (last === undefined || packOrder(version, last) > 0) return null;

  return `${version} does not stand after ${last}, the last nightly packed; a nightly is later than every nightly before it.`;
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
    return `Name the pack's bound and why: bun run release --bound <the oldest pack whose bundles still run on it unchanged, or ${THIS_PACK} for the pack being made> --why <the reason, read off its change against the boundary>.`;
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

    const manifestPath = join(tree, "package.json");
    const manifest = (await Bun.file(manifestPath).json()) as { version: string };
    // The version is read off the tags alone; the committed manifest's is a placeholder that never moves.
    const placeholder = manifest.version;
    const declared = lastRelease(run(["git", "tag", "--merged", "HEAD", "--list", "v*"], root).split("\n"));
    const ledgerPath = join(releases, LEDGER);
    const ledger = (await Bun.file(ledgerPath).json()) as Ledger;
    const tags = run(["git", "tag", "--points-at", "HEAD"], root).split("\n").map((tag) => tag.trim());
    const version = packVersion(declared, tags, platformDay(new Date()), ledger);
    const file = releaseFile(version);

    if (file in ledger || (await Bun.file(join(releases, file)).exists())) {
      throw new Refused(`${version} has a packed file already; a release is packed once.`);
    }

    const behind = nightlyRefusal(ledger, version);

    if (behind !== null) throw new Refused(behind);

    const bound = asked.bound === THIS_PACK ? version : asked.bound;
    const refused = boundRefusal(ledger, bound, version);

    if (refused !== null) throw new Refused(refused);

    const layerPath = join(tree, "shared", "layer.json");
    const layer = (await Bun.file(layerPath).json()) as { layer: string };

    if (layer.layer !== sourceLayer(placeholder)) {
      throw new Refused(`The layer's version file names ${layer.layer} where the package's version is ${placeholder}; it names ${sourceLayer(placeholder)} in the source.`);
    }

    await Bun.write(layerPath, `${JSON.stringify({ ...layer, layer: version, bound, range: rangeFrom(ledger, bound, version) }, null, 2)}\n`);
    runShown(["bun", "install", "--frozen-lockfile"], tree);
    // The pack's own version stands in the export alone, where the manifest and the version file it packs both
    // name it; the committed tree keeps the last release's.
    await Bun.write(manifestPath, `${JSON.stringify({ ...manifest, version }, null, 2)}\n`);
    runShown(["bun", "pm", "pack", "--destination", packed], tree);

    const target = join(releases, file);

    await copyFile(join(packed, file), target);

    const entry: LedgerEntry = { sha256: sha256(await Bun.file(target).bytes()), bound, why: asked.why };

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
