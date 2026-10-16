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
- **It depends on no other repository,** only on registry packages.

## Using it

- Add the package and extend it from the host's Nuxt configuration.
- Install `@nuxtjs/i18n` in the host and give it a pack answering every key the boundary document
  lists.
- Apply the patch in `patches/` to the same dependency in the host's own install.

## Working on it

- `bun install` installs the dependencies and prepares Nuxt's types.
- `bun run typecheck` checks the layer and its tests.
- `bun test <file>` runs one test file; the browser files under `tests/browser/` are run one at a time.
- `testbed.toml` declares how the testbed runs the suite and the quick checks.

## Layout

| Folder | What it holds |
|---|---|
| `app/` | The layer's app code: the domain modules under `domain/`, and the app configuration stating the host's setting with nothing in it |
| `docs/` | The canonical documents: the design foundations, the wording contract, the components and the boundary |
| `patches/` | The patch applied to a dependency on install |
| `shared/` | The shared modules, read by the layer's code and the host's alike |
| `tests/` | The tests, with the browser lane's files and their support under `tests/browser/` |

At the root stand the package manifest, which holds the version, its lockfile, the Nuxt
configuration, the TypeScript and Bun configurations, the testbed declaration, the Korean ledger the
quick checks read, and `CLAUDE.md`.

## Version

- **One version for the whole repository,** the manifest's, following semantic versioning over the
  boundary that `docs/boundary.md` states.
- **While the major is 0,** a minor release may change the boundary; from 1 on, only a major may.
