# The console plugin contract

A console is a host that gathers the screens of several services into one app. A service that has
screens publishes them as a **console bundle**, its screens built for the browser, and describes the
bundle in a **manifest** it answers at a fixed route. A console reads the manifests of the services
its settings list while it runs, and loads the bundles of those that answer. Every bundle and every
console conforms to this contract and to no particular counterpart, so a console attaches a bundle
by its manifest alone, with no code and no build of its own per bundle, and a bundle is written once
for every console that follows the contract.

The layer states the contract and supplies its mechanism: the manifest's shape and its reading, the
roles and the headers that carry them, the address a screen calls its service at, and the components
and tokens a screen is built from. A console supplies the policy: which services it asks, how often,
where it relays them and how it lists their screens. A service supplies its own guard.

## What a bundle is

- **A browser module the service serves.** A bundle is an ECMAScript module built from the bundle's
  sources on this layer, answered by its service at the path the manifest names. Its default export
  holds the routes of its screens, each under the manifest's screen path; the shared module
  `console-manifest` states that export's type.
- **It shares the console's libraries.** The bundle leaves unbundled every import of `vue`,
  `vue-router`, `vue-i18n`, `nuxt/app`, `@nuxt/ui` and this layer, written as the package's own path
  of what it imports, and carries everything else itself. The console resolves each of those paths to
  the one copy its app runs, so every bundle draws with the console's components, reads the console's
  app and runtime configuration and calls through the console's fetcher. A bundle is built against the
  layer version its console runs; one built against a version whose boundary differs is rebuilt by its
  service.
- **Its stylesheet** is the styles and utility classes its screens use beyond the layer's own, built
  on the layer's tokens and answered at the path the manifest names, where the bundle has one. The
  layer's stylesheet and tokens are the console's copy.
- **Its words** are one JSON object answered at the path the manifest names: each locale's tree under
  the locale's code, every key under the bundle's namespace. Like the manifest, they are answered to
  the console's own credential with no owner key and no role.
- **Its addresses follow its bytes.** The module's and the stylesheet's paths change whenever their
  bytes do, so a console and a browser may keep what they loaded, and a rebuilt bundle reaches a
  console as a manifest naming new paths.
- **One service.** A bundle draws the screens of the one service its manifest names. Whatever its
  screens read, of that service or of another, they read from the service that serves it through the
  console's relay; a bundle keeps no copy of what a service serves and relays nothing itself.

## The manifest

A service answers its manifest at `GET /console-manifest` on its own API, as a JSON object with a
200. It answers the console's own credential with no owner key and no role, since the console reads
it for no reader. The shared module `console-manifest` names the route, states the manifest's shape as
a JSON Schema and reads a parsed manifest, refusing one that does not keep the shape and naming each
field at fault.

Every field is in camelCase, as the common wire format writes keys. A path of the service's API is
written from its root, led by a slash, in segments of the characters an address carries unescaped,
none of them a dot or two standing for a folder.

| Field | Holds | Required |
| --- | --- | --- |
| `name` | The bundle's name, in kebab-case. It is also its words' namespace. | yes |
| `title` | The key, in the bundle's words, of the name a console's menu gives the bundle's screen. It lies under the bundle's namespace. | yes |
| `icon` | The icon a console draws beside that name, as the component library names an icon. | yes |
| `screenPath` | The path the bundle's screens stand under: one or more kebab-case segments, each led by a slash. | yes |
| `serviceName` | The service's name, in kebab-case, which a console relays the service under. | yes |
| `bundle` | The path of the service's API its module is answered at. | yes |
| `stylesheet` | The path of the service's API its stylesheet is answered at. | no, none |
| `words` | The path of the service's API its words are answered at. | yes |
| `apiPrefix` | The path of the service's API every call the screens make stands under. A console relays nothing of the service outside it but the module and the stylesheet. | no, `/` |
| `role` | The least role a reader holds to open the screen: `administrator` or `member`. | yes |
| `ownerKey` | Whether every call the screens make needs the reader's owner key. | no, false |
| `events` | Whether the screens read the service's event stream through the console. | no, false |
| `websocket` | Whether the screens open a WebSocket to the service through the console. | no, false |
| `pushKinds` | The service's event kinds a console may raise as a notice to a reader who is not on the screen, each written as the stream names it, a resource and its change. | no, none |

Reading a manifest fills each optional field but the stylesheet with its default, so a console reads
every other field of every manifest.

## How a console finds the services

- **Its settings list the services it asks,** each by the base address it reaches the service at and
  the credential it calls it with. The list is the console's to keep; the contract names no service.
- **It asks each for its manifest** when it starts and again on a timer of its own choosing. It asks
  from its own server, so no service's address or credential reaches a browser.
- **A service that does not answer is absent, not broken.** A call nothing took, a refusal, a wait
  that ran out or any answer but a 200 leaves the service out: no menu entry, no relay and no notices,
  and nothing a reader is shown as a fault. The first manifest it answers again attaches it again.
- **A manifest that does not read leaves its service out** as well, and the console records the
  reading's fault, naming each field.
- **Two manifests sharing a name, a screen path or a service name** leave both services out, rather
  than either attached over the other.
- **A manifest that changed replaces the one before it.** A reader already on the screen keeps the
  module the browser loaded until the screen is opened again.
- **The console reads each bundle's words** with its manifest, so its menu names a screen before the
  module is loaded and its notices are raised in the bundle's words.

## How a bundle mounts

- **Screens.** Before a reader first opens a screen path, the console imports the bundle's module
  from the module's relay address, adds its routes inside the console's frame and links its
  stylesheet. The pages are the bundle's; the frame around them is the console's.
- **Components.** A bundle imports its own components and the layer's, and the console registers
  none of them for it.
- **Words.** Every word a screen shows is a key under the bundle's namespace in its own words, beside
  the layer's own `common.*` and `files.*` keys that the console answers. The words a screen draws
  belong to the bundle that draws it, so a console carries none of them: it merges each bundle's words
  into its pack.
- **Calls.** A screen calls its service at the address the `relay` domain module answers for the
  service's name and a path: the base path the console app is served under, the console's relay
  base, the service's name, then the path as the service's own API writes it. The console relays
  everything under that address whose path stands under the service's API prefix to the service
  unchanged, behind its own sign-in. The event stream and a WebSocket go the same way, where the manifest asks for them; a
  WebSocket is opened at the module's socket address, the same address over the page's own origin in
  the socket's scheme.
- **An address is complete as given.** Whatever a screen hands the browser — a call through the
  app's fetcher, a picture's source, a link, a download, an event stream, a socket — it hands the
  address the module answers for it, and the console adds nothing. The app's fetcher leaves
  an address already under the app's base path as it is, so the same address serves a call and a
  raw address alike.
- **Notices.** A console that raises notices reads the service's event stream for the kinds under
  `pushKinds` and raises each in the words the bundle's words give that kind, under the bundle's
  namespace, to the readers whose role allows the manifest's.

## Roles and the owner key

- **The roles** are `administrator` and `member`. An administrator holds every role a member holds,
  so a screen needing a member opens for both and one needing an administrator for the administrator
  alone. The shared module answers whether a role held allows a role needed.
- **The console sets two headers** on every call and socket it relays, in place of any the browser
  sent: `Owner-Key`, the signed-in login's user on the account service, its id written as a decimal
  number, which a login with no user carries none of; and `Owner-Role`, the role the reader holds.
  The console's own credential on the call is what makes them the console's word.
- **The console offers a screen** only to a reader whose role allows the manifest's role, and a screen
  whose manifest asks for the owner key only to a login that has one: no menu entry, no module and no
  notice for anyone else. This spares a reader a screen that would refuse them; it guards nothing.
- **The service is the guard.** On every route the screens use, its module and its stylesheet among
  them, a service refuses a call that lacks the console's credential with a 401, and a call whose
  `Owner-Role` is missing or does not allow the manifest's role, or, where the manifest asks for the
  owner key, whose `Owner-Key` is missing, with a 403. It answers a call with the owner's own data and
  never another's. A route that needs more than the screen's role refuses on its own terms; the
  manifest's role is the floor of every route, not the whole of the service's guard.

## What a console owes

- **It shares its libraries** with every bundle it loads: each path of `vue`, `vue-router`,
  `vue-i18n`, `nuxt/app`, `@nuxt/ui` and this layer a bundle imports resolves in the browser to the
  copy its app runs. It extends this layer and owes it what the layer asks of a host
  (`docs/boundary.md`, "What the host owes").
- **It finds the services** as the contract states: its own list, every manifest read through the
  shared module, the absent left out and the conflicting refused.
- **It attaches each bundle by its manifest alone:** an entry under its title and icon leading to its
  screen path, for the readers its role allows; a relay of its service under the relay base, for the
  service's API prefix, its module and its stylesheet; the stream and the WebSocket where the manifest
  asks for them; the bundle's words; and its notice kinds.
- **It sets the owner key and the role** on everything it relays, and replaces any the browser sent.
- **It states its relay base** in its app configuration, under `bmoUi`, as `relayBase`: the path every
  service is relayed under, from the app's base path. Where none is stated, a service is called at its
  name from the app's base path.
- **It serves the app under one base path,** Nuxt's own `app.baseURL`, which the relay module reads
  from the runtime configuration each time it makes an address and puts ahead of the relay base. An
  address that already stands under the base path is not given it twice, so a relay base stated with
  the base path in it reads the same.

## What a service owes

- **It answers its manifest** at the route, by the schema, and reads it in its own test through the
  shared module's reading, so a manifest that breaks the contract fails there first.
- **It answers its module, its stylesheet and its words** at the paths the manifest names.
- **It guards every route itself** by the console's credential, the role and the owner key, as the
  contract states.

## Who reads the contract

A coding harness building a bundle reads the contract through the layer's MCP server, which answers
the manifest's route, its JSON Schema and this document whole (`docs/harness.md`).
