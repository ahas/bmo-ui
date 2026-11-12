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
  an optional description, its body and a footer, wide enough for a table's row where it asks. Told
  that its form holds changes, it asks before it closes, by every way of closing (see Forms); told
  nothing, it is no form and closes at once.
- **The theme and palette pictures** — `ThemePreview`, `ThemeSwatch` and `PaletteSwatch` — draw an
  entry in one mode on their own box, as a row's choices.

## Share links

- **One dialog makes, shows and ends a share link** (`ShareLinkDialog`), whatever is shared. It is a
  small form, so it is the settings dialog in the middle of the screen at every width, titled by
  what it is, the name of what is shared under the title where the screen behind does not say it.
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
  link's end as it now stands, or that nothing is shared, so the screen need not ask the server again.
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
- **Save is on only while something differs** from what is saved.
- **Save saves at once.** What a field's change sets off is said beside the field before the press.
- **A save that went through is what is saved from then on.** The form takes the answer as its new
  saved values, so it holds no change the moment the save is done.
- **Leaving with changes asks first.** Closing a dialog whose form holds changes — its close, Esc, a
  press outside, the back gesture — and leaving the page ask first, in the question dialog, whether to
  throw the unsaved changes away: discard drops them and goes, and every way out of the question
  stays. With nothing changed it goes at once.
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
  icon button, and a choice of the view switch shown as its icon alone through the shared tooltip
  marked as standing on a press. The library's own tooltip comes up for a pointer and a focus alone,
  so nothing the layer draws, and nothing a host draws, names a control with it.
- **A tooltip switched off comes up for nothing:** no hover, no focus, no tap and no resting finger opens it, so
  what it stands on is pressed as if no tooltip stood there.
- **Its words wrap** inside a box no wider than a phone has room for.
- **A cut name names itself only where it is actually cut,** measured as the tooltip is about to come
  up.
- **It stands on what it names through a box of its own,** and marks that box each time it is drawn
  where the box holds one element and no words, so a row that lays out the controls it holds, as the
  toolbar does, reads the box as the control inside it.
- **Every line cut with an ellipsis shows whole, with nothing written for it** (`CutLineTip`, driven
  by the cut-lines module). One layer over the whole page finds the line itself: under the pointer,
  the line whose box ends its words in an ellipsis or clamps them to a count of lines and actually
  cuts them; under a keyboard focus, that line or the first such line inside what took the focus;
  under a finger, the line it holds. It brings up the shared tooltip over that line with its whole
  words.
  - A pointer waits the tooltip's usual moment, and moving on to another cut line while one stands
    brings that one up at once. Leaving the line, pressing anywhere or scrolling puts it away.
  - A finger holds the line; a row that answers a hold of its own still does, with the tooltip beside
    it. The held line selects no words.
  - A line already inside a tooltip of its own is left to it, and a line that slides has none.

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
  - The focus handed back to the control a floating thing was opened from closes nothing.
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
  buttons; **`AudioPlayer`** plays a sound over its own waveform.
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
