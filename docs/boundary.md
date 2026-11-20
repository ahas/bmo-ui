# The boundary

Everything the layer exposes and everything a host owes it. A change to anything listed here follows
the version rules in the README, and this document changes in the same commit. What each piece does
is stated in `docs/design.md`, `docs/wording.md` and `docs/components.md`; the console plugin
contract in `docs/console-bundles.md`; the harness plugin in `docs/harness.md`.

The guard test holds the code to this document: every component, page plugin and module the layer
ships is named here with everything it exports, nothing is named here that it does not ship, and the
wording keys listed here are the ones the layer's list holds.

## How a host takes it

- **The host vendors a release's file** as it stands, the one the release verb wrote under
  `releases/` for the version, checked against the sha256 the ledger beside it names, and installs
  that file; it never packs the layer from its source (the README, "Version"). The manifest's
  `bmo-ui` dependency is a file dependency on that file inside the host's checkout, and the vendor
  verb moves every such dependency under the checkouts it is handed onto another release, copying
  the file, checking it against the ledger, removing the old one and writing the lockfile again.
- **The host extends the layer** from its Nuxt configuration. The layer brings Nuxt UI as its module,
  its stylesheet, fonts and overrides, its components, its page plugins and its head.
- **Components are registered by name** through the layer, and a host uses them as its own.
- **Domain modules and shared modules are imported by path** from the package: the domain modules
  under its `app/domain/`, the shared modules under its `shared/`.
- **The layer reaches its own files by relative path.** In a host, Nuxt binds the aliases of a
  project's own folders (`~`, `~~`, `@`, `@@`, `#shared`, `#server`) to the host's folders, and both
  the host's build and the host's typecheck read the layer's files under those bindings. So every
  import a layer file makes of the layer's own modules, a type-only one as much as one loaded at run
  time, names it by a path relative to itself; through an alias it would resolve into the host,
  failing the host's build where it is loaded and the host's typecheck where it only names a type.
  The guard test holds every file under `app/` and `shared/` to this.

## Components

| Component | What it is |
| --- | --- |
| `ActionGroup` | The one group of actions on what a tab or a toolbar stands for, folding to a menu; the properties action last. |
| `ArtworkFrame` | A card's picture at one of the artwork shapes, whole over a ground of itself where its shape is not the frame's, or its kind's mark over its name where it has none. |
| `AudioPlayer` | A kept sound: a play and pause button, its waveform as its progress, a volume popover and a download. |
| `AvatarGroup` | The library's avatars overlapping in one moving row, each on a ring of its ground, the rest past a most counted in a cap. |
| `CardRow` | A heading over one line of cards that scrolls sideways, paged by a pointer's buttons and swiped by a finger, with the link that opens it whole. |
| `ChoiceSelect` | The one select a value is chosen from a list in, the library's select menu searching once it holds more than seven choices, or always over a road that finds them or in free entry, where words no choice shows are offered as a new value, and a list of several values may end one at the separators the screen names. |
| `ChooseAll` | The three-state checkbox that takes every row shown or gives the choice up. |
| `ColumnResizeHandle` | The right edge of a column's name, dragged or moved with the arrow keys. |
| `CreateButton` | The one button a screen creates from: a grey icon in its row on a wide screen, a floating primary icon on a phone drawn under every overlay, its key named in its tooltip; marked `contained`, an add that belongs to a row, a sidebar's or a list's head, a tab bar or a dialog's or a drawer's row, is that row's grey icon at every width, answering no key. |
| `ContentSkeleton` | The placeholder region: busy status, a surface nothing presses through, the caller's piece repeated. |
| `CutLineTip` | The one layer that shows any line cut with an ellipsis whole, in the shared tooltip. |
| `DataTable` | The shared table: sideways scroll, stuck names, movable widths, labelled parts, three layouts. |
| `DataTableSkeleton` | The shared table's placeholder, its head and rows in the table's own columns, box and height. |
| `DateCalendar` | The one calendar a date is chosen on, the library's own, each paging button named in the host's words in the shared tooltip. |
| `FilesConflictDialog` | The one question when a change would land on names already taken. |
| `FilesNameField` | A name renamed in place, chosen up to its ending. |
| `FilesProgress` | An upload's progress, by files and by bytes, with a bar. |
| `FilesText` | A text file in the read-only code viewer, coloured by its name's language. |
| `FloatingWindow` | A part of a screen floating beside it: a window moved, sized and kept inside what is visible on a wide screen, a sheet of two heights on a narrow one, folded to a pill dragged like a picture-in-picture window. |
| `GrowingTextarea` | A form's text box that grows with its text and never scrolls inside. |
| `HintTip` | The shared tooltip for words that say more than what they stand on. |
| `IconButton` | A button drawn as its icon alone, its one name heard and shown in the shared tooltip with the keys that press it, a held finger included. |
| `ImageViewer` | A picture opened whole, zoomed and moved by wheel, drag, pinch, double press and buttons. |
| `LoadingImage` | A picture that keeps its place while it loads and says when it failed. |
| `LoadingVideo` | A video that keeps its place while it loads and says when it failed. |
| `MarkupButtonTip` | The one layer that names any button carrying `data-tooltip`, one a host writes as markup or the library draws inside a component of its own, in the shared tooltip. |
| `MarqueeLine` | A line that slides when it is longer than its box. |
| `MessageIsland` | The one pill every notice stands on. |
| `MovingList` | A list whose items come, go and change places by position alone, along the axis its layout gives it. |
| `NumberInput` | The number box, as wide as its values, with its two step buttons. |
| `PaletteSwatch` | A palette's two grounds as dots, in one mode. |
| `PropertyList` | A file's or a document's details as a name and value list. |
| `QuestionDialog` | The question asked before an action, opened through the question module: its way out first, its way through last. |
| `RollingNumber` | A number that turns only its changed characters. |
| `RollingSentence` | A sentence of the pack with turning figures in its placeholders. |
| `ScreenFrame` | The frame of a screen that stands on no shell, pinned to the visible screen. |
| `SearchHit` | The line under a row that matched only in hidden data. |
| `SearchText` | A shown text with the search's hits marked. |
| `SettingsDialog` | A setting's own form as a dialog, asking before it closes on changes. |
| `SettingsGroup` | A group of settings rows under a small heading. |
| `SettingsRow` | One setting: its name, a muted line, its control. |
| `SettingsSegment` | A choice of two or three as one segmented control. |
| `ShareDialog` | The one dialog a thing is shared in: its link made, shown, copied and ended, and the members it is shared with found, listed and taken off, over the roads the host hands it. |
| `ShellClose` | The close of a modal or a side sheet. |
| `SkeletonBar` | The one shimmering bar. |
| `SkeletonLine` | One line of text not yet arrived. |
| `SkeletonStatus` | The busy status alone, for a place kept inline. |
| `SkeletonText` | A passage of placeholder lines. |
| `SteadyFigure` | A figure that keeps the width of the widest it reaches. |
| `TabBar` | The open-and-close tab bar, with pinning, its menu and dragging. |
| `TabSlide` | A tabbed panel that slides sideways as its tab changes. |
| `TabSwitch` | A view switch whose choices share its width. |
| `ThemePreview` | A small piece of a screen in one theme and one mode. |
| `ThemeSwatch` | A theme's accent and raised grey as dots, in one mode. |
| `ToolBar` | The toolbar flush against one target, cells parted by dividers. |
| `UnfoldingBox` | A box held to what it holds, unfolding to each new size or following a part of it that unfolds of its own. |
| `VideoPlayer` | A video: the full player with its own controls, gestures and keys, or the still a message holds, its first frame with a play mark and its length, which opens the full player large. |

## Domain modules

Each is named with everything it exports.

| Module | Exports |
| --- | --- |
| `actionbar` | `BAR_GATHERS_UNDER_PX`, `GATHERED_ACTIONS`, `STANDING_ACTIONS`, `barGathers`, `actionsOutside`, `useBarRoom`, `useBarGathers` |
| `artwork` | `PictureSize`, `ArtworkShape`, `PORTRAIT`, `LANDSCAPE`, `SQUARE`, `ARTWORK_SHAPES`, `LANDSCAPE_FROM`, `SQUARE_PAST`, `FILLS_WITHIN`, `shapeOf`, `rowShape`, `fillsShape` |
| `avatar-group` | `AvatarFace`, `FaceSize`, `FACE_FRAMES`, `facesShown` |
| `bars` | `BarColor`, `BAR_SIZE`, `STACKED_LEGEND`, `INLINE_LEGEND`, `FOLDED_LEGEND` |
| `choices` | `ChoiceItems`, `ChoiceKeys`, `ChoiceFind`, `SEARCH_ABOVE`, `CHOICE_FIND_PAUSE_MS`, `choiceCount`, `searchesChoices`, `choiceFields`, `narrowChoices`, `narrowChoicesInPlace`, `namedChoice`, `typedValue`, `cutValues`, `cutTyped`, `endsValue` |
| `chooseall` | `ChooseAllState`, `chooseAllState`, `chosenRuns`, `chooseAllPress`, `chooseAllLabel`, `CHOOSE_CELL`, `CHOOSE_GUTTER` |
| `closing` | `OVERLAY_CLOSE_MS`, `useHeldWhileClosing` |
| `clipboard` | `copyText` |
| `code-colour` | `colouredRuns`, `colourCode`, `forgetCode` |
| `code-copy` | `blockText`, `copyFromPress` |
| `code-themes` | `CODE_THEMES` |
| `column-widths` | `MIN_COLUMN_PX`, `RESIZE_STEP_PX`, `ColumnWidths`, `tableHeaders`, `setColumnWidth`, `useColumnWidths` |
| `create-button` | `CreateButtonHandle`, `CreateAnchor`, `CreateMenuContent`, `menuContent` |
| `cut-lines` | `LineBox`, `boxCuts`, `cutLineAt`, `cutLineIn`, `lineWords` |
| `diagram` | `isDiagram`, `drawDiagrams` |
| `dialog-origin` | `Press`, `originOf`, `watchDialogOrigins` |
| `dragselect` | `draggedSelection`, `edgeScroll`, `PressKind`, `DragSelectList`, `useDragSelect` |
| `errors` | `failureText`, `answeredLate` |
| `file-icons` | `fileIcon`, `folderIcon`, `iconNames` |
| `floating-drag` | `DragPoint`, `DragBounds`, `DragSide`, `dragSlop`, `isDrag`, `clampTo`, `settledSide`, `glideFrom`, `FloatingDrag`, `FloatingDragHandle`, `useFloatingDrag` |
| `floating-window` | `WindowRect`, `WindowFrame`, `WINDOW_GUTTER_PX`, `WINDOW_STEP_PX`, `WINDOW_LEAP_PX`, `WINDOW_MIN`, `WINDOW_SIZE`, `SHEET_HEIGHTS`, `SheetHeight`, `WidthClass`, `widthClass`, `visibleBox`, `clampRect`, `firstRect`, `stepOf`, `keptRect`, `keepRect`, `keptSheet`, `keepSheet`, `PillSpot`, `pillBounds`, `keptPill`, `keepPill` |
| `foot` | `FootOptions`, `useFootInView` |
| `form-save` | `FormPart`, `FormSave`, `OpenedWith`, `OpenedWithOptions`, `askDiscard`, `useCloseGuard`, `useFormSave`, `useFormPart`, `useLeaveGuard`, `useOpenedWith` |
| `fullscreen` | `PutBack`, `TakePlace`, `keepPlace`, `holdThroughFullscreen` |
| `held-size` | `HeldSize`, `isResizing`, `useHeldSize` |
| `holdmenu` | `HoldMenu`, `useHoldMenu` |
| `icon-styles` | `IconStyleOptions`, `isIconStyle` |
| `island` | `IslandTone`, `IslandAction`, `IslandMessage`, `IslandSaid`, `IslandState`, `TONE_ICONS`, `TONE_MS`, `WAITING_MAX`, `emptyIsland`, `messageOf`, `expands`, `raise`, `settle`, `Island`, `ISLAND_STATE`, `islandState`, `useIsland` |
| `layers` | `stepsLanded`, `layerCount`, `LayerHistory`, `holdHistory`, `openLayer`, `closeLayer`, `handlePop`, `listenForBack`, `useBackClose` |
| `list-place` | `scrollable`, `reached`, `useListPlace` |
| `list-preview` | `PREVIEW_ITEM`, `HighlightedItem`, `ListPreview`, `useListPreview` |
| `loading` | `useInitialRead`, `useLastRead`, `markPainted`, `usePainted` |
| `longpress` | `HOLD_MS`, `HOLD_SLOP_PX`, `TouchPoint`, `pressTravelled`, `stillGliding`, `LongPress`, `useLongPress`, `followSurface` |
| `markup-buttons` | `MARKUP_BUTTON`, `markupButtonAt`, `markupButtonIn`, `markupButtonWords` |
| `marquee` | `MARQUEE_SLACK_PX`, `MARQUEE_SPEED_PX_PER_SECOND`, `MARQUEE_TRAVEL_SHARE`, `MARQUEE_MIN_SECONDS`, `MarqueeVars`, `MarqueeMotion`, `marqueeDistance`, `marqueeSeconds`, `marqueeVars`, `useMarquee` |
| `modality` | `InputModality`, `MODALITY_ATTRIBUTE`, `modalityOfKey`, `watchInputModality` |
| `monaco` | `languageOf`, `fenceLanguage`, `colourised`, `CodeView`, `openCodeView`, `SourceSelection`, `SourceView`, `openSourceView` |
| `moving-list` | `unfoldItem`, `settleItem`, `foldItem`, `MOVING_LIST`, `STANDING_LIST` |
| `numbers` | `countLocale`, `countText`, `FigureLine`, `COUNT_BADGE`, `figurePlaces`, `turnOf`, `progressText` |
| `openings` | `useOpenings` |
| `overlays` | `OVER_LAYERS`, `OFF_HISTORY`, `BESIDE_PAGE`, `standsAsLayer`, `isBackEscape`, `refuseStalePresses`, `refuseHandedBackFocus`, `focusHandedBack`, `focusTakenOnOpen`, `watchOverlays` |
| `page-tip` | `PAGE_TIP_UI`, `PageTipBy`, `PageTipFinder`, `PageTip`, `usePageTip` |
| `player` | `Playing`, `playAlone`, `playClock`, `knownLength`, `loudnessOf`, `easedLoudness`, `AURA_STILL`, `auraOf`, `PlayerButton`, `PlayerSignal`, `buttonAfter` |
| `prompt` | `TOUCH_QUERY`, `EnterKeys`, `enterKeys`, `PromptEnter`, `usePromptEnter`, `PROMPT_MAX_ROWS`, `PROMPT_TEXTAREA_UI`, `PROMPT_WORDS_WRAP` |
| `question` | `QuestionAsked`, `askQuestion` |
| `relay` | `relayAddress`, `relaySocketAddress`, `relayCall`, `RelayOptions` |
| `scheme` | `provideBoxScheme`, `useDarkScheme`, `usePageScheme`, `usePreviewScheme` |
| `screen` | `NARROW_MAX_PX`, `NARROW_QUERY`, `useNarrow`, `VisibleReading`, `VisibleFrame`, `visibleFrame`, `SCREEN_HEIGHT_PROPERTY`, `SCREEN_TOP_PROPERTY`, `SCREEN_FRAME`, `useVisibleScreen`, `STABLE_GUTTER`, `useWidth`, `useScrollGutter` |
| `scroll-within` | `offsetFor`, `scrollWithin` |
| `share-links` | `ShareLink`, `ShareSpan`, `ShareRoad`, `ShareMark`, `shareEnded`, `shareUntilText` |
| `share-members` | `SharePerson`, `SHARE_PERMISSIONS`, `SharePermission`, `MEMBER_PERMISSION`, `ShareMember`, `ShareMemberRoad`, `MEMBER_SEARCH_PAUSE_MS`, `PermissionItem`, `permissionItems`, `ShareMembers`, `ShareMembersOptions`, `useShareMembers` |
| `side-parts` | `SPLIT_HANDLE`, `FULL_SHEET` |
| `sound-tap` | `TAP_FFT`, `Tap`, `tapOf` |
| `tab-slide` | `SlideDirection`, `slideDirection`, `useSlideDirection` |
| `table-layout` | `TableLayout`, `TABLE_BOX`, `TABLE_HEAD`, `TABLE_ROW_HEIGHT` |
| `table-sections` | `TableSection`, `SectionHeading`, `sectionHeading`, `headingOf`, `sectionedRows`, `sectionedRowId` |
| `tabs` | `TAB_ROW_UI`, `TAB_ROW_LINE`, `BarTab`, `BarMenuItem`, `BarAction`, `BarProperty`, `SwitchItem`, `SeenTab`, `openInTabs`, `mergeTabs`, `pinTab`, `pinnedFirst`, `lastSeen`, `moveTab`, `othersOf`, `rightOf`, `allOf`, `fileTabLabel`, `baseName` |
| `time` | `FOREVER_LABEL`, `formatClock`, `formatDay`, `formatShortDay`, `formatDayClock`, `clockUnder`, `formatDateClock`, `formatStamp`, `formatTime`, `dayKey`, `spanClock`, `elapsedText`, `timerClock`, `remainingText`, `useNowSeconds`, `toUnixSeconds` |
| `tooltip` | `TOOLTIP_UI`, `TOOLTIP_PROVIDER` |
| `translation` | `Reading`, `Translator`, `Untranslated`, `TRANSLATION_BATCH`, `TRANSLATION_ASKS_AT_ONCE`, `translatorOf`, `hasTranslator`, `translated` |
| `video` | `SKIP_SECONDS`, `NUDGE_SECONDS`, `NEXT_CARD_FROM_SECONDS`, `SAVE_EVERY_MS`, `VOLUME_STEP`, `SPEEDS`, `CUE_LINE_OVER_CONTROLS`, `CONTROLS_IDLE_MS`, `STILL_CAP_REM`, `FIRST_FRAME`, `PlayerAction`, `PlayerTrack`, `VideoShape`, `keyAction`, `nextCardLead`, `skipTo`, `steppedVolume`, `speedText`, `toggledTrack`, `nextTurn`, `otherOrientation`, `turnedBox`, `stillBox`, `firstFrameOf` |
| `video-gestures` | `DOUBLE_TAP_MS`, `DOUBLE_TAP_SLOP_PX`, `BRIGHTNESS_MIN`, `BRIGHTNESS_MAX`, `CUE_LINGER_MS`, `HOLD_SPEED_MIN`, `HOLD_SPEED_MAX`, `overlayOpen`, `sideOf`, `dragAxis`, `tapMatches`, `seekFrom`, `levelFrom`, `brightnessFrom`, `heldSpeed`, `PlayerCue`, `GestureSpec`, `GestureReader`, `attachGestures`, `PlayerGestureSpec`, `usePlayerGestures` |
| `volume` | `Loudness`, `Volume`, `VOLUME_KEY`, `FULL_VOLUME`, `UNMUTED_LEVEL`, `slid`, `muteToggled`, `createVolume`, `useVolume` |
| `waveform` | `WAVE_DETAIL`, `WAVE_FETCH_LIMIT`, `WAVE_FLOOR`, `Waveform`, `levelsOf`, `waveBars`, `barCount`, `loudnessAt`, `waveformOf` |
| `zoom` | `ZoomView`, `Point`, `Size`, `FIT`, `MIN_SCALE`, `MAX_SCALE`, `DOUBLE_SCALE`, `bounded`, `zoomedTo`, `wheeled`, `moved`, `pinched`, `toggled`, `fittedSize`, `swipeStep` |

- **`player` and `video` take a sound's and a video's address as given.** Where either is fetched
  from is the host's.
- **`share-links` takes a link's road as given.** How a link is read, made and ended, the page it
  opens and the spans offered are the host's; the module holds their shapes and the one reading of a
  link's end, as the date it stands until.
- **`share-members` takes a member's road as given.** Who may be found, where who a thing is shared
  with is kept, which permissions it grants and what a permission opens are the host's; the module
  holds their shapes, the two permissions and the one a member is given, and the member part's state
  over the road.
- **`monaco` opens code and source views only.** Any other view over the editor is the host's.
- **`relay` makes an address, and calls only where a screen asks it to.** It answers where a screen
  calls a service, under the app's base path and the host's relay base (see What the host owes),
  complete as given to the app's fetcher and to the browser alike; and where a screen opens a socket
  to it, the same address over the page's origin in the socket's scheme, read in the browser. Its
  call hands that address and the screen's options to the app's fetcher and answers what the fetcher
  reads: the service, the path, the method and the body are the screen's, and the layer names none.
  It is the one place the layer takes a fetcher.
- **`translation` asks the translator the host names** (`docs/console-bundles.md`, "Translation"),
  through the relay's call: readings in the order of the texts handed, each distinct original asked
  once, in batches of the host's `batch` (`TRANSLATION_BATCH` where it names none), at most the host's
  `asksAtOnce` batches out at once across the tab (`TRANSLATION_ASKS_AT_ONCE` where it names none),
  and every whole reading kept for the life of the tab by language and original. A batch answered 503
  or 504 is asked again after 2, 4 and 8 seconds, and one still busy after the last answers its texts
  as untranslated readings, each its original, not whole, with `untranslated` set. Any other refusal,
  a call that fails and a host naming no translator are each an `Untranslated` failure; the batches
  answered before a failure stay kept.
- **`numbers` and `time` read the host's locale and zone** (see What the host owes) each time they
  write, so they import no locale and nothing is read before the app stands. `countLocale` answers
  the locale figures are written in: the host's tag, or nothing where none is set, which is the
  runtime's own.

## Shared modules

| Module | Exports |
| --- | --- |
| `themes` | `Scheme`, `ScaleName`, `Theme`, `THEMES`, `DEFAULT_THEME`, `isThemeId`, `themeOf`, `themeTokens`, `themeDeclarations`, `declarations` |
| `palettes` | `Palette`, `PALETTES`, `DEFAULT_PALETTE`, `isPaletteId`, `paletteOf`, `paletteTokens`, `paletteDeclarations` |
| `search` | `SearchField`, `SearchMatch`, `SearchPart`, `searchPhrase`, `searchHits`, `highlightParts`, `hitSnippet`, `matchFields`, `filterRecords` |
| `wording` | `Translate`, `WordingParams`, `Pack` |
| `wording-keys` | `WORDING_KEYS`, `WordingKey` |
| `files` | `FileConflict` |
| `code-language` | `codeLanguage` |
| `screen-mode` | `DocumentScheme`, `DEFAULT_SCHEME`, `SCHEME_COOKIE`, `isDocumentScheme` |
| `console-manifest` | `CONSOLE_MANIFEST_ROUTE`, `OWNER_KEY_HEADER`, `OWNER_ROLE_HEADER`, `CONSOLE_ROLES`, `ConsoleRole`, `CONSOLE_SIDEBAR_SECTIONS`, `ConsoleSidebarSection`, `RELAY_METHODS`, `RelayMethod`, `LAYER_VERSION`, `LAYER_BOUND`, `LAYER_RANGE`, `CONSOLE_SHARED_LIBRARIES`, `ConsoleManifest`, `CONSOLE_MANIFEST_SCHEMA`, `consoleManifest`, `onThisLayer`, `roleAllows`, `screensCall`, `relaysRoute`, `shareRead`, `ShareHead`, `SHARE_HEAD_LANGUAGE_QUERY`, `shareHeadPath`, `shareHead`, `movedScreenAddress`, `ConsoleWords`, `ConsoleBundleModule` |

- **`search` folds letter case in the locale each call is handed,** the runtime's own where none is.
  It reads no app configuration, so it runs alike in a browser and on a server; a host searching in
  the app hands it `countLocale`'s answer, as the layer's own components do.
- **`console-manifest` is the contract's manifest** (`docs/console-bundles.md`): the route a service
  answers it at, the two headers a console relays the owner key and the role in, the roles and whether
  one held allows one needed, the sections of a console's sidebar a bundle's entry stands in, the version of the layer it is part of, that release's bound and the
  releases from the bound up to it, and whether a manifest was built on one of them, the libraries a bundle shares with its console, the manifest's JSON Schema, its type
  with each optional field that states a default filled, the reading that fills them or refuses a
  manifest naming each field at fault,
  whether a manifest names a route whose answer holds a sidebar unread count, whether a bundle's screens
  call a service (their own, or one named under `calls`), the methods a route under `relays` is named
  by and whether a manifest names a method and path there, whether a method and path are a share read a
  manifest names under `shareReads`, the path a console asks a manifest's `shareHead` at for a token and the query
  naming the language it asks in, the head a service answers there as its type and its reading, which refuses
  an answer out of the shape, the address a path under a former screen path moved to, and the
  types of a bundle's words and of its module's default export. A service and a console import it alike; it runs in a browser, on a server and in a test.
- **`LAYER_VERSION` names the release the layer was installed from.** The release verb writes the
  version into the file it packs; read from the layer's source, it is the package manifest's version
  marked `+source`, which names no release. Both are read from `shared/layer.json`, which the bundle
  build reads too.
- **`LAYER_BOUND` and `LAYER_RANGE` are that release's bound and the releases a console on it
  attaches** (`docs/console-bundles.md`, "The layer a bundle is built on"): the oldest release whose
  bundles still run on it unchanged, and every release from that bound up to it, in the order they
  were released, as the release verb wrote them into the same file. Read from the layer's source,
  the bound is the source's own version and the range holds that version alone.

## Page plugins

Each runs in the browser alone, on every screen, from the moment the page is up.

| Plugin | What it sets up |
| --- | --- |
| `dialog-origin` | Every dialog the library draws grows out of the control pressed to open it. |
| `fullscreen` | A video let go of full screen finds the parts around it where they were left. |
| `icon-styles` | The icon library's styles are put in behind the page's other stylesheets, so a first-drawn icon never redraws the letters. |
| `input-modality` | Which hand last moved the focus is marked on the page's root for the stylesheet. |
| `overlays` | What the library floats closes to the back gesture and to a finger's tap away from it. |
| `painted` | The flag the skeletons wait for is raised once hydration ends. |

## Custom elements

Each is built into one script by `bun run elements`, into `dist/` under its own name, and the packed
file carries it there; a page loads it by itself (`docs/components.md`, "The audio player as an
element").

| Script | Global | What it defines |
| --- | --- | --- |
| `dist/bmo-audio-player.js` | `BmoAudioPlayer`, holding `define` and `AUDIO_PLAYER_TAG` | `bmo-audio-player`, `AudioPlayer` as an element: the attributes `src`, `download`, `name`, `size` and `scheme`, and the methods `play` and `pause` |

`define` takes `words`, the player's words keyed as a language pack keys them under Wording keys,
`locale`, the language they are in, and `tag`, the element's name. The player reads `common.action`
`play`, `pause`, `mute` and `unmute`, `common.label` `play_position`, `unplayable` and `volume`,
`common.aria` `download_named` and `common.status` `loading`.

## The bundle build

What a service builds its console bundle with (`docs/console-bundles.md`, "The layer a bundle is
built on"). It is written in JavaScript with its declarations beside it, so a build configuration
loads it from the installed package under Node, which reads no TypeScript there.

| Module | Exports |
| --- | --- |
| `console-bundle` | `consoleBundle` |

`consoleBundle` is a Vite plugin, imported by path from the package's `bundle/` folder. It takes
`name`, the bundle's name in kebab-case as its manifest names it, which is its words' namespace, and
`words`, the bundle's words as its service answers them, each locale's tree under the locale's code;
it refuses to be made without either. It leaves unbundled every import of the libraries a bundle
shares with its console, whatever external modules the build names besides, and writes `layer.json`
beside the module, a JSON object holding `layer`, the layer's version as `LAYER_VERSION` names it. A
service answers that value as its manifest's `layer`.

It holds the screens to their words, and fails the build naming each fault with the file it stands
in. It reads every file of the bundle's own sources the build carries, none under `node_modules`: a
component as its scripts and its template compiled to the render function it ships as, each script
by the parser Vue's compiler uses. Every string written whole there, with no space and no slash and
of two parts or more joined by dots, is read as a key by its first part:

- **Under `common` or `files`,** it is a key the `wording-keys` list holds, or a fault.
- **Under the bundle's name,** every locale's tree answers it with a string, or a fault.
- **Under any other first part,** a string of the shape `<domain>.<role>.<key>` the wording rules
  name (`docs/wording.md`, "The key") is a key outside the bundle's namespace and the layer's, and a
  fault; any other string is not read as a key.

A locale's tree holding anything beside the bundle's namespace at its root is a fault as well.

## The harness plugin

What a coding harness takes the layer through (`docs/harness.md`).

- **The command** `bmo-ui`, named in the manifest and run by Bun. Its one command, `mcp`, starts the
  MCP server on standard input and output.
- **The MCP server's tools** are `ui_components`, `ui_component`, `ui_tokens` and
  `ui_plugin_contract`, and no others; what each takes and answers is in the harness document.
- **The skill** `bmo-ui`, in the package's `skills/` folder.
- **The catalogue module,** imported by path from the package's `catalogue/` folder with its data file
  beside it:

| Module | Exports |
| --- | --- |
| `catalogue` | `CatalogueKind`, `CatalogueProp`, `CataloguePart`, `CatalogueEntry`, `CatalogueToken`, `CatalogueData`, `ComponentDetail`, `CatalogueError`, `components`, `component`, `tokens`, `pluginContract` |

## Wording keys

The layer reads these 147 keys and no others. The `wording-keys` shared module lists them, the one
list a host's pack is held to. Placeholders are named after each key.

- **`common.action`:** `add_choice` `{value}`, `cancel`, `choose_all`, `choose_none`, `close`, `close_all_tabs`,
  `close_other_tabs`, `close_right_tabs`, `collapse`, `copy`, `create_link`, `discard`,
  `exit_fullscreen`, `expand`, `fit_screen`, `fullscreen`, `more`, `mute`, `next_month`,
  `next_picture`, `next_year`, `next_years`, `page_back`, `page_forward`, `pause`, `pin`, `play`,
  `play_now`, `previous_month`, `previous_picture`, `previous_year`, `previous_years`, `save`,
  `see_all`, `share`, `skip_back` `{n}`, `skip_forward` `{n}`, `subtitles`, `turn_picture`, `unmute`,
  `unpin`, `unshare`, `zoom_in`, `zoom_out`.
- **`common.aria`:** `close_named` `{name}`, `column_width` `{name}`, `decrease`, `download_named`
  `{name}`, `image_zoom` `{title}`, `increase`, `member_permission` `{name}`, `more_notices` `{n}`,
  `others_count` `{n}`, `pinned_named` `{name}`, `play_named` `{name}`, `player_named` `{name}`, `share_address`,
  `speed_named` `{speed}`, `window_move`, `window_resize`.
- **`common.error`:** `choices_find_failed`, `editor_failed`, `link_copy_failed`, `member_change_failed`,
  `member_search_failed`, `member_share_failed`, `members_read_failed`, `picture_failed`,
  `share_create_failed`, `share_read_failed`, `unshare_failed`, `video_failed`.
- **`common.label`:** `day_format` (a date format the time module's day is written in), `days`
  `{d}`, `days_hours` `{d}` `{h}`, `expired`, `expiry`, `forever`, `hours` `{h}`, `hours_minutes`
  `{h}` `{m}`, `left_days` `{n}`, `left_hours` `{n}`, `left_minutes` `{n}`, `left_under_minute`,
  `link`, `members`, `minutes` `{m}`, `minutes_seconds` `{m}` `{s}`, `palette_forest`, `palette_lemon`,
  `palette_sea`, `palette_sunset`, `palette_teal`, `palette_violet`, `permission_edit`,
  `permission_read`, `play_position`, `properties`,
  `seconds` `{n}`, `share_until` `{date}`, `short_day_format` (the short date format the time
  module's short day is written in, the year in two figures), `speed_normal` `{speed}`,
  `subtitles_off`, `theme_forest`, `theme_sea`, `theme_sunset`, `theme_teal`, `theme_violet`,
  `unplayable`, `volume`.
- **`common.message`:** `link_copied`, and the theme preview's words:
  `preview_badge`, `preview_field`, `preview_link`, `preview_meta`, `preview_note`.
- **`common.placeholder`:** `member_search`, `search`.
- **`common.status`:** `brightness` `{n}`, `copied`, `loading`, `members_loading`, `muted`,
  `next_in` `{n}`, `no_choices`, `no_match`, `no_members`, `picture_loading`, `share_loading`, `speed` `{speed}`, `subtitles_off`,
  `subtitles_on` `{name}`, `turned` `{degrees}`, `unmuted`, `video_loading`, `volume` `{n}`,
  `went_back` `{n}`, `went_forward` `{n}`.
- **`common.title`:** `discard_changes`, `share`.
- **`files.action`:** `keep_both`, `replace`, `skip`.
- **`files.aria`:** `name_field`.
- **`files.label`:** `progress` `{done}` `{all}` `{percent}`.
- **`files.message`:** `conflict`.
- **`files.status`:** `uploading`.

That is 37 actions, 15 accessible names, 11 errors, 38 labels, 6 messages, a placeholder, 18
statuses and 2 titles under `common`, and 7 keys under `files`.

## Tokens

Every token is a custom property stated by the layer's stylesheet on the root unless said otherwise.

- **Theme:** `--ui-color-primary-*` and `--ui-color-neutral-*`, every shade from 50 to 950, stated by
  the themes module's declarations for one theme; the library's own defaults stand where none is
  stated. The library's semantic colours are primary, secondary, success, info, warning, error and
  neutral.
- **Palette:** `--bmo-palette-own-light`, `--bmo-palette-own-dark`, `--bmo-palette-other-light` and
  `--bmo-palette-other-dark`, stated by the palettes module's declarations for one palette; and the
  mode's pair, `--bmo-palette-own` and `--bmo-palette-other`, resolved by the stylesheet on the root
  and `.light` to the light values and on `.dark` to the dark ones.
- **Words:** `--bmo-ink-primary`, `--bmo-ink-secondary`, `--bmo-ink-success`, `--bmo-ink-info`,
  `--bmo-ink-warning` and `--bmo-ink-error`, the step a coloured word is drawn at. The layer states
  none on the root: its theme states `--text-color-<colour>` for each colour as the colour's word token
  falling back to the colour itself, which the colour's text utilities read, while its fill, edge and
  ring utilities read the colour alone. `badge-ink` states each at its 800 in the light mode.
- **Width:** `--ui-container`, 48rem, the reading width; `--bmo-inset`, a container's own side room,
  added outside the reading width.
- **Height:** the library's `--ui-header-height`, 3rem, one height for a top bar and a panel's head.
- **Screen:** `--bmo-screen`, the visible height, `100dvh` while nothing overlays; `--bmo-screen-top`,
  where the visible screen starts, `0px` while nothing overlays.
- **Safe area:** `--bmo-safe-top` and `--bmo-safe-bottom`, the device's insets, nought where it
  reports none.
- **Create room:** `--bmo-create-room`, the room the create button floating on a phone takes from a
  list's foot, its height, its gap from the edge and `--bmo-safe-bottom` together; nought on a wide
  screen.
- **Motion:** `--bmo-motion-quick` 150ms, `--bmo-motion-pop` 200ms, `--bmo-motion-unfold` 320ms;
  `--bmo-ease-enter` `cubic-bezier(0.2, 0.8, 0.2, 1)`, `--bmo-ease-exit` `cubic-bezier(0.4, 0, 1, 1)`,
  `--bmo-ease-move` `cubic-bezier(0.4, 0, 0.2, 1)`. Tailwind's default transition is `quick` and
  `move`.
- **Focus:** `--bmo-focus`, primary's 600 in the light mode and its 400 in the dark; `--bmo-focus-width`
  2px; `--bmo-focus-gap` 2px. The stylesheet colours every element's outline with `--bmo-focus`, at
  rest as on focus and over every class, so an outline on a screen is the focus ring alone.
- **Type:** `--text-xs` is 0.875rem. `--font-sans` is Apple SD Gothic Neo, Pretendard, then the
  system's sans serif; `--font-mono` is CaskaydiaCove NFM, Apple SD Gothic Neo, Pretendard, then the
  system's monospace.
- **Radius:** the library's `--ui-radius`, 4px, the base of the four corner tiers.

## Classes and keyframes

- **Utilities:** `rounded-inherit`, `focus-inset`, `pair-list`.
- **Classes:** `tabular-nums` at geometric precision; `badge-ink`; `focus-bar`; `marquee`,
  `marquee-line` and `marquee-line--moving`; the moving list's and the tab slide's transition
  classes under `bmo-list-*` and `bmo-slide-*`.
- **Rendered text:** inside a host's container carrying `markdown`, the layer styles a fenced block,
  its box with the copy button, its language head and a diagram's figure, under the classes
  `markdown-code`, `markdown-code-head`, `markdown-code-language`, `markdown-copy`,
  `markdown-diagram`, `markdown-diagram-figure` and `markdown-diagram-tools`.
- **A fenced block as the host's renderer stands it,** for the code-copy, code-colour and diagram
  modules to read: a `markdown-code` box holding the block's `pre` and `code`, the box carrying
  `data-language` with its fence's word where the fence names one, and its copy button a `button`
  carrying `data-copy` beside the `pre`, named in the host's words by `aria-label` and
  `data-tooltip`; a diagram's fence a `div` carrying `data-diagram` and
  holding its source as a `pre` and `code`, and after it, where the host gives a diagram zoom
  buttons, a `markdown-diagram-tools` row of `button`s each carrying `data-diagram-zoom` as `out`,
  `in` or `fit`, named in the host's words by `aria-label` and `data-tooltip`. The modules mark what they did on the same elements:
  `data-coloured` on a coloured `code`, `data-copied` on a button that has just copied,
  `data-drawn` or `data-failed` on a diagram's place, `data-zoomed` on a place whose diagram stands
  zoomed, and `disabled` on a zoom button with nothing left to do.
- **A button a host writes as markup,** inside rendered text or anywhere else on the page, is named
  by carrying its name in `data-tooltip` beside its `aria-label`: the markup button layer
  (`MarkupButtonTip`) names every `button` that carries it in the shared tooltip, one the library
  draws inside a component of its own and that is handed the two attributes as much as one the
  host writes, and the stylesheet draws no name of its own for it.
- **The work-in-progress mark** — an icon of the progress-activity kind — always turns, and stands
  still where less movement was asked for.
- **Keyframes:** `bmo-dialog-in`, `bmo-dialog-out`, `marquee-slide`.
- **Scrollbars** are thin, in the border colour, on no track.

## Fonts

- **Carried:** Pretendard in 400, 500, 600 and 700, each cut to the letters Apple SD Gothic Neo
  lacks; CaskaydiaCove NFM in one weight, cut to letters, digits, punctuation, arrows and
  box-drawing; and each face's licence beside it.
- **Not carried:** Apple SD Gothic Neo. The stacks name it first, so a host that carries the face
  declares it under that family name.

## The library's overrides

- **Components:** the layer's app configuration overrides the library's `icons`, `colors`, `avatar`,
  `badge`, `alert`, `tooltip`, `tabs`, `collapsible`, `navigationMenu`, `kbd`, `checkbox`, `switch`,
  `dashboardSidebar`, `container`, `select`, `selectMenu`, `inputMenu`, `dropdownMenu`,
  `contextMenu`, `modal`, `drawer`, `slideover`, `dashboardPanel`, `popover`, `chatPrompt` and
  `textarea`. A host's own app configuration merges over them.
- **What they hold, in short:** icons from Material Symbols; motion retimed onto the motion tokens
  by kind — growing, growing after a delay, unfolding, shading; badges and the small avatars on the
  14-pixel floor with `badge-ink`; soft and subtle alerts with `badge-ink` and their description at
  full colour; the tooltip at caption size; focus inside clipping rows; the reading width on the
  dashboard panel and the container's inset outside it; no floor on the panel or the sidebar;
  dropdowns as wide as their longest item and no wider than the screen, their rows padded and spaced on the 4px grid; a select menu's search field taking the elevated background while it holds the focus and setting none of its list's width; dialogs growing out of their
  control, standing at once when they fill the screen, keeping one padding in their head, body
  and foot at every width, and their close in the head's row on the title's centre line; sheets
  clear of the safe area; popovers held to their room; the message bar's focus on its bar; text
  areas at full width.
- **The layer's Nuxt configuration** brings the library as its module with its semantic colours, the
  layer's stylesheet, the viewport meta (`viewport-fit=cover`, the keyboard resizing the content), the
  screen mode (dark until a reader chooses another, kept for a year in the cookie `screen-mode`
  names), and the screen mode's ground painted from the first frame.

## What the host owes

- **The language pack.** `@nuxtjs/i18n` installed in the host, with a pack answering every key under
  Wording keys, and the component library's own locale for its own words.
- **The i18n engine.** `vue-i18n` reachable from the layer, the copy the host's i18n module runs:
  the layer's components import `useI18n` from it by name. `@nuxtjs/i18n` depends on it, so a host
  installing the module brings it; the layer names it as a peer so a package manager that does not
  hoist still resolves it to that copy.
- **The locale and the time zone.** The host states them in its app configuration, under `bmoUi`:
  - `zone`, an IANA zone name every time is shown in; by default the runtime's own zone;
  - `locale`, a BCP 47 tag figures are written in and letter case is folded in; by default the
    runtime's own;
  - `dateLocale`, the name of a dayjs locale the host has loaded, dates' words are written in; by
    default dayjs's built-in one;
  - `relayBase`, the path a console relays every service under, which the relay module's addresses
    start with after the app's base path; by default none, so a service is called at its name from
    the app's base path.
  The layer's own app configuration states the setting with nothing in it, so each default stands
  until the host states a value. A host that renders on the server states the first three, since the
  server's runtime and the browser's need not agree.
- **The translator, where the host has one.** The host states it in its public runtime configuration,
  under `bmoUi`, as `translator`: `service`, the name the translator is relayed under; `path`, its
  translating route on the service's own API; `batch`, the most originals one ask carries; and
  `asksAtOnce`, how many asks a tab holds out at once. Each is a setting of the host's deployment,
  read from the environment as Nuxt reads a runtime setting. The layer's own configuration states the
  service and the path empty, so a host that names none translates nothing, and the two bounds at
  `TRANSLATION_BATCH` and `TRANSLATION_ASKS_AT_ONCE`, 4 and 1; a bound that is not a whole number of
  one or more reads as its default.
- **What a console owes a bundle,** where the host is a console: the contract's own list
  (`docs/console-bundles.md`, "What a console owes").
- **The overlay.** The host's app root is the library's `UApp`, whose overlay provider draws what the
  question module opens; a question asked with none standing is never drawn and never answered.
- **The page layers.** The host stands `CutLineTip` and `MarkupButtonTip` once each inside its app
  root, beside its pages; a cut line shows whole and a button written as markup is named only where
  its layer stands.
- **The tooltip setting.** The host's app root, the library's `UApp`, is handed the tooltip
  module's `TOOLTIP_PROVIDER` as its tooltip setting, so every other tooltip the library draws comes
  up for no focus the browser does not show as visible. A focus the keyboard did not bring — the one
  a closing floating thing hands back to its control, or the one an opening one takes up on its own
  — brings up no tooltip (`docs/components.md`, "Tooltips"): the layer's shared tooltip, its icon
  button, its dialog close (`ShellClose`) and its page layers hold this on their own, by the
  overlays module's `focusHandedBack` and `focusTakenOnOpen`.
- **The patches.** Each patch under `patches/` is applied to the same version of the dependency it
  names in the host's own install.
  - The `reka-ui` patch gives a collapsible region its own id from the region's root, so a button
    drawn before its region already names it and no id stands twice, and it stops a closed tooltip
    answering the keyboard, so the press that closes a dialog or a drawer is not taken by the tooltip
    that names a control inside it. It also has a tooltip that opens tell the others which one it is,
    so one brought up again while its going is still drawn stays up rather than taking its own
    opening for another's and closing itself: a page layer's tooltip, moved on with the pointer from
    one control it names to the next, comes up over each. And it lets Esc pass a date or a time
    field's segment, which keeps every other key but Tab for itself, so Esc pressed there reaches the
    floating thing around the field as from any other field.
  - The `@nuxt/ui` patch lets the library's select menu move its list by what it holds: handed a
    list transition, the transition group's name and hooks, it draws its groups and the choices in
    each through Vue's `TransitionGroup` with them, each choice keyed by the value it is chosen by
    and each group by its place among the groups handed in, and a group left with no choice goes
    rather than standing empty. A choice or a group that goes takes no press and no Enter while it
    folds, and a highlight it held moves to the first choice left once it has gone, unless the
    keyboard moved it on meanwhile. While choices come or go, a scroll to the choice the highlight
    rests on waits until the last of them has settled, so the list moves only by its choices.
    `ChoiceSelect` hands it the moving-list module's `MOVING_LIST`, and `STANDING_LIST` while the
    list opens. In an install without the patch the select's list changes at once, with no
    movement, and works otherwise as it does with it.
  - The `@nuxt/icon` patch writes an icon drawn as a stylesheet rule under the name it was loaded
    for. Without it, an icon whose name moves on while its drawing is still being fetched — a
    button's spinner giving way to its mark — writes that drawing under the new name, and the new
    icon shows the old one for as long as the page stands.
- **The choice of theme and palette.** Where a reader's choice is kept, and stating its declarations
  in the page's head from the first frame, are the host's. Without a theme's declarations the
  library's own colours stand; the palette tokens stand only once a palette's declarations are
  stated.
- **Its own grounds.** A host that draws on the palette's grounds reads the palette tokens; every ink
  and surface it computes on them is its own.

## Versions

- **The layer requires** Nuxt 4.5 or later within 4, `@nuxtjs/i18n` 10.6 or later within 10 and
  `vue-i18n` 11.4.8 or later within 11, the engine that module requires, as peers, and brings Nuxt
  UI 4.12.2 exactly, the version its patches of the library and of `reka-ui` are cut for, with the
  two icon sets it draws from: Material Symbols and the Material Icon Theme. A host locks the same
  Nuxt UI, so the patches it applies meet the files they were cut from. The command and its MCP
  server run under Bun 1.3 or later, on the MCP SDK 1.32 or later within 1 and zod 4.
- **It stands on registry packages alone;** no other repository is a dependency.
- **One version for the whole repository,** the manifest's; the README states what may change at
  which release.
- **One packed file per version,** written by the release verb alone under `releases/`, its sha256
  in the ledger `releases/sha256.json`: a JSON object holding, under each packed file's name, an
  object of its `sha256` written in lowercase hexadecimal, its `bound`, the version of the oldest
  release whose bundles still run on it unchanged, and `why`, the reason for that bound, in the order
  the files were released. Every packed file there is named in it, and it names no other. A bound is
  a version the ledger names at or before its own file, never earlier than the bound of the file
  before it.
- **The packed files under the earlier numbering** stay under `releases/` by their own names:
  `bmo-ui-0.2.0.tgz` holds revision `0.1.0-rev.1` and `bmo-ui-0.3.0.tgz` holds revision
  `0.1.0-rev.2`, each under its earlier number. The base `0.1.0` has no packed file.
