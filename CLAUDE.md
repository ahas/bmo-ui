# Working in bmo-ui

These rules hold every change to this repository.

## The documents come first

- `docs/` is the canonical statement of what the layer is and does; the code is one realisation of
  it. Before changing code, read the document covering that area.
- A change that would make a document wrong or incomplete repairs the document first, stating what is
  true now, and the code is written to match.
- `docs/boundary.md` is the public contract: every export, every wording key, every design token, the
  plugins and what a host owes. A change to anything it lists follows the version rules in the
  README, and the boundary document changes in the same commit.
- A document states what is true now: no change history, no rationale told through an earlier
  design, no pasted source, signature or config fragment, and no file-and-line pins.

## Language

- Everything in this repository is English: code, comments, strings, tests, documents, commit messages
  and branch names. No Korean in code or tests; the quick checks' ledger names the test files that
  hold Hangul input written as escapes and allows every other file none.
- Test input is neutral English. Where a test is about how Hangul behaves, the Hangul is written as
  `\u` escapes and its file's count stands in the ledger.
- No personal data: no user names, home directories, machine names, host names or addresses, and no
  name of any agent or product that uses the layer. `docs/PERSONAL-DATA.md` states the whole rule and
  the values it allows. The `bmo-` prefix is the library's own namespace, and `bmo-ui`, the layer's
  skill, is one name in the namespace harnesses load upstream skills from.

## What the layer may know

- **No consumer.** The layer knows no screen, service, route or product by name. It supplies the
  mechanism, the extension point and a safe default; the host supplies the policy.
- **No server of its own.** Nothing in the layer names a server route or holds a type of a host's
  domain. The relay module's call is the one place it takes the app's fetcher, calling the service and
  path a screen hands it; the translation module reaches the translator the host names through it.
- **No words of its own.** Every word a component shows is a key into the host's language pack, under
  `common.*` or `files.*`; the layer ships no locale and does not install the i18n module. The keys it
  reads are declared in one list, and the boundary document names them.
- **Dependencies:** registry packages alone; no other repository's package. The quick checks'
  dependency check holds this.
- **A variation belongs to its member.** No lookup table standing in for polymorphism, and no value in
  a token, an override or a component that names who consumes it.
- **No hand-written parser for a general format.** Where no library fits, the reason is written
  beside the code.

## A change from a repository below

A repository below that needs a change this layer does not serve sends it as a pull request against this
repository's GitHub repository, from a branch made from this repository's main. Its job never commits to
this main and keeps no copy of the change.

The change is written as the general case, with this layer's own tests. Before it is opened and again in
review it is held to the rule that it names no repository that asked for it, no provider or unit of one, no
branch for one unit, and no data or test fixture only the asker uses.

Whoever holds this repository's work reviews the pull request and merges it or sends it back with the reason
on it; a review service may assist. A merge moves no version (`docs/conventions.md` in bmo-chat, 「Versions」: a version moves only at a release the owner declares); the repository that asked builds against the merged main through its path dependency and resumes the part it stopped.

## Code and tests

- Tests live in `tests/`, never beside the source. Every test file runs with happy-dom registered
  (`tests/happy-dom.ts`).
- Tests in `tests/browser/` drive a real Chromium through playwright-core and run one at a time in the
  browser lane. They are skipped where the browser build playwright-core pins is not on the machine.
- The patch under `patches/` is applied to the dependency it names by the package manager on install;
  a host extending the layer applies the same patch in its own install.
- `tests/guard.test.ts` holds the rules above off every file of the repository: the dependencies, the
  language, the names, the servers, the wording keys and the boundary document. A file that breaks
  one of them fails it.

## The stages of a change

1. **Writing:** the only check is `bun run typecheck`, which prepares Nuxt's types and checks the
   layer and the tests together.
2. **Review:** read the whole diff against the document governing it. The repository has no linter
   or formatter of its own; the testbed's quick checks stand in their place.
3. **Verification:** the touched test files, each run with `bun test <file>` in the testbed's turn,
   then the whole suite once through the testbed, output written to a file and the file read.

A change is not done before stage 3 has passed.
