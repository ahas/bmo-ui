# The console plugin contract

A console is a host that gathers the screens of several services into one app. A service that has
screens publishes them as a **console bundle**, its screens built for the browser, and describes the
bundle in a **manifest** it answers at a fixed route. A console reads the manifests of the services
its settings list while it runs, and loads the bundles of those that answer. Every bundle and every
console conforms to this contract and to no particular counterpart, so a console attaches a bundle
by its manifest alone, with no code and no build of its own per bundle, and a bundle is written once
for every console that follows the contract.

The layer states the contract and supplies its mechanism: the manifest's shape and its reading, the
roles and the headers that carry them, the address a screen calls a service at and the call itself,
the shape of a translator's route and the asking of it, and the components and tokens a screen is
built from. A console supplies the policy: which services it asks, how often, where it relays them,
which service translates and how it lists their screens. A service supplies its own guard.

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
- **Its share page, where it has one,** is a screen under its screen path at `/share/` and a token, which a
  reader with no sign-in opens by holding the token ("Share pages").
- **Its addresses follow its bytes.** The module's and the stylesheet's paths change whenever their
  bytes do, so a console and a browser may keep what they loaded, and a rebuilt bundle reaches a
  console as a manifest naming new paths.
- **One service, and the services it names.** A bundle draws the screens of the one service its
  manifest names. Whatever its screens read, they read through the console's relay: of their own
  service, and of another service only one the manifest names under `calls`, on that service's own
  terms. A bundle keeps no copy of what a service serves and relays nothing itself.

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
| `apiPrefix` | The path of the service's API every call the screens make stands under. A console relays nothing of the service outside it but the module, the stylesheet and the routes under `relays`. | no, `/` |
| `role` | The least role a reader holds to open the screen: `administrator` or `member`. | yes |
| `ownerKey` | Whether every call the screens make needs the reader's owner key. | no, false |
| `events` | Whether the screens read the service's event stream through the console. | no, false |
| `websocket` | Whether the screens open a WebSocket to the service through the console. | no, false |
| `pushKinds` | The service's event kinds a console may raise as a notice to a reader who is not on the screen, each written as the stream names it, a resource and its change. | no, none |
| `calls` | The other services the screens call through the console, each by the service name its own manifest gives it, in kebab-case; never the bundle's own service, and none twice. | no, none |
| `relays` | The service's own routes outside the API prefix that a console relays as well, each its `method` (`GET`, `POST`, `PUT`, `PATCH` or `DELETE`) and its `path`, one whole path of the service's API; none twice. | no, none |
| `shareReads` | The reads a share token alone permits, each a path pattern of the service's API under the API prefix: a path whose segments stand as written or as a placeholder, a name in camelCase in braces matching any one segment, with `{token}` among them once, standing for the token. A console relays a `GET` or a `HEAD` whose path a pattern matches with no session ("Share pages"); none twice. | no, none |

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
  everything under that address whose path stands under the service's API prefix, and every call
  whose method and path are a route the manifest names under `relays`, to the service unchanged,
  behind its own sign-in. The event stream and a WebSocket go the same way, where the manifest asks for them; a
  WebSocket is opened at the module's socket address, the same address over the page's own origin in
  the socket's scheme.
- **Calls to another service.** A screen calls a service its manifest names under `calls` at the
  same kind of address, under that service's name, and the `relay` module's call makes it through the
  app's fetcher. The console relays it on the called service's own terms: only the paths that
  service's own manifest lets through, and only for a reader whose role and owner key allow that
  service's manifest. A call from a bundle's page to a service another manifest names, which is neither
  the bundle's own nor one it names under `calls`, is refused with a 403. The console knows the page a
  call comes from by the page address the browser sends with it; reading another bundle's module, its
  stylesheet or a file beside its module is never refused, so a screen opened from another stands.
- **An address is complete as given.** Whatever a screen hands the browser — a call through the
  app's fetcher, a picture's source, a link, a download, an event stream, a socket — it hands the
  address the module answers for it, and the console adds nothing. The app's fetcher leaves
  an address already under the app's base path as it is, so the same address serves a call and a
  raw address alike.
- **The title bar.** A console may draw one title bar over every screen, a bundle's among them. Where it
  does, it provides, under the injection key `bmo-console-title-bar`, an object naming in `screenActions`
  the selector of the place in its bar a screen lays what acts on it as a whole. A route that asks for the
  console's bar says so in its meta, `consoleTitleBar: true`, and the console draws the bar over it, named by
  the manifest's title and icon. A screen whose route asks and that finds the key provided draws no bar of
  its own, and teleports what acts on it as a whole into the place `screenActions` names, deferred, since the
  bar stands before the screen does; found without the key — on its service's own page, or under a console
  that draws no shared bar — it draws its own. A route that does not ask stands as its bundle draws it.
- **The screen's foot.** A bar a screen stands at its foot for the reader to act from — an input bar, a row of
  keys — carries the attribute `data-screen-foot`. What a console floats over the page area of its own accord
  stands above every element so marked, so it never covers that bar until the reader moves it there.
- **Notices.** A console that raises notices reads the service's event stream for the kinds under
  `pushKinds` and raises each in the words the bundle's words give that kind, under the bundle's
  namespace, to the readers whose role allows the manifest's.

## Share pages

A share page opens one resource of the service to whoever holds a token for it, with no account and no
sign-in. The token is the whole of the permission: the page reads only what its token opens, through the
reads the manifest names under `shareReads`.

- **Where it stands.** A bundle's share page is the route under its screen path at `/share/` and the token,
  one segment. A console serves that address to a reader with no session, and gives that reader the one
  bundle whose screen path the address stands under: its module, its stylesheet and its words, and nothing
  else of any manifest.
- **What it reads.** Every call the page makes is a share read: a `GET` or a `HEAD` whose path, under the
  service's API prefix, a pattern under `shareReads` matches segment by segment, as many segments as the
  pattern has, each the one written there, or any one segment where the pattern holds a placeholder. The
  segment `{token}` matches stands for the token, so every share read carries it.
- **How it is relayed.** A console relays a share read with no session behind it and, whoever is signed in,
  with no owner key and no role, so the read is the same for every holder of the token. It relays nothing
  else of the service without a session.
- **How it is answered.** A service answers each share read for a live token alone, and only with what that
  token opens; a token that opens nothing is refused as absent. Its module, its stylesheet and its words are
  answered with no owner key and no role where its manifest names a share read, since a reader with no
  sign-in loads them; they carry no reader's data.

## Translation

A console may name a **translator**: a service with a route that takes texts and a language and
answers their readings. The layer states the route's shape and asks it through the `translation`
module; the console names the service and the route in its runtime configuration, with how many
texts one ask carries and how many asks stand at once; a bundle that translates names that service
under `calls`, and its screens hand the module texts and a language.

- **The ask** is a `POST` of a JSON object: `language`, a language tag, and `originals`, the texts in
  order.
- **The answer** is a 200 with a JSON object holding `readings`, one for each original in the order
  given, each with `text`, the reading in the language, and `whole`, whether every part of it was
  rendered. An original already in the language is its own reading. A reading that is not whole holds
  the parts the translator could not render as they stood.
- **A busy answer is waited out.** A 503, a translator taking no more asks for now, and a 504, a
  console that waited past its bound for the translator to begin answering, are each asked again
  with the same originals after a wait: 2 seconds, then 4, then 8, three asks again at most. An ask
  still answered busy after the last answers each of its originals as **untranslated**: the original
  itself, not whole, marked `untranslated`. The other asks of the same translation are answered as
  they came, and a screen shows an untranslated text as its original.
- **Any other answer is a refusal,** and the module answers the screen with a failure rather than a
  reading. A screen shows its own texts where a translation fails; a translation never stands in the
  way of reading the original.
- **Where the console names no translator,** nothing translates: the module answers every ask with
  the failure, and a screen asks whether a translator is named before offering a translation.
- **The module asks sparingly.** It sends each distinct original once, answers an empty one as itself,
  and keeps each whole reading for the life of the tab, by its language and original, so no text kept
  is asked for again, by a later translation or by an ask made again after a busy answer. A reading
  that is not whole, an untranslated one among them, is answered and not kept. The readings stand in
  the order of the texts handed, whatever order the asks were answered in.
- **How much it asks at once is the console's.** One ask carries at most the console's `batch`
  originals, by default 4, and the tab holds at most the console's `asksAtOnce` asks out at once, by
  default 1. The bound is the tab's, not a screen's: every translation in the tab waits its turn
  behind it, and an ask waiting out a busy answer holds its place while it waits.

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
- **The service is the guard.** On every route the screens use, its module, its stylesheet and the
  routes under `relays` among them, a service refuses a call that lacks the console's credential with
  a 401, and a call whose `Owner-Role` is missing or does not allow the manifest's role, or, where
  the manifest asks for the owner key, whose `Owner-Key` is missing, with a 403. A share read is held to
  its token instead of the role and the owner key, and so are the module and the stylesheet of a manifest
  that names one ("Share pages"). It answers a call with the owner's own data and
  never another's. A route that needs more than the screen's role refuses on its own terms; the
  manifest's role is the floor of every route, not the whole of the service's guard.
- **A relayed route serves the service's other callers too.** A route under `relays` is the
  service's own, which callers other than a console reach on their own terms; a call to it that
  carries the console's credential and a reader's role is held to the manifest's role and owner key
  as every route of the screens is, so a reader reaches through a console no more of it than the
  manifest opens.

## What a console owes

- **It shares its libraries** with every bundle it loads: each path of `vue`, `vue-router`,
  `vue-i18n`, `nuxt/app`, `@nuxt/ui` and this layer a bundle imports resolves in the browser to the
  copy its app runs. It extends this layer and owes it what the layer asks of a host
  (`docs/boundary.md`, "What the host owes").
- **It finds the services** as the contract states: its own list, every manifest read through the
  shared module, the absent left out and the conflicting refused.
- **It attaches each bundle by its manifest alone:** an entry under its title and icon leading to its
  screen path, for the readers its role allows; a relay of its service under the relay base, for the
  service's API prefix, the routes under `relays`, its module and its stylesheet; the stream and the
  WebSocket where the manifest asks for them; the bundle's words; and its notice kinds.
- **It relays a bundle's calls** to the services named under `calls` on each called service's own
  terms, and refuses a call from a bundle's page to a service another manifest names that the bundle
  does not name.
- **It names its translator, where it has one,** in its runtime configuration under `bmoUi`, as
  `translator`: the service's name, which a bundle names under `calls`, the path of its translating
  route on the service's own API, which that service's manifest lets through under its API prefix or
  among its `relays`, and, where it holds others than the defaults, the most originals one ask
  carries and how many asks a tab holds out at once (`docs/boundary.md`, "What the host owes").
- **It offers its title bar, where it draws one over every screen,** under the key `bmo-console-title-bar`,
  and draws it over a bundle's route that asks for it in its meta ("How a bundle mounts", the title bar): the bar
  and its place stand before that route's screen mounts, on every way to it — the first load, from another of the
  console's screens, from another bundle's — and stay while the screen being left still stands.
- **It keeps a screen's foot clear,** standing whatever it floats over the page area of its own accord above every
  element carrying `data-screen-foot` ("How a bundle mounts", the screen's foot), so it does not cover a screen's
  foot bar until the reader moves it there.
- **It sets the owner key and the role** on everything it relays but a share read, and replaces any the
  browser sent.
- **It opens a bundle's share page to a reader with no session** ("Share pages"): the page's address, that
  bundle's module, stylesheet and words, and the share reads its manifest names, each relayed with no owner
  key and no role; nothing else of any service without a session.
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
- **It names a route of its own under `relays`** only where a console's screens need it as the
  service's other callers have it, so no route of the service stands twice, once for a console and
  once for the rest.
- **It guards every route itself** by the console's credential, the role and the owner key, as the
  contract states, and each share read by its token.
- **It names a share read** only for what its share page reads, each answering only what a live token opens.

## Who reads the contract

A coding harness building a bundle reads the contract through the layer's MCP server, which answers
the manifest's route, its JSON Schema and this document whole (`docs/harness.md`).
