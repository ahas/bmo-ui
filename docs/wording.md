# Wording and the language pack

The layer shows no words of its own. Every word a component shows is a key into the host's language
pack, and a wording fix is an edit to that pack alone. The keys the layer reads are declared in one
list; `docs/boundary.md` names every one of them.

## The mechanism

- **The engine is `@nuxtjs/i18n`, installed by the host.** The layer ships no locale and does not
  install the module: it asks for keys and the host's pack answers them.
- **The host's pack answers every key the layer reads.** A key the pack lacks shows as the key
  itself, so a missing key is visible on the screen rather than silent.
- **The library's own words** — an empty table, a close button, a number field's steps — come from
  the component library's own locale, which the host chooses.

## The key

- **A key is `<domain>.<role>.<key>`, in lower snake case.**
  - The layer's domains are `common`, for words any screen may show, and `files`, for the words of
    the file components. A host's own domains are its own and never collide with these.
  - The role is one of `title`, `label`, `action`, `placeholder`, `aria`, `status`, `message`,
    `error`.
  - A value is read by the vue-i18n engine. Each placeholder is named for what fills it — `{name}`
    for a name, `{n}` for a count, and the like — and a literal `@`, `{`, `}` or `|` is written
    escaped. The pack never uses plural forms.
- **One sentence is one key.** Code never assembles a sentence out of pieces a parameter could
  carry. Where a phrasing turns on a state, the code chooses between whole keys.
- **A key is always written out whole.** A map from a state to its words maps the state to a key
  written in full; a key assembled out of pieces cannot be found by reading, and is refused.
- **A value never begins or ends with a space or a separator.** The template compiler drops a
  stretch of bare whitespace standing first or last inside an element, so a space that joins the
  words to what stands before them is written in the template, outside the interpolation.

## Who asks, and how

- **A component asks with `$t` in its template and with the `t` of `useI18n()` in its script.**
  - The script imports `useI18n` from `vue-i18n` by name, a peer the layer declares. The layer
    installs no i18n module to import it for it, and the host's module points that name at its own
    engine, so layer and host share one.
  - A prop whose default would be words has no default, since prop defaults are evaluated where no
    translator stands yet: the prop is left unset and the component falls back to its key where the
    words are shown.
  - A sentence that carries markup of its own is one key read through `<i18n-t>`, the markup
    standing in the named slots its placeholders name.
- **A domain module never asks for a translator itself.** A function or a composable that has words
  to say is handed one of the `Translate` type as its first parameter, and its caller passes its own
  `t`, or `$t` from a template. A table in such a module that gives each state its words holds the
  key instead, and the words are asked for where they are put on the screen.
- **The wording types are the layer's:** `Translate`, `WordingParams` and `Pack`, so a host's own
  code and tests can hand the layer a translator of the same shape.
- **A figure in a sentence** is the sentence's placeholder, filled with the figure as the numbers
  module writes it; `RollingSentence` draws a sentence whose figures turn.

## What is not wording

- **A string that is data stays in the code:** one compared against a value, used as an id, or
  matched against stored text.
- **The layer holds no words at all,** so it holds no Hangul and no text in any other language. The
  only Hangul in its tests is input for what a test shows of Hangul, written as `\u` escapes; the
  quick checks' ledger names the three test files that hold it and allows every other file none.
- **The README alone is also read in other languages:** `README.ko.md`, `README.ja.md` and
  `README.zh-CN.md` translate it, and the language line atop each README names every language in its
  own script. The guard's Hangul rule reads neither the translations nor that line.

## The guard

- **The layer's key list is the one place its keys are declared:** the `wording-keys` shared module,
  which the layer's own tests and a host's alike read. A test reads the layer's files
  and fails on a key asked for that the list lacks, on a key the list holds that nothing asks for, on
  a key built out of pieces, and on a key not named by the rule above. A host's own test holds its
  pack to the list, so every key the layer reads is answered.
- **A console bundle is held to the list as it is built.** The bundle build reads the screens' code
  the same way and refuses a key under the layer's domains the list lacks, beside a key its own words
  do not answer (`docs/boundary.md`, "The bundle build").
