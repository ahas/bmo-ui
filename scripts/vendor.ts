#!/usr/bin/env bun
import { copyFile, readdir, rm, stat } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

import { applyEdits, modify } from "jsonc-parser";

import { LEDGER, Refused, releaseFile, sha256, versionOf } from "./release";

import type { JSONPath } from "jsonc-parser";

import type { Ledger } from "./release";

// The vendor verb (the README, "Version"): it moves every host manifest under the checkouts it is
// handed onto one release. The checkouts are the caller's; the verb knows no host and finds the
// manifests by reading them. Everything it refuses, it refuses before changing a file.

const PACKAGE = "bmo-ui";
const FILE_SPEC = "file:";
const LOCKFILE = "bun.lock";
const MANIFEST = "package.json";

// The fields a dependency the host installs stands in; a peer pin is raised beside them, never read as one.
const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "optionalDependencies"] as const;
const PEER_FIELD = "peerDependencies";

// Folders a walk never enters: installed packages, and hidden folders (git's, a build's output).
const UNWALKED = "node_modules";

const USAGE = "Name the release and the checkouts: bun run vendor <version> <absolute checkout path>...";

type Dependencies = Record<string, unknown>;
type ManifestJson = Record<string, unknown>;

/** A released file the verb puts into hosts: where it stands and the sha256 the ledger names for it. */
export interface Release {
  version: string;
  file: string;
  path: string;
  sha256: string;
}

/** One dependency of a manifest on a packed file of the layer. */
interface Vendored {
  field: string;
  spec: string;
  path: string;
  version: string;
}

/** A manifest that vendors the layer, as read. */
interface HostManifest {
  path: string;
  text: string;
  json: ManifestJson;
  vendored: Vendored[];
}

/** What the verb is handed: the release's version and the checkouts, each by its absolute path. */
export function vendorAsked(args: string[]): { version: string; checkouts: string[] } | string {
  let positionals: string[];

  try {
    ({ positionals } = parseArgs({ args, allowPositionals: true, strict: true }));
  } catch (fault) {
    return `${(fault as Error).message}\n${USAGE}`;
  }

  const [version, ...checkouts] = positionals;

  if (version === undefined || checkouts.length === 0) return USAGE;

  const relativePath = checkouts.find((checkout) => !isAbsolute(checkout));

  if (relativePath !== undefined) {
    return `${relativePath} is no absolute path; the verb runs from the layer's root, so each checkout is named by its absolute path.`;
  }

  return { version, checkouts };
}

/** The release a version names under `releases/`, or a refusal where it has no file, no ledger line or other bytes. */
export async function releaseOf(releases: string, version: string): Promise<Release> {
  const file = releaseFile(version);
  const path = join(releases, file);
  const ledger = (await Bun.file(join(releases, LEDGER)).json()) as Ledger;
  const entry = ledger[file];

  if (entry === undefined) throw new Refused(`${version} has no line in the ledger; vendor a released version.`);
  if (!(await Bun.file(path).exists())) throw new Refused(`${version} has no packed file under releases/; vendor a released version.`);

  if (sha256(await Bun.file(path).bytes()) !== entry.sha256) {
    throw new Refused(`${file} does not match the sha256 the ledger names for it; it is no file the release verb wrote.`);
  }

  return { version, file, path, sha256: entry.sha256 };
}

function dependencies(json: ManifestJson, field: string): Dependencies | null {
  const held = json[field];

  return typeof held === "object" && held !== null && !Array.isArray(held) ? (held as Dependencies) : null;
}

/** The dependencies of a manifest on a packed file of the layer, each with the file's absolute path. */
function vendoredIn(manifest: string, json: ManifestJson): Vendored[] {
  return DEPENDENCY_FIELDS.flatMap((field) => {
    const spec = dependencies(json, field)?.[PACKAGE];

    if (typeof spec !== "string" || !spec.startsWith(FILE_SPEC)) return [];

    const path = resolve(dirname(manifest), spec.slice(FILE_SPEC.length));
    const version = versionOf(basename(path));

    return version === null ? [] : [{ field, spec, path, version }];
  });
}

function inside(folder: string, path: string): boolean {
  const way = relative(folder, path);

  return way !== "" && !way.startsWith("..") && !isAbsolute(way);
}

/** Every manifest under a folder, outside installed packages and hidden folders. */
async function manifestsUnder(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true });
  const here = entries.some((entry) => entry.isFile() && entry.name === MANIFEST) ? [join(folder, MANIFEST)] : [];
  const below = entries.filter((entry) => entry.isDirectory() && entry.name !== UNWALKED && !entry.name.startsWith("."));

  return [...here, ...(await Promise.all(below.map((entry) => manifestsUnder(join(folder, entry.name))))).flat()];
}

/** The manifests under a checkout that vendor the layer, or a refusal naming the checkout or the file at fault. */
export async function hostManifests(checkout: string): Promise<HostManifest[]> {
  const found = await stat(checkout).catch(() => null);

  if (found === null || !found.isDirectory()) throw new Refused(`${checkout} is no folder.`);

  const read = await Promise.all(
    (await manifestsUnder(checkout)).map(async (path) => {
      const text = await Bun.file(path).text();
      let json: unknown;

      try {
        json = JSON.parse(text);
      } catch {
        return null;
      }

      if (typeof json !== "object" || json === null || Array.isArray(json)) return null;

      return { path, text, json: json as ManifestJson, vendored: vendoredIn(path, json as ManifestJson) };
    })
  );
  const hosts = read.filter((manifest): manifest is HostManifest => manifest !== null && manifest.vendored.length > 0);

  if (hosts.length === 0) throw new Refused(`${checkout} holds no manifest that vendors a packed file of ${PACKAGE}.`);

  for (const host of hosts) {
    const outside = host.vendored.find((dependency) => !inside(checkout, dependency.path));

    if (outside !== undefined) {
      throw new Refused(`${host.path} vendors ${outside.path}, which lies outside its checkout ${checkout}; the verb moves only files inside the checkout.`);
    }
  }

  return hosts;
}

/**
 * The manifest's text with its dependencies on the layer moved onto a release, in its own spelling. Each value is
 * replaced where it stands, so every other byte of the manifest (its indentation, its line breaks, an array kept on
 * one line) is kept as the host wrote it.
 */
function moved(host: HostManifest, release: Release): string {
  const values: [JSONPath, string][] = host.vendored.map((dependency) => [
    [dependency.field, PACKAGE],
    `${dependency.spec.slice(0, dependency.spec.length - basename(dependency.path).length)}${release.file}`
  ]);
  const peers = dependencies(host.json, PEER_FIELD);

  if (peers !== null && host.vendored.some((dependency) => peers[PACKAGE] === dependency.version)) values.push([[PEER_FIELD, PACKAGE], release.version]);

  return values.reduce((text, [path, value]) => applyEdits(text, modify(text, path, value, {})), host.text);
}

/** The folder whose lockfile records a manifest: its own or the nearest above it inside the checkout, or null. */
async function lockfileFolder(checkout: string, manifest: string): Promise<string | null> {
  for (let folder = dirname(manifest); folder === checkout || inside(checkout, folder); folder = dirname(folder)) {
    if (await Bun.file(join(folder, LOCKFILE)).exists()) return folder;
  }

  return null;
}

function writeLockfile(folder: string): void {
  const done = Bun.spawnSync(["bun", "install", "--lockfile-only", "--ignore-scripts"], { cwd: folder, stdout: "pipe", stderr: "pipe" });

  if (!done.success) {
    throw new Refused(`\`bun install --lockfile-only\` failed in ${folder}, after its manifests were moved:\n${done.stderr.toString()}`);
  }
}

/** Moves one checkout's manifests onto a release and says, per manifest, what changed. */
async function vendorCheckout(checkout: string, hosts: HostManifest[], release: Release): Promise<string[]> {
  const lines: string[] = [];
  const lockfiles = new Set<string>();
  const stale = new Set<string>();
  const named = (path: string) => relative(checkout, path);

  for (const host of hosts) {
    const moving: HostManifest = { ...host, vendored: host.vendored.filter((dependency) => dependency.version !== release.version) };

    if (moving.vendored.length === 0) {
      lines.push(`  ${named(host.path)}: already on ${release.version}, left as it stands`);
      continue;
    }

    const said: string[] = [];

    for (const folder of new Set(moving.vendored.map((dependency) => dirname(dependency.path)))) {
      const copy = join(folder, release.file);

      await copyFile(release.path, copy);

      if (sha256(await Bun.file(copy).bytes()) !== release.sha256) {
        throw new Refused(`${copy} does not match the sha256 the ledger names after copying; nothing else of ${named(host.path)} was changed.`);
      }

      said.push(`copied ${named(copy)}, its sha256 matching the ledger`);
    }

    await Bun.write(host.path, moved(moving, release));

    const fields = [...new Set(moving.vendored.map((dependency) => dependency.field))];
    const from = [...new Set(moving.vendored.map((dependency) => dependency.version))];

    said.unshift(`${from.join(", ")} to ${release.version} in ${fields.join(", ")}`);

    for (const dependency of moving.vendored) {
      stale.add(dependency.path);
      said.push(`removed ${named(dependency.path)}`);
    }

    const lockfile = await lockfileFolder(checkout, host.path);

    if (lockfile === null) {
      said.push(`no ${LOCKFILE} stands beside it or above it in the checkout, so none was written`);
    } else {
      lockfiles.add(lockfile);
      said.push(`wrote ${named(join(lockfile, LOCKFILE)) || LOCKFILE} again`);
    }

    lines.push(`  ${named(host.path)}: ${[...new Set(said)].join("; ")}`);
  }

  for (const path of stale) await rm(path, { force: true });
  for (const folder of lockfiles) writeLockfile(folder);

  return [checkout, ...lines];
}

/**
 * Puts a release into every manifest under the checkouts that vendors the layer, and says what it changed. It refuses
 * a version that is not released and a checkout holding no such manifest before it changes anything, and commits nothing.
 */
export async function vendor(releases: string, version: string, checkouts: string[]): Promise<string> {
  const release = await releaseOf(releases, version);
  const planned = await Promise.all(checkouts.map(async (checkout) => ({ checkout: resolve(checkout), hosts: await hostManifests(resolve(checkout)) })));
  const said: string[] = [];

  for (const { checkout, hosts } of planned) said.push(...(await vendorCheckout(checkout, hosts, release)));

  return said.join("\n");
}

if (import.meta.main) {
  try {
    const asked = vendorAsked(Bun.argv.slice(2));

    if (typeof asked === "string") throw new Refused(asked);

    process.stdout.write(`${await vendor(join(new URL("../", import.meta.url).pathname, "releases"), asked.version, asked.checkouts)}\n`);
  } catch (fault) {
    if (!(fault instanceof Refused)) throw fault;

    process.stderr.write(`${fault.message}\n`);
    process.exit(1);
  }
}
