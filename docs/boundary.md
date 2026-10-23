# The boundary

Everything the layer exposes and everything a host owes it. A change to anything listed here follows
the version rules in the README, and this document changes in the same commit. What each piece does
is stated in `docs/design.md`, `docs/wording.md` and `docs/components.md`; the console plugin
contract in `docs/console-bundles.md`; the harness plugin in `docs/harness.md`.

The guard test holds the code to this document: every component, page plugin and module the layer
ships is named here with everything it exports, nothing is named here that it does not ship, and the
wording keys listed here are the ones the layer's list holds.

## How a host takes it

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
| `AudioPlayer` | A kept sound: a play and pause button, its waveform as its progress, and a download. |
| `ChooseAll` | The three-state checkbox that takes every row shown or gives the choice up. |
| `ColumnResizeHandle` | The right edge of a column's name, dragged or moved with the arrow keys. |
| `ContentSkeleton` | The placeholder region: busy status, a surface nothing presses through, the caller's piece repeated. |
| `CutLineTip` | The one layer that shows any line cut with an ellipsis whole, in the shared tooltip. |
| `DataTable` | The shared table: sideways scroll, stuck names, movable widths, labelled parts, three layouts. |
| `DataTableSkeleton` | The shared table's placeholder, its head and rows in the table's own columns, box and height. |
| `FilesConflictDialog` | The one question when a change would land on names already taken. |
| `FilesNameField` | A name renamed in place, chosen up to its ending. |
| `FilesProgress` | An upload's progress, by files and by bytes, with a bar. |
| `FilesText` | A text file in the read-only code viewer, coloured by its name's language. |
| `GrowingTextarea` | A form's text box that grows with its text and never scrolls inside. |
| `HintTip` | The shared tooltip for words that say more than what they stand on. |
| `ImageViewer` | A picture opened whole, zoomed and moved by wheel, drag, pinch, double press and buttons. |
| `LoadingImage` | A picture that keeps its place while it loads and says when it failed. |
| `LoadingVideo` | A video that keeps its place while it loads and says when it failed. |
| `MarqueeLine` | A line that slides when it is longer than its box. |
| `MessageIsland` | The one pill every notice and question stands on. |
| `MovingList` | A list whose items come, go and change places by position alone. |
| `NumberInput` | The number box, as wide as its values, with its two step buttons. |
| `PaletteSwatch` | A palette's two grounds as dots, in one mode. |
| `PropertyList` | A file's or a document's details as a name and value list. |
| `RollingNumber` | A number that turns only its changed characters. |
| `RollingSentence` | A sentence of the pack with turning figures in its placeholders. |
| `ScreenFrame` | The frame of a screen that stands on no shell, pinned to the visible screen. |
| `SearchHit` | The line under a row that matched only in hidden data. |
| `SearchText` | A shown text with the search's hits marked. |
| `SettingsDialog` | A setting's own form as a dialog, asking before it closes on changes. |
| `SettingsGroup` | A group of settings rows under a small heading. |
| `SettingsRow` | One setting: its name, a muted line, its control. |
| `SettingsSegment` | A choice of two or three as one segmented control. |
| `ShareLinkDialog` | The one dialog a share link is made, shown, copied and ended in, over the road the host hands it. |
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

## Domain modules

Each is named with everything it exports.

| Module | Exports |
| --- | --- |
| `actionbar` | `BAR_GATHERS_UNDER_PX`, `GATHERED_ACTIONS`, `STANDING_ACTIONS`, `barGathers`, `actionsOutside`, `useBarRoom`, `useBarGathers` |
| `bars` | `BarColor`, `BAR_SIZE`, `STACKED_LEGEND`, `INLINE_LEGEND`, `FOLDED_LEGEND` |
| `chooseall` | `ChooseAllState`, `chooseAllState`, `chosenRuns`, `chooseAllPress`, `chooseAllLabel`, `CHOOSE_CELL`, `CHOOSE_GUTTER` |
| `closing` | `OVERLAY_CLOSE_MS`, `useHeldWhileClosing` |
| `clipboard` | `copyText` |
| `code-colour` | `colouredRuns`, `colourCode`, `forgetCode` |
| `code-copy` | `blockText`, `copyFromPress` |
| `code-themes` | `CODE_THEMES` |
| `column-widths` | `MIN_COLUMN_PX`, `RESIZE_STEP_PX`, `ColumnWidths`, `tableHeaders`, `setColumnWidth`, `useColumnWidths` |
| `cut-lines` | `LineBox`, `boxCuts`, `cutLineAt`, `cutLineIn`, `lineWords` |
| `diagram` | `isDiagram`, `drawDiagrams` |
| `dialog-origin` | `Press`, `originOf`, `watchDialogOrigins` |
| `dragselect` | `draggedSelection`, `edgeScroll`, `PressKind`, `DragSelectList`, `useDragSelect` |
| `errors` | `failureText`, `answeredLate` |
| `file-icons` | `fileIcon`, `folderIcon`, `iconNames` |
| `foot` | `FootOptions`, `useFootInView` |
| `form-save` | `FormPart`, `FormSave`, `askDiscard`, `useCloseGuard`, `useFormSave`, `useFormPart`, `useLeaveGuard` |
| `fullscreen` | `PutBack`, `TakePlace`, `keepPlace`, `holdThroughFullscreen` |
| `holdmenu` | `HoldMenu`, `useHoldMenu` |
| `icon-styles` | `IconStyleOptions`, `isIconStyle` |
| `island` | `IslandTone`, `IslandAction`, `IslandMessage`, `IslandSaid`, `IslandAsked`, `IslandState`, `TONE_ICONS`, `TONE_MS`, `WAITING_MAX`, `emptyIsland`, `messageOf`, `questionOf`, `expands`, `pressable`, `endsItself`, `raise`, `settle`, `Island`, `ISLAND_STATE`, `islandState`, `useIsland` |
| `layers` | `stepsLanded`, `layerCount`, `LayerHistory`, `holdHistory`, `openLayer`, `closeLayer`, `handlePop`, `listenForBack`, `useBackClose` |
| `list-place` | `scrollable`, `reached`, `useListPlace` |
| `list-preview` | `PREVIEW_ITEM`, `ListPreview`, `useListPreview` |
| `loading` | `useInitialRead`, `useLastRead`, `markPainted`, `usePainted` |
| `longpress` | `HOLD_MS`, `TouchPoint`, `pressTravelled`, `stillGliding`, `LongPress`, `useLongPress`, `followSurface` |
| `marquee` | `MARQUEE_SLACK_PX`, `MARQUEE_SPEED_PX_PER_SECOND`, `MARQUEE_TRAVEL_SHARE`, `MARQUEE_MIN_SECONDS`, `MarqueeVars`, `MarqueeMotion`, `marqueeDistance`, `marqueeSeconds`, `marqueeVars`, `useMarquee` |
| `modality` | `InputModality`, `MODALITY_ATTRIBUTE`, `modalityOfKey`, `watchInputModality` |
| `monaco` | `languageOf`, `fenceLanguage`, `colourised`, `CodeView`, `openCodeView`, `SourceSelection`, `SourceView`, `openSourceView` |
| `moving-list` | `unfoldItem`, `settleItem`, `foldItem` |
| `numbers` | `countLocale`, `countText`, `FigureLine`, `COUNT_BADGE`, `figurePlaces`, `turnOf`, `progressText` |
| `openings` | `useOpenings` |
| `overlays` | `OVER_LAYERS`, `isBackEscape`, `refuseStalePresses`, `refuseHandedBackFocus`, `watchOverlays` |
| `player` | `Playing`, `playAlone`, `playClock`, `knownLength`, `loudnessOf`, `easedLoudness`, `AURA_STILL`, `auraOf`, `PlayerButton`, `PlayerSignal`, `buttonAfter` |
| `prompt` | `TOUCH_QUERY`, `EnterKeys`, `enterKeys`, `PromptEnter`, `usePromptEnter`, `PROMPT_MAX_ROWS`, `PROMPT_TEXTAREA_UI`, `PROMPT_WORDS_WRAP` |
| `relay` | `relayAddress`, `relaySocketAddress`, `relayCall`, `RelayOptions` |
| `scheme` | `provideBoxScheme`, `useDarkScheme`, `usePageScheme`, `usePreviewScheme` |
| `screen` | `NARROW_MAX_PX`, `NARROW_QUERY`, `useNarrow`, `VisibleReading`, `VisibleFrame`, `visibleFrame`, `SCREEN_HEIGHT_PROPERTY`, `SCREEN_TOP_PROPERTY`, `SCREEN_FRAME`, `useVisibleScreen`, `STABLE_GUTTER`, `useWidth`, `useScrollGutter` |
| `scroll-within` | `offsetFor`, `scrollWithin` |
| `share-links` | `ShareLink`, `ShareSpan`, `ShareRoad`, `ShareMark`, `shareEnded`, `shareUntilText` |
| `side-parts` | `SPLIT_HANDLE`, `FULL_SHEET` |
| `sound-tap` | `TAP_FFT`, `Tap`, `tapOf` |
| `tab-slide` | `SlideDirection`, `slideDirection`, `useSlideDirection` |
| `table-layout` | `TableLayout`, `TABLE_BOX`, `TABLE_HEAD`, `TABLE_ROW_HEIGHT` |
| `table-sections` | `TableSection`, `SectionHeading`, `sectionHeading`, `headingOf`, `sectionedRows`, `sectionedRowId` |
| `tabs` | `TAB_ROW_UI`, `TAB_ROW_LINE`, `BarTab`, `BarMenuItem`, `BarAction`, `BarProperty`, `SwitchItem`, `SeenTab`, `openInTabs`, `mergeTabs`, `pinTab`, `pinnedFirst`, `lastSeen`, `moveTab`, `othersOf`, `rightOf`, `allOf`, `fileTabLabel`, `baseName` |
| `time` | `FOREVER_LABEL`, `formatClock`, `formatDay`, `formatShortDay`, `formatDayClock`, `clockUnder`, `formatDateClock`, `formatStamp`, `formatTime`, `dayKey`, `spanClock`, `elapsedText`, `timerClock`, `remainingText`, `useNowSeconds`, `toUnixSeconds` |
| `tooltip` | `TOOLTIP_UI`, `TOOLTIP_PROVIDER` |
| `translation` | `Reading`, `Translator`, `Untranslated`, `TRANSLATION_BATCH`, `TRANSLATION_ASKS_AT_ONCE`, `translatorOf`, `hasTranslator`, `translated` |
| `waveform` | `WAVE_DETAIL`, `WAVE_FETCH_LIMIT`, `WAVE_FLOOR`, `Waveform`, `peaksOf`, `waveBars`, `barCount`, `loudnessAt`, `waveformOf` |
| `zoom` | `ZoomView`, `Point`, `Size`, `FIT`, `MIN_SCALE`, `MAX_SCALE`, `DOUBLE_SCALE`, `bounded`, `zoomedTo`, `wheeled`, `moved`, `pinched`, `toggled`, `fittedSize`, `swipeStep` |

- **`player` takes a sound's address as given.** Where a sound is fetched from is the host's.
- **`share-links` takes a link's road as given.** How a link is read, made and ended, the page it
  opens and the spans offered are the host's; the module holds their shapes and the one reading of a
  link's end, as the date it stands until.
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
| `console-manifest` | `CONSOLE_MANIFEST_ROUTE`, `OWNER_KEY_HEADER`, `OWNER_ROLE_HEADER`, `CONSOLE_ROLES`, `ConsoleRole`, `RELAY_METHODS`, `RelayMethod`, `ConsoleManifest`, `CONSOLE_MANIFEST_SCHEMA`, `consoleManifest`, `roleAllows`, `screensCall`, `relaysRoute`, `ConsoleWords`, `ConsoleBundleModule` |

- **`search` folds letter case in the locale each call is handed,** the runtime's own where none is.
  It reads no app configuration, so it runs alike in a browser and on a server; a host searching in
  the app hands it `countLocale`'s answer, as the layer's own components do.
- **`console-manifest` is the contract's manifest** (`docs/console-bundles.md`): the route a service
  answers it at, the two headers a console relays the owner key and the role in, the roles and whether
  one held allows one needed, the manifest's JSON Schema, its type with every optional field but the
  stylesheet filled, the reading that fills them or refuses a manifest naming each field at fault,
  whether a bundle's screens call a service (their own, or one named under `calls`), the methods a
  route under `relays` is named by and whether a manifest names a method and path there, and the types of
  a bundle's words and of its module's default export. A service and a console import it
  alike; it runs in a browser, on a server and in a test.

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

The layer reads these 90 keys and no others. The `wording-keys` shared module lists them, the one
list a host's pack is held to. Placeholders are named after each key.

- **`common.action`:** `cancel`, `choose_all`, `choose_none`, `close`, `close_all_tabs`,
  `close_other_tabs`, `close_right_tabs`, `copy`, `create_link`, `discard`, `fit_screen`, `more`,
  `next_picture`, `pause`, `pin`, `play`, `previous_picture`, `save`, `unpin`, `unshare`, `zoom_in`,
  `zoom_out`.
- **`common.aria`:** `close_named` `{name}`, `column_width` `{name}`, `decrease`, `download_named`
  `{name}`, `image_zoom` `{title}`, `increase`, `more_notices` `{n}`, `pinned_named` `{name}`,
  `share_address`.
- **`common.error`:** `editor_failed`, `link_copy_failed`, `picture_failed`, `share_create_failed`,
  `share_read_failed`, `unshare_failed`, `video_failed`.
- **`common.label`:** `day_format` (a date format the time module's day is written in), `days`
  `{d}`, `days_hours` `{d}` `{h}`, `expired`, `expiry`, `forever`, `hours` `{h}`, `hours_minutes`
  `{h}` `{m}`, `left_days` `{n}`, `left_hours` `{n}`, `left_minutes` `{n}`, `left_under_minute`,
  `link`, `minutes` `{m}`, `minutes_seconds` `{m}` `{s}`, `palette_forest`, `palette_lemon`,
  `palette_sea`, `palette_sunset`, `palette_teal`, `palette_violet`, `play_position`, `properties`,
  `seconds` `{n}`, `share_until` `{date}`, `short_day_format` (the short date format the time
  module's short day is written in, the year in two figures), `theme_forest`, `theme_sea`,
  `theme_sunset`, `theme_teal`, `theme_violet`, `unplayable`.
- **`common.message`:** `discard_confirm`, `link_copied`, and the theme preview's words:
  `preview_badge`, `preview_field`, `preview_link`, `preview_meta`, `preview_note`.
- **`common.status`:** `copied`, `loading`, `picture_loading`, `share_loading`, `video_loading`.
- **`common.title`:** `share_link`.
- **`files.action`:** `keep_both`, `replace`, `skip`.
- **`files.aria`:** `name_field`.
- **`files.label`:** `progress` `{done}` `{all}` `{percent}`.
- **`files.message`:** `conflict`.
- **`files.status`:** `uploading`.

That is 22 actions, 9 accessible names, 7 errors, 32 labels, 7 messages, 5 statuses and 1 title
under `common`, and 7 keys under `files`.

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
- **Width:** `--ui-container`, 48rem, the reading width; `--bmo-inset`, a container's own side room,
  added outside the reading width.
- **Height:** the library's `--ui-header-height`, 3rem, one height for a top bar and a panel's head.
- **Screen:** `--bmo-screen`, the visible height, `100dvh` while nothing overlays; `--bmo-screen-top`,
  where the visible screen starts, `0px` while nothing overlays.
- **Safe area:** `--bmo-safe-top` and `--bmo-safe-bottom`, the device's insets, nought where it
  reports none.
- **Motion:** `--bmo-motion-quick` 150ms, `--bmo-motion-pop` 200ms, `--bmo-motion-unfold` 320ms;
  `--bmo-ease-enter` `cubic-bezier(0.2, 0.8, 0.2, 1)`, `--bmo-ease-exit` `cubic-bezier(0.4, 0, 1, 1)`,
  `--bmo-ease-move` `cubic-bezier(0.4, 0, 0.2, 1)`. Tailwind's default transition is `quick` and
  `move`.
- **Focus:** `--bmo-focus`, primary's 600 in the light mode and its 400 in the dark; `--bmo-focus-width`
  2px; `--bmo-focus-gap` 2px.
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
  carrying `data-copy` beside the `pre`; a diagram's fence a `div` carrying `data-diagram` and
  holding its source as a `pre` and `code`, and after it, where the host gives a diagram zoom
  buttons, a `markdown-diagram-tools` row of `button`s each carrying `data-diagram-zoom` as `out`,
  `in` or `fit`, named in the host's words by `aria-label` and `data-tooltip`. The modules mark what they did on the same elements:
  `data-coloured` on a coloured `code`, `data-copied` on a button that has just copied,
  `data-drawn` or `data-failed` on a diagram's place, `data-zoomed` on a place whose diagram stands
  zoomed, and `disabled` on a zoom button with nothing left to do.
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
  `badge`, `tooltip`, `tabs`, `collapsible`, `navigationMenu`, `kbd`, `checkbox`, `switch`,
  `dashboardSidebar`, `container`, `select`, `selectMenu`, `inputMenu`, `dropdownMenu`,
  `contextMenu`, `modal`, `drawer`, `slideover`, `dashboardPanel`, `popover`, `chatPrompt` and
  `textarea`. A host's own app configuration merges over them.
- **What they hold, in short:** icons from Material Symbols; motion retimed onto the motion tokens by
  kind — growing, growing after a delay, unfolding, shading; badges and the small avatars on the
  14-pixel floor with `badge-ink`; the tooltip at caption size; focus inside clipping rows; the
  reading width on the dashboard panel and the container's inset outside it; no floor on the panel
  or the sidebar; dropdowns as wide as their longest item and no wider than the screen; dialogs
  growing out of their control and standing at once when they fill the screen; sheets clear of the
  safe area; popovers held to their room; the message bar's focus on its bar; text areas at full
  width.
- **The layer's Nuxt configuration** brings the library as its module with its semantic colours, the
  layer's stylesheet, the viewport meta (`viewport-fit=cover`, the keyboard resizing the content), the
  screen mode (dark until a reader chooses another, kept in the cookie `screen-mode` names), and the
  screen mode's ground painted from the first frame.

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
- **The tooltip setting.** The host's app root, the library's `UApp`, is handed the tooltip
  module's `TOOLTIP_PROVIDER` as its tooltip setting, so a focus the keyboard did not bring — the
  one a closing dialog or sheet hands back to its control — brings up no tooltip
  (`docs/components.md`, "Tooltips"). The layer's shared tooltip holds this on its own; the setting
  holds it for every other tooltip the library draws.
- **The patch.** The patch under `patches/` is applied to the same `reka-ui` version in the host's own
  install. It gives a collapsible region its own id from the region's root, so a button drawn before
  its region already names it and no id stands twice, and it stops a closed tooltip answering the
  keyboard, so the press that closes a dialog or a drawer is not taken by the tooltip that names a
  control inside it.
- **The choice of theme and palette.** Where a reader's choice is kept, and stating its declarations
  in the page's head from the first frame, are the host's. Without a theme's declarations the
  library's own colours stand; the palette tokens stand only once a palette's declarations are
  stated.
- **Its own grounds.** A host that draws on the palette's grounds reads the palette tokens; every ink
  and surface it computes on them is its own.

## Versions

- **The layer requires** Nuxt 4.5 or later within 4, `@nuxtjs/i18n` 10.6 or later within 10 and
  `vue-i18n` 11.4.8 or later within 11, the engine that module requires, as peers, and brings Nuxt
  UI 4.11 or later within 4, with the two icon sets it draws from: Material Symbols and the Material
  Icon Theme. The command and its MCP server run under Bun 1.3 or later, on the MCP SDK 1.32 or later
  within 1 and zod 4.
- **It stands on registry packages alone;** no other repository is a dependency.
- **One version for the whole repository,** the manifest's; the README states what may change at
  which release.
- **The packed files under the earlier numbering** stay under `releases/` by their own names:
  `bmo-ui-0.2.0.tgz` holds revision `0.1.0-rev.1` and `bmo-ui-0.3.0.tgz` holds revision
  `0.1.0-rev.2`, each under its earlier number. The base `0.1.0` has no packed file.
