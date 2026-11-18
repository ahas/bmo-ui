# Components and behaviours

What the layer's shared components and behaviours do. Each supplies the mechanism and a safe
default; a screen supplies what it holds and what a press means there. Every export is listed in
`docs/boundary.md`.

## A line longer than its box

- **A line longer than its box is not cut but slides** (`MarqueeLine`). It runs to its end and back
  to its start, pausing briefly at each end so both its head and its tail are read. What slides is
  one copy of the words — nothing is duplicated to make it move — so the line is still selected,
  copied and read by a screen reader as the one sentence it is.
- **Only a line of words slides; a time does not.** What sliding buys is the tail that would have
  been cut, which is worth it only where there are unread words. A time is read at a glance, and a
  line of a time alone breaks between its date and its clock where room is short. A line where a time
  stands between words slides as it is, since what is cut there is the words after it.
- **A line that fits does not move** and is clipped with an ellipsis as any line is. The measuring
  keeps watching the box's width and the line's words: narrowing starts the slide, widening stops
  it on the spot. A line redrawn every second does not return to its start on redraw; only its
  distance and duration change, so a slide already going continues.
- **The speed is the same on every line,** so many pixels a second (the marquee module states it),
  so a long line takes longer rather than moving faster. While a pointer rests on it, and while the
  keyboard's focus is in its box, it stands still. Where the reader asked for less movement nothing
  slides on its own and the box is pushed by hand instead; a vertical sweep over it still scrolls the
  screen, and only a sideways one pushes the line.

## Count badges

- **A count standing as a badge beside a label is one small pill everywhere,** stated once in the
  numbers module as `COUNT_BADGE`.
  - The caption size, 14px, in normal weight and tabular figures, on a 16px line with no room above
    or below it, so the pill stands inside the label's line and on its middle.
  - A tint of its colour under the colour's own words, never the colour filled solid: the primary
    colour where it is news to the reader, neutral where it only says how many.
  - Its ends round whole, and it is at least as wide as it is tall.
  - Its number turns as it changes (the Motion section of `docs/design.md`).

## Name and value lists

- **A list of names each with its value is one shape everywhere,** the `pair-list` utility.
  `PropertyList` draws one for the details of a file or a document.
- **From the small breakpoint up, a name stands beside its value;** under it, a name stands on its
  own line over its value, and one pair is parted from the next by more than a name from its value.
- **A value is never cut.** A word or a path that cannot break keeps its whole width, and the list
  scrolls sideways inside its own box; the screen never does, and no value ends in an ellipsis.
- A list of several figures to a row, or a form's label and field, is not this shape.

## List search

- **One search for every list,** the search module. A list hands it, for each record, every text the
  record carries, each marked as shown on the line or not. The phrase typed is matched whole and
  without regard to case.
- **What the line shows is searched.** A number, a state, a badge read on the screen finds its line as
  surely as a word inside the stored data does.
- **A hit is marked where it stands** (`SearchText`): the matched part of every shown text is
  highlighted.
- **A hit only in hidden data is said under the line** (`SearchHit`): when nothing the line shows
  matched, one line under it names the field it matched in and the words around the hit.
- **Letter case is folded in the host's locale** (`docs/boundary.md`). The module is shared and reads
  no app configuration, so each call is handed the locale; the layer's own components hand it the
  host's setting.

## Tab bar and toolbar

### Two kinds of tab

- **Open-and-close tabs** — files, documents, sessions a reader opens and closes — stand as the
  layer's tab bar (`TabBar`). **Fixed switches within a screen** stand as the component library's
  tabs. Nothing lines up buttons to mimic tabs.

### The tab bar

- **A tab belongs to a screen.** The screen holds the tab list; the tab bar draws it and reports what
  was pressed, what is closed and what was dragged where. The tabs module supplies the list's
  operations: opening into the list, merging a kept list with what opened meanwhile, pinning,
  ordering, choosing what to close, and naming a file tab.
- Pressing a tab, or moving with the arrow keys, Home or End, makes that tab stand, and a standing tab
  always comes into view within the row.
- **Closing** is by the tab's close mark, the middle button, Delete on a focused tab, and the tab's
  menu — close, close others, close to the right, close all. The close mark always shows on the
  standing tab and on hover on the others, and always under a finger.
- **Dragging** a tab onto another puts it before that tab, and onto an empty place puts it at the
  back.
- **Closing what a tab stands on** stands the most recently seen of the tabs left, and with none left
  the screen is empty.
- **A file tab carries the file's name,** and its whole path where files of one name are open
  together. The full path stands on hover.
- **A tab is the row's whole height.** The row's bottom line is drawn over the tabs' last pixel rather
  than as a border under them, so a tab stands exactly as tall as the row — 36 pixels, 40 under a
  finger. The same holds for the library's own tab rows (`TAB_ROW_UI`). A view switch and the actions
  at the row's right end are small buttons centred in the row, each group parted from the tabs by a
  line, its buttons 4 pixels apart and 4 pixels from the group's edges.
- **A tab's menu under a finger.** A long press on a tab is a drag, so a finger opens a tab's menu by
  tapping the tab that already stands; it drops from the tab's bottom-left corner. A right click opens
  it wherever there is a mouse.
- **Pinning.** A tab's menu pins it or lets it go.
  - Pinned tabs stand together at the row's left end, in the order they were pinned; a tab let go
    stands first after them.
  - A pinned tab shows a pin where its close mark would be, and closes only by its own closing — the
    menu's close, the middle button, Delete — never by closing others, to the right or all.
  - A drag never crosses the edge between pinned tabs and the rest.
  - A screen that closes tabs for room closes the unpinned tab seen longest ago, never a pinned one.
  - A screen may add choices of its own to a tab's menu, under the closings and the pin.
- **A read-only tab bar** shows, switches and pins. It has no close mark and no dragging, its menu
  holds the pin alone, and it does not listen to Delete.
- **Keeping tabs** across visits is the host's: the tabs module reads a kept value only as far as it
  still reads as tabs, and merges it with what the screen opened meanwhile.

### Actions and the toolbar

- **Actions are one group** (`ActionGroup`): work on what the standing tab shows is gathered at the
  right end of the toolbar, or of the tab bar's line where no toolbar stands. Three or fewer stand as
  icon buttons, each named by its tooltip, a toggle standing pressed while on; four or more fold
  into one menu, where a toggle carries its check. A screen never shows two such menus at once.
- **Every icon button is the layer's icon button** (`IconButton`): the library's button drawn as its
  icon alone, named by one set of words that is both its accessible name and its shared tooltip, so
  the two never part. A tap presses it, so a finger held on it names it and lifting presses nothing.
  It stands neutral and ghost unless it is told otherwise, and takes everything else the library's
  button takes: its icon, size, colour and variant, a press, a route, and what a menu or a popover it
  opens puts on its trigger. A screen of the host's or of a console bundle draws an icon button this
  way, never as the library's button inside the library's own tooltip, which no finger reaches.
  `ShellClose` is the close of a modal or a side sheet, named that way.
- **Properties are the last of the group.** What a file or a document is opens from the properties
  action: a popover on the button on a wide screen, a sheet from the bottom on a narrow one, which
  the back gesture closes.
- **View switching.** A view that is on or off is a toggle. A choice of ways of reading one thing is
  a switch whose choices share its width equally (`TabSwitch`). Each choice is the library's small
  button, the standing one outlined on the page's own ground and the rest ghost, so a hover and a
  press fill only the choice's own rounded shape. The arrow keys, Home and End walk the choices, with
  one of them in the keyboard's order. On a phone it shows its icons alone, each named by its tooltip.
- **Dropdowns** are never narrower than their longest item nor wider than the screen less a gutter
  each side, their items scrolling sideways together past that, and open against the edge of the
  control that opened them. A menu dropped from a button is exactly as wide as its longest item, and
  an item's trailing column takes no room on a row that has none. A list that drops for a value it
  shows — a select, an input with a list — is floored at its control's width. The layer's overrides
  of the library state this once.
- **The toolbar** (`ToolBar`) binds the information and buttons for one target in one line, flush
  against it. It fills its container end to end, its borders continue the rows it touches, and its
  items are cells parted by dividers. What does not fit scrolls sideways within it. A cell pushed to
  the end stands at the right, with those after it.
- **A toolbar's button is the library's small button at its own size,** centred in the row with room
  above and below it; the row is 36 pixels tall, 40 under a finger, and no button is stretched to its
  height or to a square cell. A button's hover and press colours fill its own rounded shape and nothing
  round it, so a hovered button never paints its cell or the row. The toolbar sets the small size once
  for every library button standing in it, so a button that names no size of its own stands small, and
  an icon-only button is the library's small square icon button. A button's word never breaks into two
  lines. The toolbar clips what stands past its edge, so a button in it draws its focus ring inside its
  own edge.
- **A cell is as wide as what it holds.** A cell of words keeps the toolbar's own room on either side.
  A cell holding only buttons keeps none of that room, only the small room its buttons stand from the
  row's top and bottom, at its ends and between them. The toolbar tells a button by its being the
  library's button, whether it is drawn as a button or as a link, never by its element. A button the
  shared tooltip names is a button too: the tooltip's own box, holding that button and nothing else,
  counts as the button it holds, so a cell of named buttons keeps no room of words. A cell that is a
  component of the library keeps the padding and gap that component comes with.
- **A bar gathers by the room it has, not by the window's width.** The room is read off the bar
  itself. Short of it, the bar keeps what a hand reaches for first, in the order written, and folds
  the rest into one more-menu at the end. How much room is enough is one reading for every bar, the
  actionbar module's. The choose-all control and the way out of a choosing state never gather.
- **A choosing control stands on the same vertical line as the marks it speaks for.** It stands in a
  cell of words, and its pressable shape reaches out before its box by the room it keeps inside, so the
  box lands where a row puts its own mark; the bar keeps at its trailing edge the room the scrolling
  body's scrollbar takes.
- **A row of the library's tabs keeps its whole height:** fixed, with no padding above or below, the
  tabs filling it, the active line on the row's bottom edge; a row wider than its place scrolls
  sideways and never vertically.

### Creating

- **Creating is one button** (`CreateButton`). A screen that makes a new thing of what it shows
  makes it from this button and from no other: no create button of a screen's own, no primary icon
  button standing in a row and no create button carrying an icon and a word. One screen stands one
  of it as its own, for the screen's main new thing, and an add that belongs to a row stands its
  own, contained (below). What it creates is the host's word, handed in as its name; what a press
  does is the host's too, whether it makes the thing at once or opens the menu or popover the host
  wraps round it. Where its cell stands is the host's, through a class or a style handed to it;
  everything else handed to it lands on the button, and nothing handed to it changes its colour,
  variant, size or mark.
- **On a wide screen it is a grey icon in the row.** It is the layer's icon button, neutral and
  ghost, with the add mark, standing as a cell of its own at the right end of the row the screen's
  own actions stand in: its toolbar, or its tab bar's action area where no toolbar stands. Its
  tooltip names what it creates and the key that presses it.
- **On a phone it floats.** The same button is drawn instead as a primary solid icon button with
  the add mark, at the library's largest size, fixed at the screen's bottom right, 16 pixels from
  the right edge and 16 pixels above the device's bottom inset, and nothing stands for it in the
  row. It is drawn at the end of the app's root element, above everything the screen draws and under
  everything the library floats over the page: the app's root is an isolated stacking context, as the
  component library makes it, and a dialog's or a drawer's overlay, a menu and a tooltip are drawn
  outside it, so an overlay covers the button however early or late its dialog was set up. The app
  names its root only once its first drawing is done, so the button floats once the app has
  mounted, and a screen drawn in that first drawing, opened straight from its address, floats its
  button in the root as one opened later does. Its fill
  takes the darker step a coloured badge takes (`badge-ink`, `docs/design.md`), so its white mark
  reads at 3:1 or better in both modes. Its medium corner is a button's, since nothing but a face and
  a dot is round. It carries `data-screen-foot`, so what a console floats of its own accord stands
  above it (`docs/console-bundles.md`, "How a bundle mounts"). A finger held on it names it, as on
  every icon button; its key is not shown, since a phone has none.
- **An add that belongs to a row stays in its row.** Only the screen's main new thing, a new mail
  or a new note, floats on a phone. A create button whose add belongs to a row, a sidebar's or a
  list's head, a tab bar's tab add, or the row of a dialog, a drawer or a sheet, is marked as
  contained (`contained`) and is then the grey icon in its row at every width, the layer's icon
  button as it stands in that row: it never floats, so it shows and is pressed only where its row
  shows, and a sidebar hidden on a phone leaves nothing of it over the screen. It answers no key and
  its tooltip names none, since the screen's key presses the screen's own button. A screen may stand
  any number of contained create buttons in its rows beside its own one, and none of them takes room
  from a list's foot.
- **A list under the floating button keeps room for it.** The layer's `--bmo-create-room` token is
  the room the button takes from a list's foot on a phone, the button, its gap from the edge and the
  device's bottom inset together, and nought on a wide screen. A screen standing the button pads the
  scrolling end of its list by that token, so the last item, scrolled to its end, stands clear of the
  button.
- **A menu wrapped round it stands on the button.** A menu or popover the host wraps round it takes
  for its content the settings the `create-button` module's `menuContent` makes from the button the
  component exposes, made once as the screen is set up and handed over from the menu's first drawing
  on, since the library passes on to a menu's content only the settings present as the content is
  first set up. Where the button floats, on a phone, it is drawn elsewhere in the page and the menu
  finds nothing of it in its own place, and where it stands in its row, on a wide screen and marked as
  contained at every width, what the menu finds is the button's cell, which takes no focus; so the
  settings place the menu against the button's own box wherever it stands as the menu opens, align
  the menu to the button's end edge, and hand the focus the menu held back to the button as the menu
  closes; a focus the reader moved out of the menu as it closed, a press on a field outside it, stays
  where it went. The host lays its own content settings over them.
- **Its key presses it.** A create button that is not contained answers one key, `n` unless the host
  names another or none, and a press of that key does what a press of the button does: it clicks the
  button itself. A menu or popover the host wraps round it lands its trigger's handling on the button,
  as everything handed to it does, and the library's menu and popover triggers open on a click of the
  button, so such a menu opens on the key as on a press, in both shapes, with no handler of the host's
  own. The key acts only while the button stands enabled, while no field holds the typing and while
  nothing floats over the screen, so a key typed into a form or under a dialog makes nothing. The key
  is named once, as the button is set up.

## Settings

- **Settings are a list of sections and the open section beside it.** The list stands in a column at
  the left, each section one line of an icon and its name, the open one marked; the section's own
  name heads the right, with the close mark at its right end, and its content scrolls under it. On a
  narrow screen the whole fills the screen and opens on the list alone; a tap on a section goes into
  it, the head then carrying a back arrow before the section's name, and the arrow or the back
  gesture returns to the list. The frame, its sections, their names and how an address opens one are
  the host's; the layer supplies what a section is built from.
- **A section's content stands in groups** (`SettingsGroup`) under small headings, each group a column
  of rows parted by hairlines, with room beside its heading for something centred on it at its right.
- **A row** (`SettingsRow`) carries its name and, where needed, one muted line under it at the left,
  and its control at the right: a choice of two or three a segmented control (`SettingsSegment`, a
  group of radios to a screen reader, named by the setting it stands for), a longer one a list, an
  on-off a switch, an action a button. A row whose control does not fit beside its name puts the
  control under it, at the right.
- **Everything in a section takes effect as it is changed.** Nothing waits for a save.
- **A setting that needs a form of its own opens one** (`SettingsDialog`): a dialog with its title,
  an optional description, its body and a footer, wide enough for a table's row where it asks.
  Handed its form's opened-with snapshot (or, for a form with no values to hand, told whether it
  holds changes), it asks before it closes on changes, by every way of closing (see Forms); handed
  nothing, it is no form and closes at once.
- **The theme and palette pictures** — `ThemePreview`, `ThemeSwatch` and `PaletteSwatch` — draw an
  entry in one mode on their own box, as a row's choices.

## Sharing

- **One dialog shares a thing** (`ShareDialog`), whatever is shared: by a link anyone holding it opens,
  and with members of the reader's company where the host offers them. It is a small form, so it is
  the settings dialog in the middle of the screen at every width, titled by what it is, the name of
  what is shared under the title where the screen behind does not say it. The link part stands first;
  the member part stands under it only where the host hands a member road, and a host that hands none
  gets the link part alone.

### The link

- **The dialog makes, shows and ends one share link.** The link's action is the footer's; the
  member part's actions stand beside what they act on.
- **The host hands it the road its links go by** (the share-links module): how the one standing link
  is read, how one is made for a span, how it is ended, and the page a link opens, as a path or a
  whole address. The dialog calls no server and knows nothing of what a link opens. The host also
  hands it the spans offered, each a value of its own and the words it is chosen by, and which one is
  offered first; which spans there are is the host's policy.
- **It opens on what stands.** Each time it opens it reads afresh, a skeleton standing while it reads.
  With no link it offers the spans as one dropdown, and making one is the footer's action; with a
  link it shows the address in a read-only field in the machine face, every character chosen on
  focus, a copy button beside it naming itself in a tooltip, and a chip of the link's end. Ending the
  link is the footer's action, in the colour of an action that removes something.
- **Making one leaves the dialog standing.** The link made takes the form's place, so the address is
  read and copied where it was asked for. A link is given another life by being ended and made again;
  nothing edits one.
- **The address is one somebody outside can open:** the road's page read against the page the
  dialog stands on.
- **A link's end is shown as the date it ends on, never as time left.** The chip says the date it
  stands until, in the host's short date format, with the moment it ends to the minute in a tooltip;
  a link that never ends says it has no end, and one past its end says it has ended, in the failure
  colour. The share-links module's reading is the one every screen uses wherever it names a link's
  end, so a list of links and the dialog read alike. Whether a link has ended is read against a
  clock moved while the screen stands.
- **A copy says whether it worked** on the message pill. A refused read, make or end says why inside
  the dialog, in the host's words for the failure where it hands the dialog its own reading of one,
  and the server's message otherwise.
- **The screen is told what it is shared by.** Each read, make and end tells the screen behind the
  link's end as it now stands, or that nothing is shared by link, so the screen need not ask the
  server again.

### Members

- **The host hands it the road members go by** (the share-members module): a search of the people
  the thing may be shared with, given words; who it is shared with now, each a person and a
  permission; sharing with one or more people at a permission; changing one member's permission;
  taking one member off; and the permissions it grants, where it grants fewer than all. A person is
  the account key, the name, the organization and the job title. Who the people are, where who is
  shared with is kept and which permissions there are to grant are the host's; the dialog calls no
  server.
- **A permission is `read` or `edit`, and the host grants one or both.** A host that names none
  grants both. A member is given `read` where the host grants it, and `edit` where it grants that
  alone.
- **Each member's row offers the permissions granted in one dropdown,** read first, and another is
  chosen there. A member who holds a permission the host no longer grants keeps it shown among them.
  Where a row would offer one permission alone, it says that permission in words where the dropdown
  would stand, and nothing on the row changes it.
- **Members are found by a search** in one field under the part's label: it asks the road once typing
  stops, drops an answer to words already typed past, and offers each person by name with the
  organization and job title under it, the words typed marked where they stand. The people found
  stand in a menu only while words are typed, and the menu keeps them while it closes. Whoever it is already
  shared with is not offered again. One or more are picked, each standing as a chip in the field, and
  the share action beside the field shares with all of them at once and empties the field.
- **Each member stands on a row** under the field: the name with the organization and job title
  under it, the permission, and an icon button that takes the member off, named in its
  tooltip.
  With nobody shared with, one line says so.
- **Every change takes effect as it is made.** Sharing, changing a permission and taking a member
  off are each stored on their own, so nothing waits for a save; the control that made a change
  spins until it stands.
- **It opens on who it is shared with.** Each time the dialog opens the member part reads afresh, its
  rows a skeleton while it reads, the field and the label drawn at once. A refused read, search,
  share, change or removal says why inside the member part, in the host's words for the failure where
  it hands the dialog its own reading of one.
- **The screen is told how many it is shared with.** Each read, share and removal tells the screen
  behind the count of members as it now stands.

### Both parts

- **What stands is kept while the dialog closes,** so its body does not blink on the way out.

## Messages

- **Everything told to the reader stands in one place:** a notice of something that arrived and the
  word that an action went through or did not stand on one pill at the top of the screen, centred
  (`MessageIsland`, driven by the island module). It stands in place of the library's toaster, which
  is not stood up, and the browser's own dialogs are not used.
- **The pill tells and never asks.** A question the reader answers before an action — the one asked
  before changes are thrown away included — is a small dialog in the middle of the screen
  (`QuestionDialog`, opened through the question module), never the pill.
  - Its title is the question, naming what the action is taken on or throws away; the item it is
    taken on stands under it where the question does not name it, and what going through does stands
    in its body where that is more than the question says.
  - Its foot holds the way out first, cancel, and the way through last, in the error colour, under
    the action's own verb rather than a bare yes.
  - Only the way through answers yes. The way out, its close, Esc, a press outside and the back
    gesture close it and answer no.
  - A question asked while the page is being left is holding that navigation, so it takes no entry
    of the back gesture (see Floating things); every other way out still answers it.
  - The question asked before changes are thrown away is the key `common.title.discard_changes`,
    gone through with `common.action.discard`.
- **It is a pill of one radius at every size.** With a line to say it is a narrow line; with a
  description or something to press, it widens into a card of the same rounding. It is measured and
  given that size, so it moves between shapes instead of jumping.
- **It unfolds from its own centre,** from no width to its full width, and folds back the same way.
  Only what it says fades. Its words are laid out at full width from the first frame and hidden past
  its edge until it is open. Where less movement was asked for, it stands and goes at once.
- **The whole of it is the press.** Where a notice leads somewhere, pressing it goes there; where it
  leads nowhere, the press puts it away. A further press it offers is a button of its own inside it,
  at the small size, as tall as a line of its words on a pointer and a finger's height on a touch
  screen: at the line's end, centred on it, where the notice says one line, and under its words where
  it says more.
- **One stands and the rest wait.** The one standing carries how many are behind it, and the next
  takes its place the moment it goes, so the pill morphs from one to the next. The same thing said
  twice replaces itself where it stands. The line holds five, and drops its oldest end.
- **Back does not take a notice.** A notice goes on its own, and a press of back spent on one is a
  press the reader has to make twice, so the pill is not registered with the back gesture.
- **Its surface is fixed dark in both modes,** its words and marks with it. The tone is carried by the
  mark alone — a note, success, a warning, a failure — never by the whole surface.
- **Where it stands.** Over everything else, drawn into the page's body beside what the library floats
  there. It follows the visible screen's top, so a page pushed up to reveal a focused box does not
  carry it off, and keeps clear of the top safe area.
- **What is not this.** A confirmation that belongs to the row it acts on stays on that row, and a
  form's refusal stays beside the field refused.

## Forms

- **A form saves once, from its foot.** A form that edits stored values carries one save in a footer
  that stays put while the body scrolls. What is changed is held in the form until the save sends
  every changed value together; a dialog closes once its save has gone through. The form-save module
  holds this, its parts registered with it.
- **Save is on only while the form holds changes.**
- **A form holds changes only while its values differ from what it opened with.** The form-save
  module's opened-with snapshot (`useOpenedWith`) reads this, and it is the one reading of it: a
  screen hands the form's values, never a flag of its own, and the snapshot is taken of those same
  values once the form stands open with its data in it. A form opened and closed untouched holds no
  change, a new record's empty form among them, and neither does a change written and then put back.
- **The snapshot is taken once the form is filled.** A dialog's form is snapshotted when the dialog
  opens and the screen says its form is ready (at once where it says nothing), after everything the
  opening set off has been drawn. Until the reader first presses or types anywhere on the page after
  that, a change of the values is the form being filled rather than an edit, and the snapshot
  follows it; a form whose data may land after the reader's first press says when it is ready.
  Closing the dialog drops the snapshot and the next opening takes a new one. A form standing on a
  page opens with the page.
- **Values are compared as the inputs leave them.**
  - A string is compared trimmed.
  - A number is compared by value, and a number and the text an input writes for it are alike.
  - A date or a time is compared by the ISO text it gives for itself, so two values naming the same
    moment are alike whatever object holds them.
  - Missing, null, an empty or blank string, a number that is none and an empty list are all alike
    empty, a key holding an empty value is alike to no key, and an object holding nothing but
    empty values is empty too.
  - An object is compared key by key, a list item by item in order, and any other object (one that
    gives no text for itself) by identity.
  - Where two writings mean the same thing to a screen, the screen hands the meaning as the value.
- **A block that has no values to hand says itself whether it holds a change.** The close
  guard of a floating form, a block of a form's frame and the settings dialog each take either the
  snapshot or a check of the screen's own. The check is only for a block whose changes are no
  values it can hand: an editor holding its own buffer that says only whether that changed, or work waiting as a
  list of operations rather than as values.
- **Save saves at once.** What a field's change sets off is said beside the field before the press.
- **A save that went through is what is saved from then on.** The form takes the answer as its new
  saved values, so it holds no change the moment the save is done: once what the save set off has
  been drawn the snapshot is taken again from the values the form then holds, by the frame for each
  block it saved and by the screen for a dialog that saves itself.
- **Leaving with changes asks first.** Closing a dialog whose form holds changes — its close, Esc, a
  press outside, the back gesture — and leaving the page ask first, in the question dialog, whether to
  throw the unsaved changes away: discard drops them and goes, and every way out of the question
  stays. With nothing changed it goes at once.
- **A dialog never closes itself past the question.** The component library's modal closes on its
  own when the close in its corner is pressed, beside whatever the close says to the screen. So a
  dialog with a close guard (`useCloseGuard`, which the settings dialog holds) takes every request
  of its modal to close as a request to leave, handed to the guard, and the dialog closes only when
  the guard lets it go; the modal's open state is never bound both ways. The request reaches the
  guard through the open state alone, and the modal is left to dismiss itself with the guard the one
  refusal: an outside interaction the modal refuses on its own, such as a menu handing the focus
  back to its trigger while a picker in the dialog stands open, is never read as a request to close
  and raises no question. The press of that close then reaches the guard through the modal alone,
  so a screen clearing its form as the dialog closes raises no question; where a press does reach it
  twice, a request to leave a dialog already closed is none. A screen that builds its own dialog with
  the guard and `ShellClose` in the modal's close slot wires it the same way. The guard also says
  whether its form holds no change (`dismissible`); a modal bound to it reports every outside
  interaction it then holds off as a refused close, a refused focus among them, so a screen that
  answers that report by leaving asks where nobody asked to close.
- **A refused save keeps every change as written,** with the reason under the field it names. A save
  made in several steps stops at the first refusal, and what went through before it stands as saved.
- **A text box of a form grows with its text and never scrolls inside** (`GrowingTextarea`). It is
  measured again whenever its width changes as well as its text — a scrollbar appearing, the window
  resized, a webfont landing — and growing moves neither the scroll around it nor the caret off the
  screen. Only a box pinned outside a scroll stops at a height.
- **A number box stands as wide as the values it takes** (`NumberInput`), with its unit after it.
  Each carries its two step buttons, each naming itself in a tooltip. On a wide screen they stand
  stacked at its trailing end, up over down, each half the box's height; on a narrow screen they stand
  at its two ends, minus at the leading end and plus at the trailing one. On a touch screen the box is
  taller and each button 24px or more.
- **What is not a form** takes effect as it is done and carries no save: a table whose cells are each
  their own editor, a page of standing switches, a list whose records are each stored on their own.

## Choosing a value

- **A value is chosen from a list in one select** (`ChoiceSelect`), the component library's select
  menu with the search held by the rule below. It takes everything the library's select menu takes:
  its value, one or several, its value key, its placeholder, its size, its look and its slots. A
  screen stands it wherever a value is chosen from a list, a filter's among them, and never the
  library's select, select menu or input menu bare, nor a dropdown menu of checks standing in for a
  select.
- **A list searches once it holds more than seven choices, and only then** (the choices module's
  `SEARCH_ABOVE`). The count is of the choices it is handed: a group's label and a separator are no
  choices. A list read from data therefore takes its search the moment it grows past seven, on every
  screen at once, and no screen decides whether its list searches.
- **A list found on the server always searches.** The screen hands the road that finds choices for
  the words typed (`find`); once typing stands still for a pause the road is asked, only the answer
  to the last words asked lands, and the list shows that answer. Before anything is typed it shows
  the choices it is handed, among them those already chosen, so the field names them.
- **The list opens against the control's leading edge,** as every dropdown does (see "Tab bar and
  toolbar").
- **The search field stands at the top of the opened list,** above the choices, its search mark
  leading and the pack's words for a search as its placeholder. It has no edge of its own, so while
  it holds the focus it takes the elevated background, as a field with no edge does. Opened by a pointer or a key, the
  field takes the focus, so typing searches at once; on a touch screen it does not, so the keyboard
  covers nothing until the field is pressed. Closing the list clears what was typed.
- **What a choice shows is what is searched:** its label and the line under it, matched by the
  search module as every list search is (see "List search"), the matched part marked where it
  stands. A group's label stays while any of its choices does, and a separator stands only between
  groups that both stay.
- **An empty list says why.** Nothing matched the words: the pack's words for no match. No choices
  at all: the pack's words for an empty list, or the screen's own word for its list where the
  wording guide gives one. A refused find: the pack's words for a search that failed. While the
  road is asked, the choices it last answered stay shown and the field's busy mark spins; where it has
  shown none, a skeleton line stands where the answer will.

## Dates

- **A date is chosen on one calendar** (`DateCalendar`), the component library's own calendar of
  days, one date, several or a range, with everything the library's calendar takes: its value, its
  bounds, the dates it refuses, its size and its cells. A screen stands it wherever it lets a date be
  chosen, in a popover under a field or open on the page, and never the library's calendar bare.
- **Each paging button is named** in the shared tooltip, in the host's words, as every icon button
  is (see "Tooltips"). Among the days the outer two page a year and the inner two a month; among the
  months the inner two page a year; among the years they page a run of years. Each carries its name
  as its `aria-label` and its `data-tooltip`, and the markup button layer names it, so a screen
  reader hears the words the tooltip shows and a finger held on a button names it without paging.
- **Its heading steps through the views,** the library's own way: a press on the month shown opens
  the months of its year, a press there the years, and a press among the years comes back to the
  days. A month or a year chosen there opens the view below it on what was chosen. The heading is
  the calendar's own, so a caller fills every other slot of the library's calendar but that one.

## A held finger

- **A finger resting on one point for half a second is a hold,** a touch screen's right press: it
  opens the menu a screen offers there, or starts choosing on a list that chooses many, with a short
  vibration where the phone has one. The longpress module is the one reading of a hold, so a hold
  takes as long and ends on the same movement wherever it stands; a screen supplies only what it
  means there.
- **A finger that moves while it is held is not holding.** Before the half second is up the press
  ends, opening nothing, as soon as it slides more than ten pixels from where it landed, what it
  stands on starts to scroll, it lifts, a second finger lands, or the browser takes the touch for a
  gesture of its own. A scroll that sets off slowly and stops with the finger still down stays a
  scroll.
- **A finger that lands on something still gliding from a flick is stopping it,** not pressing.
- **What a hold does once it has fired is the screen's.** A menu it opened stays open while the finger
  moves on or lifts (`useHoldMenu`); a hold on a choosing list drags the choice along the rows it
  passes (`useDragSelect`).
- **Where a hold opens a menu, a finger never selects words.** On such a surface a finger's press
  takes no text selection and brings up no menu of the phone's own. A mouse selects as ever, and a
  field inside keeps its caret for either.

## Tooltips

- **Words that say more than what they stand on go through one shared tooltip** (`HintTip`): a name
  cut short by its box, a number standing for something with a name, a mark whose meaning is its
  name. A screen says what it holds; how it comes up, where it stands, how wide it grows and how it
  goes are the tooltip's, stated once in the tooltip module.
- **A pointer brings it up on hover and the keyboard on focus,** including a focus landing on a
  control inside what it stands on. It grows out of what it stands on at `quick`.
- **A focus the keyboard did not bring brings up no tooltip.** Two arrivals are not the keyboard's:
  the focus a closing dialog or sheet hands back to the control it was opened from, and the focus a
  dialog takes up on its own close as it opens. The first would leave that control's name standing
  over what the reader returned to; the second would stand a name over the open dialog and spend the
  reader's first Esc closing the name rather than the dialog. The shared tooltip and the library's
  dialog close (`ShellClose`) hold this themselves, the close by telling the shared tooltip which
  focus is the keyboard's where the browser's own tell cannot, and the tooltip module's provider
  setting holds it for every other tooltip the library draws, once the host hands it to the
  library's app root (`docs/boundary.md`, "What the host owes"). The dialog close names itself on
  focus only where the page's own modality mark (`docs/design.md`, "Focus") names the keyboard and
  the focus came to it from a control of its own dialog. The browser's visible-focus tell cannot stand in, since it
  carries over from whatever the page last showed focused, and a dialog opened by a key is no more
  named by its opening focus than one opened by a press. The keyboard moving round the dialog onto
  that close, or a pointer hovering it, brings its name up as it does for any other control.
- **A finger has no hover.** Where a tap does nothing else, a tap brings it up; where a tap acts, a
  finger rests on it instead, by the one held finger, and lifting presses nothing. The next touch
  anywhere puts it away.
- **What a tap acts on is named the shared tooltip's way too:** an icon button through the layer's
  icon button, a choice of the view switch shown as its icon alone through the shared tooltip
  marked as standing on a press, and a button a host writes as markup, or the library draws inside a
  component of its own where the layer can stand nothing around it, through the markup button
  layer. The library's own tooltip comes up for a pointer and a focus alone, so nothing the layer
  draws, and nothing a host draws, names a control with it, and the stylesheet draws no name of its
  own over any control.
- **A control a key presses names that key in its tooltip,** after its words, in the library's key
  marks; the shared tooltip and the layer's icon button take the keys to show beside the name.
- **A tooltip switched off comes up for nothing:** no hover, no focus, no tap and no resting finger opens it, so
  what it stands on is pressed as if no tooltip stood there.
- **Its words wrap** inside a box no wider than a phone has room for.
- **It is drawn into the page's body,** unless what it stands on is inside an element taken to full
  screen, which is all the browser shows then: the caller names that element, to the shared tooltip
  and to the icon button alike, and the tooltip is drawn inside it.
- **A cut name names itself only where it is actually cut,** measured as the tooltip is about to come
  up.
- **It stands on what it names through a box of its own,** and marks that box each time it is drawn
  where the box holds one element and no words, so a row that lays out the controls it holds, as the
  toolbar does, reads the box as the control inside it.
- **A page layer names what it finds itself** (the page-tip module). Where what is named carries no
  component of the layer's to stand a tooltip on, one layer over the whole page finds it under the
  pointer, a keyboard focus or a held finger, and brings up the shared tooltip over it, standing in
  front of every dialog and notice. Each layer says only what it finds and what its words are; how
  the tooltip answers is the page tooltip's, the same for every layer, and a screen reader hears its
  words as they now read, however often they change while it stands:
  - A pointer waits the tooltip's usual moment, and moving on to another thing the layer names while
    one stands brings that one up at once. Leaving it, pressing anywhere or scrolling what holds it
    puts it away. Whether the layer still names it is asked again as the wait ends.
  - A keyboard focus brings it up at once and takes it away as the focus leaves.
  - A finger held on it brings it up by the layer's one held finger, beside whatever a row's own
    hold does, and lifting that finger presses nothing. What it holds selects no words, and the
    phone's own long-press menu over it is turned away. Sliding the finger, or the next touch
    anywhere, puts it away.
  - The host stands each layer once inside its app root, beside its pages (`docs/boundary.md`, "What
    the host owes").
- **Every line cut with an ellipsis shows whole, with nothing written for it** (`CutLineTip`, driven
  by the cut-lines module), a page layer: under the pointer, the line whose box ends its words in an
  ellipsis or clamps them to a count of lines and actually cuts them; under a keyboard focus, that
  line or the first such line inside what took the focus; under a finger, the line it holds. Its
  words are the line's whole words.
  - A line already inside a tooltip of its own is left to it, and a line that slides has none.
- **Every button a host writes as markup is named by its words alone** (`MarkupButtonTip`, driven by
  the markup-buttons module), a page layer. A button the layer draws no component for, such as a
  fenced block's copy button or a diagram's zoom buttons that the host's renderer writes into the
  text it draws, carries its name in `data-tooltip` beside its `aria-label` (`docs/boundary.md`,
  "Classes and keyframes"). So does a button the library draws inside a component of its own, handed
  the two attributes through the props that component passes on to it, as the date calendar's paging
  buttons are (see "Dates"). The layer finds such a button under the pointer, under a keyboard focus
  landing on it, or under a finger held on it, and its words are that name.
  - A tap presses the button and names nothing; a finger held on it names it instead.
  - The words follow the button's own: a name that changes while its tooltip stands is shown as it
    now reads, and a name a press changes, as the copy button saying it has copied, comes up over the
    button at once, by whatever pressed it. It goes as a tooltip brought up that way goes: a pointer
    leaving the button, the keyboard's focus leaving it, or the next touch anywhere.

## Floating things

- **Back clears what floats first.** With something floating over the screen — a dialog, a sheet, a
  drawer, a popover, a dropdown menu, a select's list, a context menu, a picture opened whole — the
  back gesture closes that first, one at a time from the top, and only with nothing to clear does the
  page move. The layers module keeps this with the page's own history: one entry pushed on opening
  and taken back on closing, so opening and closing leaves history as it was, and the address stays,
  since what is open is not a place.
  - A screen may register a state it entered as a layer too, so back leaves it the same way.
  - A choice that closes one floating thing and opens another in the same press pushes the new entry
    only once the old one's step back has landed.
  - A press that follows another close at once still closes what it was meant for: the thing just closed is
    still on the page while its leaving is drawn and takes the key for itself, so what stands under it is asked
    again once that one has gone.
  - Steps back are taken one at a time: where one press closes two floating things, the second step
    is asked for only once the first has landed. A step asked for while another is on its way is
    dropped by some browsers and read by the router as the reader's own press where it lands, and
    either leaves a floating thing standing with no entry of its own, so back would leave the page
    under it.
  - A floating thing that answers the press by asking first — a form's dialog holding changes — is
    not pressed again while the question stands: the question takes the next press of back as any
    floating thing does, and once it is answered, one that stays stands again with an entry of its
    own, so the next press of back asks again.
  - A form's dialog with no change, opened and left untouched, its change put back or just saved,
    closes at once by every way, back among them; what counts as a change is the Forms section's.
  - The focus handed back to the control a floating thing was opened from closes nothing.
  - Esc reaches what floats from every field in it, a date or a time field's segment among them:
    an untouched form's dialog closes, and one holding a change asks (the patch under `patches/`).
  - A tooltip naming a control of what the press closes is put away in the same press: it is asked
    first, and the floating thing is asked again before the press is over.
  - A choice that changes the page leaves its entry behind, and returning passes it.
  - Taking an entry back is the layer's own step, never a move of the reader's; a move begun while
    that step is landing waits for it.
- **Leaving a state the screen entered does not move the keyboard.** Nothing rebuilt on the way out
  takes the focus for itself; the focus goes back only where it was before the state was entered.
- **What opens over another stands over it.** The one opened last is drawn on top, takes the presses,
  and is the one back and a tap away close first. A floating thing set up ahead of every screen is set
  up afresh each time it opens, so it lands after everything already standing.
- **What floats keeps what it holds until it is off the screen** (`useHeldWhileClosing`). Closing is
  animated — half a second for a sheet, a fifth for a dialog — so what it draws is not emptied on the
  press that closed it.
- **A dialog grows out of the control that opened it,** fading in while it grows from where the
  pressed control stands, and shrinking back into it as it goes. The control is the press made just
  before it opened. A dialog nothing was pressed for only fades. The dialog-origin plugin reads this
  for every dialog the library draws, so no screen says it. Where less movement was asked for, a
  dialog only fades.
- **A dialog that fills the screen stands and goes at once.**
- **A dialog keeps one padding inside it.** Its head, its body and its foot each keep 16 pixels on
  every side, at every width, so the foot's last button stands as far from the dialog's right edge as
  from its bottom, and the body's words start on the title's line. The layer's app configuration sets
  this on every dialog the library draws, so no screen sets it.
- **What is not cleared** is a tooltip, and what grows inside the screen instead of floating over it.
- **No screen registers what the library floats.** The library marks each floating thing as a
  dismissable layer and says whether it stands open; the overlays plugin watches the page for those
  marks, so each becomes a layer the moment it opens and stops being one the moment it closes, on
  every screen. A screen registers only what the library does not draw.
- **A finger's tap away from what floats only closes it.** On a touch screen a tap outside the topmost
  floating thing closes that one and presses nothing under it. A mouse click away closes it and does
  what it points at.
- **The press that closes one is the press being handled.** An outside touch that has not become the
  press being handled closes nothing, so a button pressed inside a dialog does what it was pressed for
  rather than closing the dialog.
- **What floats over every layer is under none.** A region standing over whatever is open — the
  message pill over a dialog — carries the overlays module's `OVER_LAYERS` mark; a press, a tap or a
  focus there is outside no floating thing and closes nothing.
- **What floats while the page is being left takes no entry.** It is holding a navigation, and an
  entry pushed for it would move at the same moment the navigation moves the history, leaving the
  address and the page saying different things. It carries the overlays module's `OFF_HISTORY` mark
  and is no layer of the back gesture; Esc and a press outside still close it.
- **One context menu at a time.** A right click elsewhere closes it before opening the menu of the
  place pressed, and a tap elsewhere only closes it.
- **Small dialogs stand in the middle; sheets are parts of the page.** On a narrow screen a sheet
  rising from the bottom is for a part of the page taken out and for a large dialog that is a screen
  of its own (`FULL_SHEET`, `SPLIT_HANDLE`). A dialog that is no part of the page is a centred modal at
  every width, centred on what can be seen, so a keyboard never covers it.
- **A dropdown stays inside the screen** (see Tab bar and toolbar).
- **What floats beside the page leaves the page in use.** A floating thing the library draws that the
  page stays usable under — a sheet that is no dialog — carries the overlays module's `BESIDE_PAGE`
  mark. It is a layer of the back gesture and Esc as any other, but a tap away from it is no tap away:
  it closes nothing and the tap does what it points at.

## A window beside the page

`FloatingWindow` holds a part of a screen taken out of the screen's flow, floating over it while the
screen behind stays in use: read, scrolled, pressed and written in. It is no dialog. It draws no
shade, holds no focus captive, and a press, a tap or a focus outside it closes nothing. Its title, its
body and what its pill shows are the host's; how it moves, where it stands and how it folds are the
component's.

- **On a wide screen it is a window** at a place and a size of its own.
  - **It is drawn into the app's own root, after the app's screens,** so it stands over every screen
    and under everything the library floats — a dialog, a sheet, a menu, a popover, a tooltip, the
    message pill — whenever that opens, since those are drawn after the app. The app names its root
    only once its first drawing is done, so a window set up in that first drawing reads the root then.
  - **Its title bar moves it:** a pointer or a finger dragging the bar, and the arrow keys once the
    bar holds the keyboard's focus, a step of 16 pixels and 64 with Shift. The bar shows the shared
    ring where the keyboard put the focus there. A press on a control inside the bar is that control's
    and moves nothing.
  - **Its trailing foot corner sizes it,** dragged or moved by the arrow keys the same way, between a
    floor the host names — 320 by 240 pixels where it names none — and what is visible less the
    gutter. The corner names itself in the shared tooltip.
  - **It never stands outside what is visible.** It keeps a 16-pixel gutter inside the visible part of
    the window on every side: a drag stops at the edge, and a window narrowed, or a keyboard laid over
    the page's foot, moves it back into view and shrinks it where moving is not enough. The visible
    part is the browser's visual viewport, so a keyboard counts.
  - **Its place and size are kept per browser** under the name the host gives it and the width class
    the window stands in — narrower than 1,024 pixels, narrower than 1,536, or wider — so a wide desk
    and a narrowed window each keep their own. They are kept in the browser's storage, written as the
    reader lets go of a move or a size; a storage that refuses is read as nothing kept and written to
    in vain, and the window stands all the same.
  - **Where nothing is kept for its class it stands at its first place:** at the default size the host
    names — 400 by 520 pixels where it names none — inside the area the host names, the visible window
    where it names none, at that area's top trailing corner a gutter in from both edges, and never
    taller than three fifths of the area, so the foot of what the area shows stays clear.
- **On a narrow screen it is a sheet,** under the screen module's narrow query, risen from the bottom
  edge as the library's drawer with no shade and its handle at its head, carrying the `BESIDE_PAGE`
  mark.
  - It stands at one of two heights: short, 45% of the visible height, and tall, 90%. Dragging the
    handle moves between them, and the button at the header's end, named expand or collapse in the
    shared tooltip, sets the other; dragging below the short height folds the sheet. The height is kept as the
    window's place is, under the narrow class.
  - It covers what stands at the screen's foot while it stands; folding it gives that back.
- **Folded, it is a pill:** one small button showing what the host gives it and named by the host's
  words in the shared tooltip. On a wide screen it stands at the top trailing corner of the place the
  window stood, so the window unfolds out of it to where it was; on a narrow screen it stands at the
  screen's leading foot, above the room the host says its foot keeps — an input bar, say.
- **Folding is the window's own close.** The close button at its header's end, Esc pressed inside it
  and the back gesture fold it; it stands as a layer of the gesture while it stands unfolded. Whether it
  stands unfolded is the host's to hold, so a host may unfold it again when something new arrives in it.
- **How it moves.** It unfolds out of its pill and folds back into it, fading and growing from the
  pill's place and shrinking into it, at `pop`; standing up with no press behind it, it only fades.
  Dragged or sized, it follows the pointer and moves on no clock of its own. Where less movement was
  asked for, it fades where it stands. The sheet slides from its edge as every drawer does.

## Tables

- **The shared table** (`DataTable`) is the one table every screen draws rows in.
- **It scrolls sideways inside its own box** so no cell is cut; the page itself never scrolls
  sideways.
- **Column names are stuck.** Rows scroll within the box, so the column of the cell being read stays
  named above; a name stands over its own background, and pushed sideways it moves with its column.
- **Column widths move** (`ColumnResizeHandle`, the column-widths module). Dragging the right edge of
  a column's name, or pressing the arrow keys on that edge, widens or narrows that column. The first
  move holds every column at the width it stood at, so only the one moved changes. Another set of
  columns starts again at natural widths. Cell slots are told when widths are held.
  - A cell in a hand-held width is cut with an ellipsis, so the shared tooltip layer finds it and
    shows the whole value where it stands (`CutLineTip`).
  - The edge takes the shared focus ring, drawn inside its own edge because the table clips what
    stands past it; a pointer over it or a press on it widens and colours its line instead.
- **Rows may stand in labelled parts** (the table-sections module), each with a heading row; rows in
  no named part stand last.
- **A row that can be chosen** is pressed by pointer or by Enter.
- **It stands in one of three layouts:** `fill`, the whole section it is in, its header held to the
  section's top and its sideways scrollbar on the section's floor however few its rows; `own`, the
  default, its own height among other content; or `dense`, the close grid of a record browser.
- **A screen may mark a row** with classes of its own, such as the one chosen, and may key rows itself
  where one row stands in two parts.
- **Its placeholder** (`DataTableSkeleton`) takes the same column names and the same layout, so the
  head stands at once and only the cells wait. It stands in the table's own box and at the table's
  own head and row heights, so nothing moves when the rows land; at a narrow width the box scrolls
  sideways as the table's does, and no column name is cut.
  - A column whose name is not known yet waits with a bar in the head, in its own column.

## Skeletons and loading

- **`SkeletonBar`** is the one shimmering bar every placeholder is drawn from. It hides itself from
  assistive technology, stands still where less movement was asked for, and draws nothing before the
  browser has taken the page over. Its size is the caller's.
- **`SkeletonLine`** is one line of text not yet arrived, the whole line box with the bar inside it;
  **`SkeletonText`** is a passage of them with only the last line short.
- **`ContentSkeleton`** is the region: the busy status under a readable name (`common.status.loading`),
  a surface nothing can be pressed through, and repetitions of one piece the caller gives as its slot,
  never more than the region will hold.
- **`SkeletonStatus`** is the busy status alone, for a place kept inline.
- Only `SkeletonBar`, `ContentSkeleton` and `SkeletonStatus` draw a bar or a busy status. The painted plugin raises the flag the skeletons wait
  for once hydration ends (the loading module).
- **`LoadingImage` and `LoadingVideo`** keep a picture's or a video's place while it loads and say
  when it failed; **`ImageViewer`** opens a picture whole, zoomed by wheel, pinch, double press or its
  buttons; **`AudioPlayer`** plays a sound over its own waveform; **`VideoPlayer`** plays a video
  (see The video player).
- **`AudioPlayer`'s waveform is the sound's own loudness,** read in the browser once the player comes
  near the screen. The file is fetched once per address and read no further than the waveform's
  fetch limit, whether or not the server says the length before it sends the bytes; the browser
  decodes it, at a low rate first so a long sound stays small in memory and at an ordinary rate where
  the low one is refused. The sound is cut into the waveform's even stretches, each standing at its
  root-mean-square loudness against the loudest.
  - Each bar is the mean of the stretches under it. The bars run from the sound's quiet end, the
    loudness under which the quietest tenth of the bars stand, to its loudest bar, so a voice spoken
    at an even loudness still shows its words and its pauses; no bar falls under the floor.
  - A sound not read yet, or one the browser cannot fetch or decode, stands every bar at the floor.
    In development the reason it was not read is logged once for its address.
- **`AudioPlayer`'s button** shows the play mark at rest, a spinner from the press until the sound is
  first heard — the element saying it plays, or its clock running on past where the press found it —
  and the pause mark from then until it stops. A stall for bytes while it plays leaves the pause mark
  standing, since a spinning button takes no press and the one press that must always work there is
  the one that stops it. A press the browser refuses, the end, a failure and a stop from elsewhere
  stand it at play again.
- **`AudioPlayer`'s volume stands beside its download:** a button whose icon says how loud the players
  play opens a popover holding a mute toggle and a volume slider. The popover closes on a press away and
  on Escape, the focus going back to the button, and the keyboard reaches all of it: the toggle by Tab,
  the slider's steps by the arrows and its ends by Home and End. Both are named for a screen reader,
  the toggle by what it does next, and both are drawn in the layer's tokens.
  - Sliding to nothing mutes, and sliding up from it unmutes; the toggle mutes and unmutes, and
    unmuting a volume of nothing brings it back to half. A muted player's slider stands at nothing.
  - **The volume is the reader's, and one for the page.** Every player on a page plays at the same
    volume, and a change on one moves all of them. It is kept in the browser's storage under the layer's
    own name and stood on each player as it mounts; where storage cannot be read or written, the players
    start at full and the reader's choice holds for the page alone.
  - Where a browser holds the volume to the device's own, as a phone's may, the slider is not heard and
    the mute still holds.

## The audio player as an element

`AudioPlayer` also stands as a custom element, for a page that is no app of the layer's: a hosted page,
a page in a sandbox, a page a service writes. It is the same component, drawn and behaving as it does
on a screen.

- **One script carries it whole:** Vue, the component library's parts the player is built of, the
  player, its icons, its words' engine and its sheet. The page loads that script and nothing else;
  the script opens no connection of its own but the player's, so a page that may load only scripts
  over the web and fetch only its own address holds it.
- **It defines nothing until the page asks.** The script stands one global, `BmoAudioPlayer`, whose
  `define` takes the words the player says, keyed as a language pack keys them, the language they are
  in, and the element's name, `bmo-audio-player` where none is given. A name already defined is left
  as it stands.
- **What the element is told:** `src`, where the sound plays from; `download`, where it is taken to be
  saved, the same address where none is given; `name`, which names the player, the last part of the
  address where none is given; `size`, the stored size already said as the page says sizes; and
  `scheme`, `light` or `dark`, whatever the reader's system asks where none is given.
- **It stands in a shadow root of its own,** so the page's sheet and the player's never meet. What
  the layer's stylesheet states of the root it states of the element, and a face is left to the page,
  so the player takes the page's type. The custom properties the sheet registers are registered on
  the page as well, since a property is registered for the whole document or not at all.
- **The popover and the tooltips open inside the element,** on the ground marked with its scheme, so
  they take the same sheet and the same scheme as the player.
- **It answers `play` and `pause`** as an audio element does, so a page's own script moves it as it
  moved the audio element it stands for.
- **One sound plays at a time across the page:** a player that starts stops every other element of
  its name.

## The video player

`VideoPlayer` plays a video in one of two sizes, chosen once by its host: the full player, and the still
a message holds, which opens the full player large.

- **The full player fills the box its host gives it,** on a black ground of its own whatever the
  theme, so its words and marks are fixed light ones. Under the picture stand its controls: the
  position bar with the time played and the length, play and pause, ten seconds back and forward, the
  next video where the host names one, mute and the volume slider, the subtitles where the video has
  any, the speed, turning the picture and full screen. Each is an icon button named in the shared
  tooltip with the key that presses it, a finger's size on a touch screen. A menu or a tooltip opened
  in full screen stands inside the player, which is all the browser shows then.
- **A player short of room gathers its bar.** Narrower than the room every bar of actions needs
  before it stands them all (the action bar module), it leaves the volume slider off and gathers the
  subtitles, the speed and turning into one more menu before full screen, so no control runs off its
  edge. It reads its own width, never the window's.
- **The controls come and go.** Before the first play they stand under one large play mark over the
  picture. While it plays they stand for two and a half seconds after the pointer last moved, a press
  or a focus, and stay while a control holds the keyboard's focus. A mouse press on the picture plays
  or pauses, and a double press takes it to full screen. A finger's tap shows hidden controls and
  hides standing ones: the press is read on its way down through the player, before the gesture
  reader brings the controls itself, so the tap that brought them does not hide them.
- **A finger on the picture** takes the player's gestures. A double tap on its left or right half
  skips ten seconds back or forward; a held finger, by the layer's one long press, plays at twice the
  chosen speed, never under two nor over four times, until it lifts; a horizontal drag moves the
  position as the finger travels, the picture's width spanning the whole length; a vertical drag sets
  the picture's brightness on the left half and the volume on the right. A drag keeps the direction
  it first went. Each shows a cue over the picture that lingers a moment after the finger lifts, and
  a screen reader hears what it did once it has ended. A mouse drag moves nothing.
- **The keys:** space or k plays and pauses, the left and right arrows skip five seconds and j and l
  ten, the up and down arrows move the volume a tenth, f takes it to full screen, m mutes, c turns the
  subtitles off and back to the last one shown, and r turns the picture. They answer while the full
  player stands, except a key a field or a control keeps for itself. Each control a key presses names
  that key in its tooltip; the arrows, which no control stands for, are named on the volume and the
  position bars to a screen reader.
- **The next video can follow on its own** where the host names one and asks for it. A video of ten
  minutes or more then offers it on a card in the picture's top trailing corner, clear of the controls
  and the subtitles, from thirty seconds before its end (thirty-five for a video of forty minutes or
  more, forty for fifty or more): the next video's words, the seconds left turning down, and two
  buttons, cancel and play now. Play now and the end of the video each tell the host the next was asked
  for; cancel takes the card away and lets the video end where it is, and moving back before the card's
  moment brings it back. A video shorter than ten minutes asks for the next as it ends, with no card.
  Where the host does not ask, the video ends and only says so.
- **Nothing answers through a layer over it.** No key and no gesture reaches the player while a
  dialog, a drawer or a menu stands open over it. The layer the player itself stands in, as the
  dialog that shows it large, is not over it.
- **Turning the picture** goes to full screen and locks the screen to the other orientation where the
  browser can; where it cannot, as on a desktop or an iPhone, it turns the picture inside the player a
  quarter at a time, fitted to the player's box. Leaving full screen or the player gives the
  orientation back and stands the picture straight, and on a phone a second press does the same.
- **Subtitles are text tracks the host names,** each by a number of its own; the one shown is a model
  the host binds, and none shows unless the host says so. They stand above the controls while the
  controls stand, and at the picture's foot once they go.
- **What it tells its host:** where the video stands every five seconds while it plays, as it pauses
  and as the player goes, and again as the page itself goes away, each named by what the video is to
  the host, since the screen may have moved on to another by then; that it ended; and that the next
  was asked for. What a host keeps of a position, where a video starts and which subtitle shows first
  are the host's.
- **One thing plays at a time.** The full player is one of the page's players: a video that starts
  stops every sound and video playing, and a sound that starts stops it. Its volume is the reader's
  one volume for the page, the audio player's.
- **The still** shows the video's first frame, read from a moment past the start so a phone draws it
  too, with a play mark over its middle in a button's corners, and the length at its top leading
  corner: 4px in from the corner, small corners, a dark translucent ground and light tabular figures.
  Only the file's length and size are fetched before it is pressed, and until the file first answers
  the picture's place stands as the layer's skeleton under the play mark. A file that refuses shows
  why in place of the play mark.
  - It has no corners or edge of its own. The box it stands in cuts it at that box's own corners, so
    in a message bubble the bubble's corners and edge are the only ones drawn.
  - Its picture stands at the video's own ratio, no taller than 20rem and no wider than the box it
    stands in, scaled to whichever bounds it first; a box fitted to what it holds, as a bubble is,
    takes that width. Where the host knows the shape the picture stands in it from the first frame,
    so nothing under it moves when the file answers; where it does not, it takes the shape the file
    says.
  - The still fills its box's width. Where the box is wider than the picture, as when a caption under
    a tall video is wider, the picture stands in the middle on the still's black ground, which runs
    to the box's edges.
- **A press on the still opens the full player large:** over the whole screen in a dialog headed by
  the video's name, with its close, playing from the start. The close, Escape and the back gesture
  close it. The keys and gestures answer there as anywhere, and its full screen button takes it to the
  browser's full screen. The still hands on everything the full player tells.
- **A host standing the still in a message** runs it to the bubble's edges as a picture runs, outside
  the bubble's inner room, and stands what the message says with it — a caption, the file's line —
  under it, inside that room.

## Artwork

- **A card's picture stands at one of a few shapes** (the artwork module): portrait, two wide by three
  high; landscape, sixteen by nine; and square. A picture's own shape is read from its width and
  height: landscape from four by three wide and wider, square from just over four by five, portrait
  under that. A row or a grid of cards takes one shape for every card, the one most of its pictures
  have, the first of landscape, portrait and square where two are as many, and the host's own where it
  knows none.
- **A picture is never cut or stretched** (`ArtworkFrame`). The frame stands at its shape and the
  picture stands whole inside it, as large as fits. Where the picture's shape is not the frame's, the
  room left round it is filled with the picture itself, blurred and drawn a little dim, under it; a
  picture of the frame's own shape fills it edge to edge. Where its size is known the frame decides
  this before the picture loads, and otherwise as it loads.
- **A card with no picture** stands as its kind's mark over its name, set as words in the frame on the
  raised ground, a few lines at most, so two such cards still read as two.
- **While its picture loads** the frame stands as the shared skeleton at its own shape; a picture that
  fails says so where it stood.
- **The frame draws no corners of its own:** it is cut to the corners the host gives it, by the box it
  stands in or a class handed to it. Anything a host lays on the picture — a bar of how far it was
  watched, a mark — stands inside it, cut the same way.

## Rows of cards

- **A row of cards** (`CardRow`) is a heading over one line of cards that scrolls sideways, the
  component library's carousel at its heart. Its heading names it and is its region's name; beside the
  heading stands, where the host gives it a place, a link that opens the whole row (*all*).
- **A pointer pages it.** Two icon buttons at the heading's trailing end page back and forward by
  what the row shows at once, each standing only while there is somewhere to go and named in the
  shared tooltip. A touch screen has neither: a finger swipes the row, and it glides as it is thrown.
  A drag of the mouse moves it too, and a press that ends a drag opens nothing.
- **The keyboard walks its cards** in their order, and a card the focus lands on is brought into
  view. A reader who asked for less movement sees each page stand at once.
- **The host gives the cards** and the width each stands at; the row keeps the library's own room
  between them. The cards of one row stand at one shape (「Artwork」), so they line up as one strip.

## Code and files

- **Code is coloured and viewed through the monaco module:** the language a name or a fence names,
  coloured runs for a block, a read-only code view and a source view. A fenced block in the host's
  rendered text stands in its own box that scrolls sideways, its copy button, at the size of the
  library's small square icon button, over its top right corner, and its language at its top left,
  centred on the button's line, where its fence names one (the code-copy and code-colour
  modules). A diagram fence is drawn as a figure (the diagram module), the source standing until it
  is drawn and where it cannot be. The figure stands whole in the column, never wider than it, and is
  zoomed and moved as a picture opened whole is: the wheel over it zooms around the pointer, two
  fingers pinch it, a drag moves it once zoomed, a double click zooms in at a point or back to
  fitting, and the zoom buttons beside it zoom out, zoom in and fit. A wheel with nothing left to zoom
  scrolls the page on.
- **The editor's two code themes are its own with their background taken out** (the code-themes
  module), so a code view stands on the surface the host gives it, and every colour a token takes
  reads at 4.5:1 or better on a fenced block's ground, the muted surface, under every theme in both
  modes.
- **The file components** are a file's text in the read-only viewer (`FilesText`), a name renamed in
  place (`FilesNameField`), an upload's progress (`FilesProgress`), and the one question asked when a
  change would land on names already taken (`FilesConflictDialog`): replace, keep both, skip, or give
  the change up. A file's icon comes from the file-icons module, drawn from the Material Icon Theme
  set the layer brings as a dependency.
- **Text is put on the clipboard through the clipboard module,** which falls back to the browser's
  older copy where the clipboard API is refused, and answers whether the copy went through.
