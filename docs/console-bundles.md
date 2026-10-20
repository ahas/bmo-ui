# The console plugin contract

A console is a host that gathers the screens of several services into one app. A **console bundle**
is the package one service ships its screens in. Every bundle conforms to this contract and to no
particular console, so a console attaches each bundle by reading what the bundle declares, with no
code of its own per bundle, and a bundle is written once for every console that follows the contract.

The layer states the contract and supplies its mechanism: the declaration's shape and its reading,
the address a screen calls its service at, and the components and tokens a screen is built from. A
console supplies the policy: where it relays services, how it lists bundles, who may open them.

## What a bundle is

- **A Nuxt layer on this layer.** A bundle is a package whose Nuxt configuration extends this layer
  and adds its screens' pages, components, domain modules and stylesheet. The layer is a peer of the
  bundle at the version it is built against, so the console supplies the one copy every bundle shares.
- **Its declaration stands at the package's root** in the file `console-bundle.json`, which the
  package's file list carries. The shared module `console-bundle` names the file, states its shape as
  a JSON Schema and reads a parsed declaration, refusing one that does not keep the shape and naming
  each field at fault.
- **One service.** A bundle draws the screens of the one service its declaration names. Whatever its
  screens read, of that service or of another, they read from the service that serves it through the
  console's relay; a bundle keeps no copy of what a service serves and relays nothing itself.

## The declaration

Every field is in camelCase, as the common wire format writes keys.

| Field | Holds | Required |
| --- | --- | --- |
| `name` | The bundle's name, in kebab-case. It is also its words' namespace and its components' prefix. | yes |
| `title` | The key, in the bundle's own pack, of the words a console names the bundle's screen by. It lies under the bundle's namespace. | yes |
| `icon` | The icon a console draws beside that name, as the component library names an icon. | yes |
| `screenPath` | The path the bundle's screens stand under: one or more kebab-case segments, each led by a slash. | yes |
| `serviceName` | The service whose API the screens call, by its name. | yes |
| `languagePack` | The folder in the package, relative to its root, holding the bundle's words: one JSON file to a locale, named by the locale's code. | yes |
| `events` | Whether the screens read the service's event stream through the console. | no, false |
| `websocket` | Whether the screens open a WebSocket to the service through the console. | no, false |
| `pushKinds` | The service's event kinds a console may raise as a notice to a reader who is not on the screen, each written as the stream names it, a resource and its change. | no, none |

Reading a declaration fills each optional field with its default, so a console reads every field of
every bundle.

## How a bundle mounts

- **Screens.** Every page the bundle adds stands under its `screenPath`, and no two bundles a console
  takes share one. The pages are the bundle's; the frame around them is the console's.
- **Components.** Every component the bundle registers is named with its name in PascalCase as the
  prefix, since a console registers every bundle's components side by side. A bundle reaches its own
  files by relative path and this layer's modules by the package's path, as the layer reaches its
  own (`docs/boundary.md`, "How a host takes it").
- **Words.** Every word a screen shows is a key under the bundle's namespace in its own pack, beside
  the layer's own `common.*` and `files.*` keys that the console answers. The words a screen draws
  belong to the bundle that draws it, so a console carries none of them: it merges each bundle's
  pack into its own, through the i18n module's layers or by reading the folder the declaration names.
- **Calls.** A screen calls its service at the address the `relay` domain module answers for the
  service's name and a path: the console's relay base, the service's name, then the path as the
  service's own API writes it. The console relays everything under that address to the service
  unchanged, behind its own sign-in. The event stream and a WebSocket go the same way, where the
  declaration asks for them.
- **Notices.** A console that raises notices reads the service's event stream for the kinds under
  `pushKinds` and raises each in the words the bundle's pack gives that kind, under the bundle's
  namespace.

## What a console owes

- **It extends every bundle it takes** from its Nuxt configuration, beside this layer, and owes each
  what the layer asks of a host (`docs/boundary.md`, "What the host owes").
- **It reads each bundle's declaration** through the shared module, and attaches the bundle by it
  alone: an entry under the bundle's title and icon leading to its screen path, a relay of its service
  under the relay base, the stream and the WebSocket where declared, the bundle's pack, and its notice
  kinds.
- **It states its relay base** in its app configuration, under `bmoUi`, as `relayBase`: the path every
  service is relayed under. Where none is stated, a service is called at its name from the root.
- **It refuses a bundle whose declaration does not read,** and two bundles sharing a name or a screen
  path, rather than attaching either over the other.

## Who reads the contract

A coding harness building a bundle reads the contract through the layer's MCP server, which answers
the declaration's JSON Schema and this document whole (`docs/harness.md`).
