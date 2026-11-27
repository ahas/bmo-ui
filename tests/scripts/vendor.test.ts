import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { LEDGER, Refused, releaseFile, sha256 } from "../../scripts/release";
import { vendor, vendorAsked } from "../../scripts/vendor";

import type { Ledger } from "../../scripts/release";

// The vendor verb (the README, "Version"), over checkouts and a releases folder made for each test.

const root = new URL("../../", import.meta.url).pathname;
const FROM = "1.0.0-rev.1";
const TO = "1.0.0-rev.2";

let scratch = "";
let cache = "";

beforeAll(async () => {
  // Bun keeps every tarball it reads in its cache; this file's cache is its own and goes with it.
  cache = await mkdtemp(join(tmpdir(), "bmo-ui-vendor-cache-"));
  process.env.BUN_INSTALL_CACHE_DIR = cache;
  // A folder made under the temporary folder is a git work tree only where a test makes it one.
  process.env.GIT_CEILING_DIRECTORIES = await realpath(tmpdir());
});

afterEach(async () => {
  if (scratch !== "") await rm(scratch, { recursive: true, force: true });
  scratch = "";
});

afterAll(async () => {
  delete process.env.BUN_INSTALL_CACHE_DIR;
  delete process.env.GIT_CEILING_DIRECTORIES;
  await rm(cache, { recursive: true, force: true });
});

function run(command: string[], cwd: string): void {
  const done = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });

  if (!done.success) throw new Error(`${command.join(" ")} failed: ${done.stderr.toString()}`);
}

function git(args: string[], cwd: string): string {
  const done = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });

  if (!done.success) throw new Error(`git ${args.join(" ")} failed: ${done.stderr.toString()}`);

  return done.stdout.toString();
}

/** A checkout under the scratch folder: a git work tree, as every host checkout is. */
async function checkoutAt(name: string): Promise<string> {
  const checkout = join(scratch, name);

  await mkdir(checkout, { recursive: true });
  git(["init", "--quiet"], checkout);

  return checkout;
}

/** Commits everything a checkout holds, so what the verb stages afterwards reads against it. */
function commitAll(checkout: string): void {
  git(["add", "--all"], checkout);
  git(["-c", "user.name=tester", "-c", "user.email=dev@ahas.io", "-c", "commit.gpgsign=false", "commit", "--quiet", "--no-verify", "--message", "Host"], checkout);
}

/** A packed file of the layer at a version, holding its manifest alone. */
async function pack(folder: string, version: string): Promise<string> {
  const tree = await mkdtemp(join(scratch, "tree-"));
  const path = join(folder, releaseFile(version));

  await Bun.write(join(tree, "package", "package.json"), JSON.stringify({ name: "bmo-ui", version }));
  await mkdir(folder, { recursive: true });
  run(["tar", "-czf", path, "-C", tree, "package"], scratch);

  return path;
}

/** A releases folder holding the versions, each named in the ledger by its bytes' sha256. */
async function releasesOf(...versions: string[]): Promise<string> {
  const releases = join(scratch, "releases");
  const ledger: Ledger = {};

  for (const version of versions) {
    const path = await pack(releases, version);

    ledger[releaseFile(version)] = { sha256: sha256(await Bun.file(path).bytes()), bound: version, why: "a reason" };
  }

  await Bun.write(join(releases, LEDGER), JSON.stringify(ledger));

  return releases;
}

/** A host manifest vendoring a version under a checkout, with its lockfile written by the package manager. */
async function host(checkout: string, folder: string, manifest: Record<string, unknown>, version: string, indent = 2): Promise<string> {
  const path = join(checkout, folder, "package.json");

  await pack(join(dirname(path), "vendor"), version);
  await Bun.write(path, `${JSON.stringify(manifest, null, indent)}\n`);
  run(["bun", "install", "--lockfile-only", "--ignore-scripts"], dirname(path));

  return path;
}

async function json(path: string): Promise<Record<string, Record<string, string>>> {
  return (await Bun.file(path).json()) as Record<string, Record<string, string>>;
}

async function refusal(work: Promise<unknown>): Promise<string> {
  const fault = await work.then(
    () => null,
    (caught: unknown) => caught
  );

  expect(fault).toBeInstanceOf(Refused);

  return (fault as Refused).message;
}

describe("the vendor verb", () => {
  test("moves both manifests of a checkout from one release to another, with their files and lockfiles", async () => {
    scratch = await mkdtemp(join(tmpdir(), "bmo-ui-vendor-"));

    const releases = await releasesOf(FROM, TO);
    const checkout = await checkoutAt("checkout");
    const app = await host(checkout, ".", { name: "first-app", private: true, dependencies: { "bmo-ui": `file:vendor/${releaseFile(FROM)}` } }, FROM);
    const panel = await host(
      checkout,
      "tools/panel",
      { name: "panel", private: true, peerDependencies: { "bmo-ui": FROM }, devDependencies: { "bmo-ui": `file:./vendor/${releaseFile(FROM)}` } },
      FROM,
      4
    );

    const said = await vendor(releases, TO, [checkout]);

    expect((await json(app)).dependencies).toEqual({ "bmo-ui": `file:vendor/${releaseFile(TO)}` });
    expect(await json(panel)).toMatchObject({ peerDependencies: { "bmo-ui": TO }, devDependencies: { "bmo-ui": `file:./vendor/${releaseFile(TO)}` } });
    expect(await Bun.file(panel).text()).toStartWith('{\n    "name"');

    for (const manifest of [app, panel]) {
      const vendored = join(dirname(manifest), "vendor");
      const lockfile = await Bun.file(join(dirname(manifest), "bun.lock")).text();

      expect(await Bun.file(join(vendored, releaseFile(FROM))).exists()).toBe(false);
      expect(sha256(await Bun.file(join(vendored, releaseFile(TO))).bytes())).toBe(sha256(await Bun.file(join(releases, releaseFile(TO))).bytes()));
      expect(lockfile).toContain(`vendor/${releaseFile(TO)}", {}, "sha512-`);
      expect(lockfile).not.toContain(releaseFile(FROM));
    }

    expect(said.split("\n")).toEqual([
      checkout,
      `  package.json: ${FROM} to ${TO} in dependencies; copied vendor/${releaseFile(TO)}, its sha256 matching the ledger; removed vendor/${releaseFile(FROM)}; wrote bun.lock again`,
      `  tools/panel/package.json: ${FROM} to ${TO} in devDependencies; copied tools/panel/vendor/${releaseFile(TO)}, its sha256 matching the ledger; removed tools/panel/vendor/${releaseFile(FROM)}; wrote tools/panel/bun.lock again`,
      `  staged in git: vendor/${releaseFile(TO)}, package.json, tools/panel/vendor/${releaseFile(TO)}, tools/panel/package.json, bun.lock, tools/panel/bun.lock, and the removal of vendor/${releaseFile(FROM)}, tools/panel/vendor/${releaseFile(FROM)}`
    ]);
  });

  test("stages the new packed file, the manifest, the lockfile and the old file's removal, leaving nothing unstaged", async () => {
    scratch = await mkdtemp(join(tmpdir(), "bmo-ui-vendor-"));

    const releases = await releasesOf(FROM, TO);
    const checkout = await checkoutAt("checkout");

    await host(checkout, ".", { name: "first-app", private: true, dependencies: { "bmo-ui": `file:vendor/${releaseFile(FROM)}` } }, FROM);
    commitAll(checkout);
    await vendor(releases, TO, [checkout]);

    expect(git(["status", "--porcelain", "--no-renames", "--untracked-files=all"], checkout).trimEnd().split("\n")).toEqual([
      "M  bun.lock",
      "M  package.json",
      `D  vendor/${releaseFile(FROM)}`,
      `A  vendor/${releaseFile(TO)}`
    ]);
  });

  test("changes the dependency's values alone, keeping a one-line array and every other byte as the host laid them out", async () => {
    scratch = await mkdtemp(join(tmpdir(), "bmo-ui-vendor-"));

    const releases = await releasesOf(FROM, TO);
    const checkout = await checkoutAt("checkout");
    const app = await host(checkout, ".", { name: "first-app", private: true, dependencies: { "bmo-ui": `file:vendor/${releaseFile(FROM)}` } }, FROM);
    const laidOut = (version: string) =>
      `{\n  "name": "first-app",\n  "private": true,\n  "files": ["app", "docs"],\n  "peerDependencies": { "bmo-ui": "${version}" },\n  "dependencies": {\n    "bmo-ui": "file:vendor/${releaseFile(version)}"\n  }\n}\n`;

    await Bun.write(app, laidOut(FROM));
    await vendor(releases, TO, [checkout]);

    expect(await Bun.file(app).text()).toBe(laidOut(TO));
  });

  test("leaves a manifest already on the release as it stands", async () => {
    scratch = await mkdtemp(join(tmpdir(), "bmo-ui-vendor-"));

    const releases = await releasesOf(FROM, TO);
    const checkout = await checkoutAt("checkout");
    const app = await host(checkout, ".", { name: "first-app", private: true, dependencies: { "bmo-ui": `file:vendor/${releaseFile(TO)}` } }, TO);
    const before = { manifest: await Bun.file(app).text(), lockfile: await Bun.file(join(checkout, "bun.lock")).text() };

    expect(await vendor(releases, TO, [checkout])).toBe(`${checkout}\n  package.json: already on ${TO}, left as it stands`);
    expect({ manifest: await Bun.file(app).text(), lockfile: await Bun.file(join(checkout, "bun.lock")).text() }).toEqual(before);
  });

  test("refuses an unreleased version and a checkout holding no manifest that vendors the layer, changing nothing", async () => {
    scratch = await mkdtemp(join(tmpdir(), "bmo-ui-vendor-"));

    const releases = await releasesOf(FROM, TO);
    const checkout = await checkoutAt("checkout");
    const app = await host(checkout, ".", { name: "first-app", private: true, dependencies: { "bmo-ui": `file:vendor/${releaseFile(FROM)}` } }, FROM);
    const before = await Bun.file(app).text();
    const bare = join(scratch, "bare");

    await Bun.write(join(bare, "package.json"), JSON.stringify({ name: "bare", dependencies: { other: "1.0.0" } }));
    // A vendoring manifest among installed packages is no manifest of the checkout's.
    await Bun.write(join(bare, "node_modules", "inner", "package.json"), JSON.stringify({ dependencies: { "bmo-ui": `file:vendor/${releaseFile(FROM)}` } }));
    await rm(join(releases, releaseFile(TO)));

    expect(await refusal(vendor(releases, "1.0.0-rev.9", [checkout]))).toContain("1.0.0-rev.9 has no line in the ledger");
    expect(await refusal(vendor(releases, TO, [checkout]))).toContain(`${TO} has no packed file under releases/`);
    expect(await refusal(vendor(releases, FROM, [checkout, bare]))).toBe(`${bare} holds no manifest that vendors a packed file of bmo-ui.`);
    expect(await Bun.file(app).text()).toBe(before);
  });

  test("refuses a packed file whose bytes are not the ones the ledger names", async () => {
    scratch = await mkdtemp(join(tmpdir(), "bmo-ui-vendor-"));

    const releases = await releasesOf(FROM, TO);
    const checkout = await checkoutAt("checkout");
    const app = await host(checkout, ".", { name: "first-app", private: true, dependencies: { "bmo-ui": `file:vendor/${releaseFile(FROM)}` } }, FROM);
    const before = await Bun.file(app).text();

    await Bun.write(join(releases, releaseFile(TO)), "other bytes");

    expect(await refusal(vendor(releases, TO, [checkout]))).toContain(`${releaseFile(TO)} does not match the sha256 the ledger names`);
    expect(await Bun.file(app).text()).toBe(before);
    expect(await Bun.file(join(checkout, "vendor", releaseFile(TO))).exists()).toBe(false);
  });

  test("refuses a checkout that is no git work tree, and a new packed file git ignores, changing nothing", async () => {
    scratch = await mkdtemp(join(tmpdir(), "bmo-ui-vendor-"));

    const releases = await releasesOf(FROM, TO);
    const plain = join(scratch, "plain");
    const ignoring = await checkoutAt("ignoring");
    const manifest = { name: "first-app", private: true, dependencies: { "bmo-ui": `file:vendor/${releaseFile(FROM)}` } };
    const apps = [await host(plain, ".", manifest, FROM), await host(ignoring, ".", manifest, FROM)];
    const before = await Promise.all(apps.map((app) => Bun.file(app).text()));

    await Bun.write(join(ignoring, ".gitignore"), "*.tgz\n");

    expect(await refusal(vendor(releases, TO, [plain]))).toStartWith(`${plain} is no git work tree`);
    expect(await refusal(vendor(releases, TO, [ignoring]))).toStartWith(`git ignores vendor/${releaseFile(TO)} in ${ignoring}`);
    expect(await Promise.all(apps.map((app) => Bun.file(app).text()))).toEqual(before);

    for (const checkout of [plain, ignoring]) expect(await Bun.file(join(checkout, "vendor", releaseFile(TO))).exists()).toBe(false);
  });

  test("is handed a version and absolute checkout paths, and refuses anything else", () => {
    expect(vendorAsked([TO, "/one", "/two"])).toEqual({ version: TO, checkouts: ["/one", "/two"] });
    expect(vendorAsked([TO])).toContain("bun run vendor <version>");
    expect(vendorAsked([TO, "relative/checkout"])).toContain("relative/checkout is no absolute path");
  });

  test("prints its refusal and exits non-zero", () => {
    const vendoring = Bun.spawnSync(["bun", "scripts/vendor.ts"], { cwd: root, stdout: "pipe", stderr: "pipe" });

    expect(vendoring.exitCode).toBe(1);
    expect(vendoring.stderr.toString()).toContain("bun run vendor <version>");
  });
});
