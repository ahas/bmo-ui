# bmo-ui

The foundation UI library: design tokens, the component library's overrides, and the common
components and behaviours every screen is built from. It is a Nuxt layer, built on Nuxt UI.

- **A host takes it with `extends`.** The layer brings Nuxt UI, its stylesheet, fonts, overrides,
  components and page plugins; the host brings its own modules, its pages, its address and its
  language pack.
- **It shows no words of its own.** Every word is a key the host's language pack answers, and the
  locale and time zone dates are read in are the host's to set.
- **It knows no consumer** and calls no server. What it exposes and what a host owes it is its whole
  boundary (`docs/boundary.md`).
- **It states the console plugin contract** every console bundle conforms to, so a console attaches
  each bundle by its declaration alone (`docs/console-bundles.md`).
- **A coding harness takes it as an MCP server,** `bmo-ui mcp`, a catalogue of its components, tokens
  and contract, with the `ahas-ui` skill beside it (`docs/harness.md`).
- **It depends on no other repository,** only on registry packages.

## Using it

- Add the package and extend it from the host's Nuxt configuration.
- Install `@nuxtjs/i18n` in the host and give it a pack answering every key the boundary document
  lists. The layer names it and its engine, `vue-i18n`, as peers.
- Apply the patch in `patches/` to the same dependency in the host's own install.
- A console states its relay base in its app configuration and attaches each bundle by the contract.
- A harness launches `bmo-ui mcp` from the host's install and loads the skill under `skills/`.

## Working on it

- `bun install` installs the dependencies and prepares Nuxt's types.
- `bun pm pack` packs the layer as a host installs it, preparing Nuxt's types first; the prepare
  step reaches the local Nuxt command line through `bun x`, since the package manager's lifecycle
  runs without the local binaries on its path.
- `bun run typecheck` checks the layer, its tests and the harness plugin's code with the components'
  examples.
- `bun run catalogue` writes the catalogue's data file again from the sources; a change to a
  component, a token or the boundary document carries it.
- `bun test <file>` runs one test file; the browser files under `tests/browser/` are run one at a time.
- `testbed.toml` declares how the testbed runs the suite and the quick checks.

## Layout

| Folder | What it holds |
|---|---|
| `app/` | The layer's app code: the stylesheet and the fonts with their licences under `assets/`, the components under `components/`, the domain modules under `domain/`, the app configuration holding the library's overrides and the host's setting with nothing in it, and the declaration typing templates by the host's i18n module |
| `bin/` | The package's command |
| `catalogue/` | The catalogue module with its data file, the generator writing that file, and every component's example under `examples/` |
| `docs/` | The canonical documents: the design foundations, the wording contract, the components, the console plugin contract, the harness plugin and the boundary |
| `mcp/` | The MCP server the command starts |
| `patches/` | The patch applied to a dependency on install |
| `releases/` | The packed file of each version a host takes |
| `shared/` | The shared modules, read by the layer's code and the host's alike |
| `skills/` | The `ahas-ui` skill |
| `tests/` | The tests, with the browser lane's files and their support under `tests/browser/` |

At the root stand the package manifest, which holds the version, its lockfile, the Nuxt
configuration, the TypeScript and Bun configurations, the testbed declaration, the Korean ledger the
quick checks read, and `CLAUDE.md`.

## Version

- **One version for the whole repository,** the manifest's, following semantic versioning over the
  boundary that `docs/boundary.md` states.
- **Until the first release the base stays 0.1.0,** and each version carries a `-rev.N` suffix, N
  counting the versions in the repository's history from 1. Any revision may change the boundary.
  `docs/boundary.md` names the revision each packed file under an earlier numbering holds.
- **From the first release,** while the major is 0, a minor release may change the boundary; from 1
  on, only a major may.
- **A version is one packed file,** kept under `releases/` by its version's name. It is packed with
  `bun pm pack` from a scratch export (`git archive`) of the committed tree, never from a checkout,
  and the manifest's file list names everything it holds: the layer's code, its stylesheet and fonts,
  the patch, the command, the MCP server, the catalogue module and its data file, the skill, the Nuxt
  configuration, the README and the documents. A host takes that one file, so
  every host of a version stands on the same bytes.
