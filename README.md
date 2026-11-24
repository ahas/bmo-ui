**English** | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

# bmo-ui

The foundation UI library: design tokens, the component library's overrides, and the common
components and behaviours every screen is built from. It is a Nuxt layer, built on Nuxt UI.

- **A host takes it with `extends`.** The layer brings Nuxt UI, its stylesheet, fonts, overrides,
  components and page plugins; the host brings its own modules, its pages, its address and its
  language pack.
- **It shows no words of its own.** Every word is a key the host's language pack answers, and the
  locale and time zone dates are read in are the host's to set.
- **It knows no consumer** and names no server: it calls only the service and path a screen hands
  its relay, and the translator a console names. What it exposes and what a host owes it is its whole
  boundary (`docs/boundary.md`).
- **It states the console plugin contract** every console bundle conforms to, so a console finds
  each service while it runs and attaches its bundle by the manifest it answers alone
  (`docs/console-bundles.md`).
- **A coding harness takes it as an MCP server,** `bmo-ui mcp`, a catalogue of its components, tokens
  and contract, with the `bmo-ui` skill beside it (`docs/harness.md`).
- **It depends on no other repository,** only on registry packages.
- **It holds no personal data.** A person's name, mail address, home folder, device or network detail
  belongs in the host's configuration, and an example uses a neutral name; the guard test reads every
  file for one (`docs/PERSONAL-DATA.md`).

## Using it

- Vendor a release's file from `releases/` as it stands, add the package from it and extend it from
  the host's Nuxt configuration. The vendor verb moves a host that vendors one already onto another
  release ("Version").
- Install `@nuxtjs/i18n` in the host and give it a pack answering every key the boundary document
  lists. The layer names it and its engine, `vue-i18n`, as peers.
- Apply the patches in `patches/` to the same dependencies in the host's own install.
- A console states its relay base in its app configuration, names its translator in its runtime
  configuration where it has one, and attaches each bundle by the contract.
- A harness launches `bmo-ui mcp` from the host's install and loads the skill under `skills/`.

## Working on it

- `bun install` installs the dependencies and prepares Nuxt's types; the prepare step reaches the
  local Nuxt command line through `bun x`, since the package manager's lifecycle runs without the
  local binaries on its path.
- `bun run release` writes the packed file of the manifest's version under `releases/` and its sha256
  into the ledger beside it ("Version"); it is the one way a packed file comes to exist.
- `bun run vendor <version> <checkout>...` puts a released file into every manifest under each
  checkout that vendors the layer ("Version").
- `bun run elements` builds each custom element into one script under `dist/`, which git ignores;
  packing runs it first, so the packed file carries the scripts.
- `bun run typecheck` checks the layer, its tests and the harness plugin's code with the components'
  examples.
- `bun run catalogue` writes the catalogue's data file again from the sources; a change to a
  component, a token or the boundary document carries it.
- `bun test <file>` runs one test file; the browser files under `tests/browser/` are run one at a time.
- `testbed.toml` declares how the testbed runs the suite and the quick checks.

## Layout

| Folder | What it holds |
|---|---|
| `app/` | The layer's app code: the stylesheet and the fonts with their licences under `assets/`, the components under `components/`, the domain modules under `domain/`, the custom elements' entries under `elements/`, the page plugins under `plugins/`, the app configuration holding the library's overrides and the host's setting with nothing in it, and the declaration typing templates by the host's i18n module |
| `bin/` | The package's command |
| `bundle/` | The bundle build a service builds its console bundle with |
| `catalogue/` | The catalogue module with its data file, the generator writing that file, and every component's example under `examples/` |
| `docs/` | The canonical documents: the design foundations, the wording contract, the components, the console plugin contract, the harness plugin, the personal data rule and the boundary |
| `mcp/` | The MCP server the command starts |
| `patches/` | The patches applied to dependencies on install |
| `releases/` | The packed file of each version a host takes, with the ledger of their sha256 |
| `scripts/` | The release verb, the vendor verb and the check packing runs first |
| `shared/` | The shared modules, read by the layer's code and the host's alike |
| `skills/` | The `bmo-ui` skill |
| `tests/` | The tests, with the browser lane's files and their support under `tests/browser/` |

At the root stand the package manifest, which holds the version and the licence, its lockfile, the
Nuxt configuration, the custom elements' build configuration, the TypeScript and Bun configurations, the
testbed declaration, the Korean ledger the quick checks read, `CLAUDE.md`, and the MIT licence in `LICENSE`.

## Licence

- **The layer is under the MIT licence,** stated in `LICENSE` at the root and in the manifest's
  `license` field.

## Version

- **One version for the whole repository,** the manifest's, and it is the BMO set's: the layer stands at
  the version every unit of the set stands at (bmo-chat's `docs/conventions.md`, "Versions"), following
  semantic versioning over the boundary that `docs/boundary.md` states.
- **The manifest's version moves only at a set release,** the owner's word for the whole set, in the
  commit that releases it, which is tagged `v<version>`. An export, prop, wording key or token taken
  away or changed anywhere in the set makes the release a major one, an addition a minor one, and fixes
  alone a patch.
- **At every set release the layer packs under the set's version:** an alpha `X.Y.Z-alpha.<N>`, a
  beta `X.Y.Z-beta.<N>`, a release candidate `X.Y.Z-rc.<N>`, a stable release `X.Y.Z` or a patch,
  on the commit its `v<version>` tag names.
- **Between releases a packed file is the day's nightly,** named `X.Y.Z-0.nightly.<YYYYMMDD>`: the
  version main leads to from the manifest's, then the day it was packed in the platform's time zone,
  Asia/Seoul. Main leads to the minor above a stable release, as `1.1.0-0.nightly.20261124` after
  `1.0.0`; to `X.Y.Z` itself while an alpha of `X.Y.Z` is the last release; to the minor above
  while a beta or a release candidate of `X.Y.Z` is, since its first beta cut `release/X.Y`; and to
  `0.2.0` before the set's first release, from `0.1.0` or a `0.1.0-rev.<n>` revision. A second pack the same
  day is `1.1.0-0.nightly.20261124.2`, a third `.3`, and so on. The nightly's name stands in its
  packed file alone, in the manifest and the layer's version file packed there, never in the
  committed manifest; semver orders every nightly after the release before it and before every
  alpha, beta, release candidate and stable release of the version it leads to. A pack named in the
  earlier nightly form, `X.Y.Z-nightly.<YYYYMMDD>[.<n>]`, keeps its name, is ordered as the same
  day's pack of the present form and counts among that day's packs. A host still pins a pack by its
  exact name and sha256, never by its order. `docs/boundary.md` names what each packed file under an
  earlier numbering holds.
- **A pack is one packed file,** written once by the release verb, `bun run release --bound <pack>
  --why <reason>`, where `--bound this` names the pack being made. The verb packs under the
  manifest's version where the committed tree is the commit its `v<version>` tag names, and under the
  day's nightly otherwise. It refuses a pack that names no bound or no reason, a bound the ledger does
  not name at or before this pack or that is earlier than the last pack's, a nightly that does not
  stand after the last nightly the ledger names in that order, a working tree with changes and a name
  that already has a file or a ledger line; it exports the committed tree (`git archive`)
  into a scratch folder, installs it, writes the pack's version into the manifest there and the
  version, the bound and the packs from the bound up to this one into the layer's version file there,
  packs it once into `releases/` under the pack's name, and adds the file's sha256, its bound and the
  reason to the ledger `releases/sha256.json`, saying all three. A pack's file is never written again.
- **Every release names its bound:** the oldest release whose bundles still run on it unchanged. A
  release that only adds keeps the bound before it; one that takes away or changes what an earlier
  bundle reads raises the bound to itself. A console attaches a bundle built on any release from its
  bound up to its own (`docs/console-bundles.md`, "The layer a bundle is built on").
- **Packing runs inside the verb alone.** Packing first checks that the layer's version file names
  the manifest's version, which only the verb writes, so `bun pm pack` in a checkout is refused. The
  suite holds `releases/` and its ledger to each other, so a file the verb did not write fails it.
- **The file holds** what the manifest's file list names: the layer's code, its stylesheet and
  fonts, the patches, the command, the MCP server, the bundle build, the catalogue module and its
  data file, the skill, the Nuxt configuration, the README, the licence and the documents.
- **A host vendors that file as it stands,** checked against the ledger, so every host of a version
  stands on the same bytes. It never packs the layer from its source, renames a file or packs one
  again.
- **The vendor verb moves hosts onto a release,** `bun run vendor <version> <checkout>...`, each
  checkout named by its absolute path, since the verb runs from the layer's root. The checkouts come
  from the caller alone; the verb knows no host. Under each checkout it reads every package manifest
  outside dependency folders and hidden folders with a JSON reader, and takes those whose `bmo-ui`
  dependency, among the dependencies, development dependencies and optional dependencies, is a file
  dependency on a packed file of the layer inside that checkout. For each one that names another
  release it copies the version's file from `releases/` into the folder the old file stands in and
  checks the copy against the ledger's sha256, points the dependency at the new file in the
  manifest's own spelling, raises a peer dependency that pins the old version exactly to the new one,
  each value edited where it stands with a JSON editor so every other byte of the manifest keeps the
  layout its repository gave it (an array on one line stays on one line), removes the old file, and
  writes the lockfile again with the package manager's lockfile-only install where a `bun.lock` stands
  beside the manifest or in a folder above it inside the checkout. A manifest that already names the
  version is left as it stands. It prints, under each checkout, what it changed in each manifest, and
  commits nothing: the job that runs it commits in each repository.
  Before changing anything it refuses a version with no packed file or no ledger line, a file whose
  bytes do not match the ledger, a checkout path that is not absolute or not a folder, a checkout
  holding no manifest that vendors the layer, and a vendored file lying outside its checkout, naming
  each.
- A path dependency on a checkout serves a repository's own work and tests while a change
  waits for a release; the layer it installs names its version marked `+source`, so no console
  takes a bundle built on it.
