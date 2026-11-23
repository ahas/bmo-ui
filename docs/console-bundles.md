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
  `vue-router`, `vue-i18n`, `nuxt/app`, `@nuxt/ui` and this layer, the libraries the shared module
  `console-manifest` lists, written as the package's own path of what it imports, and carries
  everything else itself. The console resolves each of those paths to the one copy its app runs, so
  every bundle draws with the console's components, reads the console's app and runtime configuration
  and calls through the console's fetcher.
- **Its screens draw a control the layer has a component for with that component,** so the control
  behaves on a bundle's screen as on the console's own: an icon button is the layer's `IconButton`,
  whose one name is its accessible name and its tooltip and which a held finger names, and words that
  say more than what they stand on go through the shared `HintTip` (`docs/components.md`, "Actions
  and the toolbar" and "Tooltips"). The library's button inside the library's own tooltip is no icon
  button of a bundle's: a finger never brings that tooltip up.
- **It is built on one release of this layer,** the one its console runs, and names that release in
  its manifest ("The layer a bundle is built on").
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
| `formerScreenPaths` | The paths the bundle's screens stood under before, each written as a screen path is; none the screen path, none standing under it or over it, none under or over another, and none twice. A console answers every address under one as moved to the same address under the screen path ("A screen that moved"). | no, none |
| `serviceName` | The service's name, in kebab-case, which a console relays the service under; never `people`, the name a console answers the company's members under itself ("How a console finds the services"). | yes |
| `layer` | The version of this layer the bundle was built on, as the bundle build wrote it beside the module ("The layer a bundle is built on"). | yes |
| `bundle` | The path of the service's API its module is answered at. | yes |
| `stylesheet` | The path of the service's API its stylesheet is answered at. | no, none |
| `words` | The path of the service's API its words are answered at. | yes |
| `apiPrefix` | The path of the service's API every call the screens make stands under. A console relays nothing of the service outside it but the module, the stylesheet and the routes under `relays`. | no, `/` |
| `role` | The least role a reader holds to open the screen: `administrator` or `member`. | yes |
| `sidebarSection` | The section of a console's sidebar the bundle's entry stands in: `administration`, among the services an administrator runs the system with, `application`, among the applications a reader works in, or `account`, in the reader's own menu, among what concerns the reader's own account and their use of the console ("How a bundle mounts", the sidebar section). | no, `application` |
| `sidebarSections` | The section the entry stands in for a reader by the role they hold, where it is not `sidebarSection`: each key a role, each value a section ("How a bundle mounts", the sidebar section). | no, none |
| `ownerKey` | Whether every call the screens make needs the reader's owner key. | no, false |
| `events` | Whether the screens read the service's event stream through the console. | no, false |
| `websocket` | Whether the screens open a WebSocket to the service through the console. | no, false |
| `pushKinds` | The service's event kinds a console may raise as a notice to a reader who is not on the screen, each written as the stream names it, a resource and its change. | no, none |
| `pushPlaces` | The place on the bundle's screen a notice of a kind under `pushKinds` opens, by kind: each key one of those kinds, each value a place pattern, a path at or below the screen path whose segments stand as written or as a placeholder, a name in camelCase in braces matching any one segment, which a console fills from the event's member ("How a bundle mounts", notices). | no, none |
| `pushReaders` | The readers a notice of a kind under `pushKinds` rings, by kind: `{"role": …}`, the readers holding that role, or `{"field": …}`, the one account whose key the event's member holds under that camelCase field ("How a bundle mounts", notices). | no, none |
| `sidebarUnread` | The route a console reads a sidebar unread count from: `path`, a path of the service's API under the API prefix, whose JSON answer holds the count at its root under `field`, a camelCase name, as a whole number nought or more. A console draws a positive count on the bundle's sidebar entry. | no, none |
| `calls` | The other services the screens call through the console, each by the service name its own manifest gives it, or `people`, the company's members a console answers itself ("How a bundle mounts", the company's members), in kebab-case; never the bundle's own service, and none twice. | no, none |
| `relays` | The service's own routes outside the API prefix that a console relays as well, each its `method` (`GET`, `POST`, `PUT`, `PATCH` or `DELETE`) and its `path`, one whole path of the service's API; none twice. | no, none |
| `shareReads` | The reads a share token alone permits, each a path pattern of the service's API under the API prefix: a path whose segments stand as written or as a placeholder, a name in camelCase in braces matching any one segment, with `{token}` among them once, standing for the token. A console relays a `GET` or a `HEAD` whose path a pattern matches with no session ("Share pages"); none twice. | no, none |
| `shareHead` | The read a console asks for what a share address reads as before it is opened: a path pattern of the service's API under the API prefix, written as a share read's pattern is, holding `{token}` once and no other placeholder ("Share pages", the head). | no, none |

Reading a manifest fills each optional field that states a default with it, so a console reads every
field of every manifest but the stylesheet and the sidebar count, which stand only where a manifest
names them.

## The layer a bundle is built on

A bundle runs on the console's own copies of the shared libraries, this layer among them. Every
release of the layer declares how far back it stays compatible, and a console attaches a bundle built
on any release from that bound up to its own.

- **One file per version.** The layer is taken as the one packed file its release verb writes for a
  version, kept under the layer's `releases/` by the version's name, beside a ledger of each file's
  sha256 and bound (the README, "Version"). Every packed file is a release in this document's sense:
  the set's release, packed from the commit its tag names, or a day's nightly packed between releases,
  as `1.1.0-nightly.20261124` and `1.1.0-nightly.20261124.2` after `1.0.0`. A service and a console
  vendor that file as it stands, checked against the ledger, and never pack the layer from its source;
  so one version names one set of bytes wherever it runs.
- **The bundle build names the layer.** A bundle is built with the layer's bundle build
  (`docs/boundary.md`, "The bundle build"), which leaves the shared libraries unbundled and writes
  the layer's version into `layer.json` beside the module. The service answers that version as the
  manifest's `layer`, never one written by hand.
- **The bundle build holds the words.** It is handed the bundle's name and its words, and refuses a
  bundle whose screens ask for a key under the layer's domains that the `wording-keys` list lacks, a
  key under the bundle's namespace a locale's words do not answer, or a key of any other domain, and
  words holding a tree beside the namespace ("How a bundle mounts", the words).
- **Every release declares its bound:** the oldest release whose bundles still run on it unchanged.
  - A release that only adds — a component, a module, an export, an optional prop, field or argument,
    a wording key — keeps the bound of the release before it.
  - A release that takes away or changes anything a bundle built on an earlier release reads — an
    export, a prop, what a component or a module does that a screen relies on, a wording key, a
    shared library — raises the bound to itself.
  - The bound is judged from the release's own change against the boundary (`docs/boundary.md`), and
    never falls from one release to the next.
- **The release carries its bound.** The release verb is handed the bound and the reason for it, and
  refuses a release that names either not at all. It writes both into the ledger beside the packed
  file's sha256, and into the release's own version file the bound and every release from the bound up
  to itself, in the order they were released. The shared module answers the console's own version,
  its bound and those releases (`docs/boundary.md`, `console-manifest`), so a console knows them
  without unpacking anything or reading the ledger.
- **A console attaches a bundle built inside its range.** A manifest whose `layer` is one of the
  releases the console's layer names, from its bound up to its own, attaches. One built on a release
  older than the bound, on a release newer than the console's or on a layer taken from its source is
  left out as a manifest that does not read is: no menu entry, no relay and no notices. The console
  records why, naming the manifest's layer, its own and its bound, where its administrator reads what
  it left out, so a bundle missing from the menu is explained there.
- **Why a range and no further.** A bundle imports the layer's components and modules, and the
  libraries' own, as the release it was built on has them, and finds the console's in their place. A
  release that only adds leaves all of those where the bundle found them, so a bundle built on any
  release from the bound up runs unchanged. One older than the bound may reach for what the console's
  release took away or changed, and would fail while a reader uses the screen, after its manifest read
  clean; one newer than the console's may reach for what the console's release does not have yet.
- **The range is a list, never an order.** Which releases stand inside it is the list the release
  names, never an order read off the version strings, since the layer's earlier numbering does not
  sort with its later one, and a nightly packed before a patch release sorts after it.
- **A layer taken from its source is no release.** Installed from its source rather than from a
  release's file, the layer names its version marked `+source` and no release but itself, so a bundle
  built on it stands inside no console's range.
- **A release that raises the bound moves everything together.** The console and every bundle built
  on a release older than the new bound are built on the new release; a bundle not yet rebuilt stays
  out of the console's menu until its service rebuilds it. A release that keeps the bound moves the
  console alone, and each bundle comes onto it when its service next builds.

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
- **A manifest built on a layer outside the console's range leaves its service out,** and the console
  records the manifest's layer, its own and its bound ("The layer a bundle is built on").
- **Two manifests sharing a name, a screen path or a service name** leave both services out, rather
  than either attached over the other. A former screen path counts as a screen path here: one manifest's
  screen path or former screen path that is another's screen path or former screen path is shared.
- **A manifest whose service is named `people`** leaves its service out, since that name is the console's own
  ("How a bundle mounts", the company's members), and the console records why.
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
  the layer's own `common.*` and `files.*` keys that the console answers, which are the keys the
  `wording-keys` list holds and no others. A key the console's own pack happens to hold besides is
  not the bundle's to ask for. The words a screen draws belong to the bundle that draws it, so a
  console carries none of them: it merges each bundle's words into its pack. The bundle build refuses
  a bundle that asks for any other key ("The layer a bundle is built on").
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
  service's manifest; the company's members, which no manifest names, are relayed on the console's own
  terms (below). A call from a bundle's page to a service another manifest names, or to `people`, which is
  neither the bundle's own nor one it names under `calls`, is refused with a 403. The console knows the page a
  call comes from by the page address the browser sends with it; reading another bundle's module, its
  stylesheet or a file beside its module is never refused, so a screen opened from another stands.
- **An address is complete as given.** Whatever a screen hands the browser — a call through the
  app's fetcher, a picture's source, a link, a download, an event stream, a socket — it hands the
  address the module answers for it, and the console adds nothing. The app's fetcher leaves
  an address already under the app's base path as it is, so the same address serves a call and a
  raw address alike.
- **The title bar.** A console may draw one title bar over every screen, a bundle's among them. Where it
  does, it provides an object under the injection key `bmo-console-title-bar`, and the object names the bar
  alone: beside the title the bar holds the screen's name and mark and nothing a screen lays into it. A route
  that asks for the console's bar says so in its meta, `consoleTitleBar: true`, and the console draws the bar
  over it, named by the manifest's title and icon. A screen whose route asks and that finds the key provided
  draws no bar of its own. Found without the key — on its service's own page, or under a console that draws
  no shared bar — it draws its own bar with its name and mark alone. A route that does not ask stands as its
  bundle draws it.
- **A screen that stays across addresses.** A console stands a new copy of a screen whenever the address
  changes what its route's path names. A route that keeps one copy standing across such changes — a player
  going on to the next video at its own address — names the copy in its meta, `key`, as one fixed word, and
  the console keeps the screen standing while the word stays the same, reading the new address in place.
- **The screen's own row.** What acts on a screen as a whole stands at the right end of the screen's own row
  directly under the title bar, and its way back to the screen it was opened from at that row's left end,
  under the console's bar and its own alike. Where the screen already has a row there, its tab bar or its
  toolbar, that row holds them; otherwise the screen draws one, and never a second.
- **The people directory.** A console that keeps accounts with names may offer a screen the people of the
  reader's company, every account standing anywhere under the top-level organization unit the reader's own
  unit belongs to, under the injection key `bmo-console-people`, as an object of three reads: `search`,
  given words, answers the people whose name, organization or job title holds them, at most twenty; `person`,
  given an account key, answers that person or null where none stands; `me` answers the signed-in reader, or
  null where the login has no account. A person is `user` — the account key,
  written as the console writes the owner key ("Roles and the owner key") —, `name`, `organization` and
  `jobTitle`. A screen that names people — an assignee, an author — picks them through `search` and draws each
  by the name `person` answers; found without the key, it stands each account as its key.
- **The company's members.** A console that keeps accounts with names may answer the members of the reader's
  company itself, as a service under the name `people` that no manifest gives. A screen that needs the whole
  company at hand asks `GET` at the address the `relay` module answers for `people` and `/members`, the one read
  the contract gives the name: a screen asks nothing else under it, and whatever else a console answers there is
  its own. The answer is a 200 with a JSON object holding
  `members`: every person of the reader's company who has not left it, in the people directory's order, each
  with `user`, the account key written as the console writes the owner key ("Roles and the owner key"), and
  `name`, and nothing more. A screen knows the name and the path alone; where the console reads the members
  from is its own.
  - **It is read by a reader signed in.** A call with no session is refused with a 401. An administrator reads
    it always; a member reads it where the console's own permissions let them read its people, and is answered
    as absent otherwise. A login with no account reads an empty list.
  - **A bundle's page reaches it only where its manifest names `people` under `calls`,** the page told by the
    page address the browser sends with the call, as for every service; a call from any other bundle's page is
    refused with a 403. A page of the console's own reaches it.
  - **The name is the console's.** A manifest whose service is named `people` is left out ("How a console finds
    the services").
  - **Under a console that answers no members,** the call is refused and the screen stands without the list.
- **Sharing.** A screen that shares what it shows opens the layer's share dialog (`docs/components.md`,
  "Sharing") and hands it its roads. The link road is the bundle's own service: the link read, made and
  ended there, and the share page it opens ("Share pages"). The member road is handed only where the screen
  finds the people directory: its search is the directory's `search`, whose person is the dialog's person as
  it stands, and reading, granting, changing and taking back who the thing is shared with are calls to the
  bundle's own service, each member named by the account key and given a permission, `read` or `edit`.
  Found without the key, the screen hands no member road and the dialog shares by link alone.
- **The screen's foot.** A bar a screen stands at its foot for the reader to act from — an input bar, a row of
  keys — carries the attribute `data-screen-foot`. What a console floats over the page area of its own accord
  stands above every element so marked, so it never covers that bar until the reader moves it there.
- **Notices.** A console that raises notices reads the service's event stream for the kinds under
  `pushKinds` and raises each in the words the bundle's words give that kind, under the bundle's
  namespace, to the readers whose role allows the manifest's, or to the readers `pushReaders` names for the kind. The
  words' placeholders, and those of the
  place below, are filled from the event's member, the record the event carries under `data`: a placeholder
  names a field of it, text or a number.
  - **Who a notice rings.** Where `pushReaders` names readers for the kind, a notice rings them alone: the readers
    holding the role it names, or the one account whose key the member's field it names holds, written as the
    console writes the owner key; a member whose field holds no key rings nobody. Where it names none, the notice
    rings every reader the manifest's role allows. The shared module's `noticeReaders` answers which.
  - **Pressing a notice opens its place.** Where `pushPlaces` names a place for the kind, the notice opens
    that pattern with each placeholder replaced by its field, escaped as one segment of an address; where it
    names none, or a placeholder's field is absent, empty, a dot or two, or neither text nor a number, the
    notice opens the screen path. The place is a screen address and calls nothing, so a bundle names there only what its own
    routes answer, and the screen reads what the address names as it reads any address a reader opens.
- **The sidebar section.** A console whose sidebar parts its entries into sections draws a bundle's entry in
  the section its manifest names under `sidebarSection`: `administration` among the services an administrator
  runs the system with, `application` among the applications a reader works in, `account` in the reader's own
  menu, the menu a console keeps of what concerns the reader's own account and their use of the console. The
  section places the entry and opens it to no one: who sees it is the manifest's `role`. A console that draws one
  list draws every entry in it alike, and one that keeps no menu of the reader's own draws an `account` entry in
  that list too.
  - **A section by role.** Where `sidebarSections` names a section for the role a reader holds — the role itself,
    never one it allows — the entry stands there for that reader instead; the shared module's `sectionFor`
    answers it. So one screen whose face differs by role, a sender's road for a member and an inbox for an
    administrator, stands where each reader looks for it, and a reader meets one entry of it only.
- **The sidebar count.** Where a manifest names a `sidebarUnread`, a console reads the count for the
  reader whose sidebar it draws, with its own credential and that reader's owner key and role, and draws
  a positive count on the bundle's sidebar entry. It reads the count again as it chooses; one that did
  not answer leaves the last count standing, and none is drawn before one has.

## A screen that moved

A bundle whose screens stood under another path names that path under `formerScreenPaths`, so every address
a reader kept, a share link among them, still reaches its screen.

- **A console answers it as moved.** An address under a former screen path, the path itself or a path below
  it, is answered with a permanent redirect that keeps the method (308) to the same address with the former
  screen path replaced by the screen path, and its query kept as it was. A browser keeps the fragment itself
  across the redirect. The shared module answers the address a path moved to.
- **For every visitor alike.** The redirect is answered before any sign-in is asked for, to a reader with a
  session and to one with none, since what the moved address opens is decided at the address it moved to.
- **It is the bundle's own.** A bundle names its own former paths, and a console reads them from the manifest
  alone, keeping no list of its own.

## Share pages

A share page opens what a token opens of the service to whoever holds the token, with no account and no
sign-in: one resource or several, as the service holds them under the token. The token is the whole of the
permission: the page reads only what its token opens, through the reads the manifest names under
`shareReads`.

- **Where it stands.** A bundle's share page is the route under its screen path at `/share/` and the token,
  one segment. A console serves that address to a reader with no session, and gives that reader the one
  bundle whose screen path is the longest the address stands under: its module, its stylesheet and its
  words, and nothing else of any manifest.
- **What it reads.** Every call the page makes is a share read: a `GET` or a `HEAD` whose path, under the
  service's API prefix, a pattern under `shareReads` matches segment by segment, as many segments as the
  pattern has, each the one written there, or, where the pattern holds a placeholder, any one segment that is
  not empty and does not read, plain or escaped, as a dot or two. The segment `{token}` matches stands for
  the token, so every share read carries it.
- **How it is relayed.** A console relays a share read with no session behind it and, whoever is signed in,
  with no owner key and no role, so the read is the same for every holder of the token. It relays nothing
  else of the service without a session.
- **How it is answered.** A service answers each share read for a live token alone, and only with what that
  token opens; a token that opens nothing is refused as absent. Where its manifest names a share read, its
  module and its stylesheet are answered with no owner key and no role, since a reader with no sign-in loads
  them, and they carry no reader's data.
- **What it reads as before it is opened.** A chat app or a browser drawing a card for a share address reads the
  page the console serves there and runs none of it, so a page whose head the module writes reads as nothing.
  Where the manifest names a `shareHead`, the console asks it before it serves the page at a share address, and
  writes what it answers into the head of the page it serves, so the card is drawn with no script run.
  - **The ask.** A `GET` of the pattern with the address's token in place of `{token}`, its query `language`
    the primary language subtag of the language the console shows its pages in. It is asked with the console's
    own credential and, as every share read, with no owner key and no role, whoever is signed in.
  - **The answer** is data, never markup: a 200 with a JSON object holding `title`, what the page names its
    resource by; `url`, the share address's whole public address, its own canonical one; `locale`, the locale
    of the language the page is shown in, as Open Graph writes one, a language and a region joined by an
    underscore; `siteName`, the name the card stands under; and `type`, the Open Graph type of the resource.
    Where they stand it holds `description`, what the card says of the resource; `image`, the resource's
    picture as the path of a share read the manifest names, carrying the address's token; and `kind`, the word
    the page names the resource's kind by, for a reader of the head that draws it. Each word is in the language
    the ask named where the service holds its words in it.
  - **What the console writes.** Into the head of the page it serves at that address, each value written as an
    attribute's or an element's text and escaped, so no value closes its tag: the title as the page's title,
    `og:title` and `twitter:title`; the description as the page's description, `og:description` and
    `twitter:description`, none of the three where there is none; `og:type`, `og:site_name`, `og:locale`,
    `og:url` and the canonical link from the answer; the image's whole public address, the address the console
    relays that share read at on the origin of the answer's `url`, as `og:image` and `twitter:image`, neither
    where there is none or where the path is no share read the manifest names; `twitter:card`, a large picture's
    card with an image and a summary without; and a request that search engines not index or follow the page.
    The module still writes its own head once it runs.
  - **A head that does not answer leaves the page as it is.** A refusal, any answer but a 200, an answer that
    does not keep the shape, a call nothing took or a manifest naming no `shareHead` leaves the page the console
    serves at the address with no head of the resource's, and the reader is shown nothing of it.

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
- **The console sets two headers** on every call and socket it relays but a share read, which carries
  neither ("Share pages"), in place of any the browser sent: `Owner-Key`, the signed-in login's user on the account service, its id written as a decimal
  number, which a login with no user carries none of; and `Owner-Role`, the role the reader holds.
  The console's own credential on the call is what makes them the console's word.
- **The console offers a screen** only to a reader whose role allows the manifest's role, and a screen
  whose manifest asks for the owner key only to a login that has one: no menu entry, no module and no
  notice for anyone else. A bundle's share page is the one exception: its module, its stylesheet and its words
  are given to whoever opens its address, with no session ("Share pages"). This spares a reader a screen that
  would refuse them; it guards nothing.
- **A console may withhold a screen by a policy of its own** — a setting of the reader's organisation that turns the
  service off for them, say — and then offers that reader no menu entry, no module and no notice, and refuses
  the calls it would relay for them; the service learns nothing of the policy and guards every route as ever.
- **The service is the guard.** On every route the screens use, its module, its stylesheet and the
  routes under `relays` among them, a service refuses a call that lacks the console's credential with
  a 401, and a call whose `Owner-Role` is missing or does not allow the manifest's role, or, where
  the manifest asks for the owner key, whose `Owner-Key` is missing, with a 403. A share read is held to
  its token instead of the role and the owner key, and the module and the stylesheet of a manifest that
  names one are answered with no owner key and no role ("Share pages"). It answers a call with the owner's own data,
  and with what another account has shared with the owner as a member ("How a bundle mounts", sharing) as far as the
  permission given opens it: a member given `read` its reads, one given `edit` its writes as well, and nothing of
  another's beyond that. A route that needs more than the screen's role refuses on its own terms; the
  manifest's role is the floor of every route, not the whole of the service's guard.
- **A relayed route serves the service's other callers too.** A route under `relays` is the
  service's own, which callers other than a console reach on their own terms; a call to it that
  carries the console's credential and a reader's role is held to the manifest's role and owner key
  as every route of the screens is, so a reader reaches through a console no more of it than the
  manifest opens.

## What a console owes

- **It shares its libraries** with every bundle it loads: each path of the shared libraries the
  shared module lists that a bundle imports resolves in the browser to the copy its app runs. It
  extends this layer and owes it what the layer asks of a host (`docs/boundary.md`, "What the host
  owes").
- **It runs one release of the layer,** vendored as its file stands, and leaves out every bundle
  whose manifest names a release outside that release's range, recording the manifest's layer, its
  own and its bound where its administrator reads them ("The layer a bundle is built on").
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
  stands before that route's screen mounts, on every way to it — the first load, from another of the
  console's screens, from another bundle's — and stay while the screen being left still stands.
- **It offers its people directory, where it keeps named accounts,** under the key `bmo-console-people`
  ("How a bundle mounts", the people directory), answering its reads for the signed-in reader alone, with no
  contact detail in them.
- **It answers the company's members, where it keeps named accounts,** under the service name `people`
  ("How a bundle mounts", the company's members): a `GET` of `/members`, each member's `user` and `name`
  and nothing more, to a reader signed in as its own permissions let them read its people, the administrator
  always; to a bundle's page only where its manifest names `people` under `calls`, any other bundle's page
  refused with a 403. It leaves out a manifest whose service is named `people`, recording why.
- **It keeps a screen's foot clear,** standing whatever it floats over the page area of its own accord above every
  element carrying `data-screen-foot` ("How a bundle mounts", the screen's foot), so it does not cover a screen's
  foot bar until the reader moves it there.
- **It places a bundle's entry in the section its manifest names,** where its sidebar parts entries into sections
  ("How a bundle mounts", the sidebar section), for each reader the section named for the role they hold where the
  manifest names one, reading the section from the manifest alone and keeping no list of its own of which bundle
  stands where.
- **It rings a notice for the readers the manifest names for its kind** ("How a bundle mounts", notices), and for
  every reader the manifest's role allows where it names none.
- **It states its version, where its deployment names one,** in its app configuration under `bmoUi`, as
  `consoleVersion` (`docs/boundary.md`, "What the host owes"), so a screen that carries where it was used from,
  a report a reader sends among them, names the console it was used in.
- **It draws the sidebar count a bundle declares** ("How a bundle mounts", the sidebar count), reading it for the
  reader whose sidebar it draws and leaving the last count where a read does not answer.
- **It answers a moved screen's addresses** ("A screen that moved"): every address under a bundle's former
  screen path, to every visitor, with a 308 to the same address under its screen path, its query kept.
- **It sets the owner key and the role** on everything it relays but a share read, and replaces any the
  browser sent.
- **It opens a bundle's share page to a reader with no session** ("Share pages"): the page's address, that
  bundle's module, stylesheet and words, and the share reads its manifest names, each relayed with no owner
  key and no role; nothing else of any service without a session.
- **It writes a share page's head where the manifest names a `shareHead`** ("Share pages", what it reads as
  before it is opened): it asks the read for the address's token and writes the escaped tags of its answer into
  the page it serves there, and leaves the page as it is where the read does not answer.
- **It states its relay base** in its app configuration, under `bmoUi`, as `relayBase`: the path every
  service is relayed under, from the app's base path. Where none is stated, a service is called at its
  name from the app's base path.
- **It serves the app under one base path,** Nuxt's own `app.baseURL`, which the relay module reads
  from the runtime configuration each time it makes an address and puts ahead of the relay base. An
  address that already stands under the base path is not given it twice, so a relay base stated with
  the base path in it reads the same.

## What a service owes

- **It answers its manifest** at the route, by the schema, read in a test through the shared
  module's reading, so a manifest that breaks the contract fails there first.
- **It builds its bundle on the console's release of the layer,** vendored as its file stands, with
  the layer's bundle build handed the bundle's name and the words it answers, and answers the layer
  that build wrote as the manifest's `layer`. A bundle built on an earlier release inside the
  console's range keeps attaching until the service rebuilds it.
- **It answers its module, its stylesheet and its words** at the paths the manifest names.
- **It leaves the name `people` to the console:** its manifest never gives it as the service's name, and names it
  under `calls` where its screens read the company's members ("How a bundle mounts", the company's members).
- **It names a route of its own under `relays`** only where a console's screens need it as the
  service's other callers have it, so no route of the service stands twice, once for a console and
  once for the rest.
- **It guards every route itself** by the console's credential, the role and the owner key, as the
  contract states, and each share read by its token.
- **It keeps who a thing is shared with,** where its screens share with members: each member by the account key,
  with the permission given, which only the thing's owner grants, changes and takes back. It holds a member's calls
  to what that permission opens, and answers a member's reads of what is shared with them as it answers the owner's.
- **It names a share read** only for what its share page reads, each answering only what a live token opens.
- **It names a `shareHead`** only where its share page has a head of its own, answering it for a live token alone,
  as data in the shape the contract states, and refusing a token that opens nothing as absent.

## Who reads the contract

- **This document is the contract's one statement.** A repository whose service has a bundle, and a
  console, name this document in their own documents with the parts of it they use (a share page, a
  sidebar count, a sidebar section, the people directory, the company's members, sharing with members, a translator) and what they add of their own. They do not copy
  its rules, its fields or its headers: a copy trails this document as soon as it changes.
- **Conformance is held by shared checks,** never by a repository's own prose: the console face of
  the base library the services build on, which serves the manifest, the module, the stylesheet, the
  words and the guard as this document states them, with tests that read the served manifest through
  the shared module's reading, which every service using it inherits; the layer's bundle build, which
  holds every bundle's screens to its words and the layer's keys as it builds; and the checks a
  service passes before it goes live, which hold every vendored copy of the layer to the one release
  the console runs and probe the service's console face once it has started.
- **A coding harness** building a bundle reads the contract through the layer's MCP server, which
  answers the manifest's route, its JSON Schema and this document whole (`docs/harness.md`).
