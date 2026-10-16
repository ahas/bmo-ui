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
  finger. The same holds for the library's own tab rows (`TAB_ROW_UI`). The actions at the row's
  right end stand 4 pixels apart and 4 pixels from the row's edge.
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
  icon buttons, each named on hover, a toggle standing pressed while on; four or more fold into one
  menu, where a toggle carries its check. A screen never shows two such menus at once.
- **Every icon button has a tooltip,** with the same words as its accessible name. `ShellClose` is
  the close of a modal or a side sheet, named that way.
- **Properties are the last of the group.** What a file or a document is opens from the properties
  action: a popover on the button on a wide screen, a sheet from the bottom on a narrow one, which
  the back gesture closes.
- **View switching.** A view that is on or off is a toggle. A choice of ways of reading one thing is
  a switch whose choices share its width equally (`TabSwitch`); on a phone it shows its icons alone.
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
- **A toolbar's icon button is a square of the toolbar's height** — 36 pixels, 40 under a finger. The
  toolbar decides it off what a button holds: one whose whole content is one mark is an icon button.
- **A cell is as wide as what it holds.** A cell of words keeps the toolbar's own room on either side;
  a cell of buttons keeps none. A button's word never breaks into two lines; the square is a floor,
  not a fixed width.
- **A bar gathers by the room it has, not by the window's width.** The room is read off the bar
  itself. Short of it, the bar keeps what a hand reaches for first, in the order written, and folds
  the rest into one more-menu at the end. How much room is enough is one reading for every bar, the
  actionbar module's. The choose-all control and the way out of a choosing state never gather.
- **A choosing control stands on the same vertical line as the marks it speaks for.** Its box is held
  to the leading edge of its cell, so it lands where a row puts its own mark, and the bar keeps at its
  trailing edge the room the scrolling body's scrollbar takes.
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

## Messages

- **Everything said to the reader stands in one place:** a notice of something that arrived, the word
  that an action went through or did not, and the question a press that cannot be taken back asks
  first all stand on one pill at the top of the screen, centred (`MessageIsland`, driven by the island
  module). The library's own toaster is not stood up and the browser's own dialogs are not used.
- **It is a pill of one radius at every size.** With a line to say it is a narrow line; with a
  description or something to press, it widens into a card of the same rounding. It is measured and
  given that size, so it moves between shapes instead of jumping.
- **It unfolds from its own centre,** from no width to its full width, and folds back the same way.
  Only what it says fades. Its words are laid out at full width from the first frame and hidden past
  its edge until it is open. Where less movement was asked for, it stands and goes at once.
- **The whole of it is the press.** Where a notice leads somewhere, pressing it goes there; where it
  leads nowhere, the press puts it away. A further press it offers is a button of its own inside it.
- **One stands and the rest wait.** The one standing carries how many are behind it, and the next
  takes its place the moment it goes, so the pill morphs from one to the next. The same thing said
  twice replaces itself where it stands. The line holds five, and drops its oldest end.
- **A question holds the pill until it is answered.** It has no time of its own and takes the pill at
  once from the notice standing, which goes to the head of the line. The back gesture takes it back;
  a notice is not registered with back, since it goes on its own. A question asked while the page is
  being left takes no history entry of its own. The discard question is the key
  `common.message.discard_confirm`.
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
  press outside, the back gesture — and leaving the page ask on the message pill whether to throw them
  away: discard drops them and goes, cancel stays. With nothing changed it goes at once.
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
- **A finger has no hover.** Where a tap does nothing else, a tap brings it up; where a tap acts, a
  finger rests on it instead, by the one held finger, and lifting presses nothing. The next touch
  anywhere puts it away.
- **Its words wrap** inside a box no wider than a phone has room for.
- **A cut name names itself only where it is actually cut,** measured as the tooltip is about to come
  up.
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
  - The focus handed back to the control a floating thing was opened from closes nothing.
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
- **What floats over every layer is under none.** A host's own region standing over whatever is open
  — a question asked from inside a dialog — carries the overlays module's `OVER_LAYERS` mark; a press,
  a tap or a focus there is outside no floating thing and closes nothing.
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
- **Rows may stand in labelled parts** (the table-sections module), each with a heading row; rows in
  no named part stand last.
- **A row that can be chosen** is pressed by pointer or by Enter.
- **It stands in one of three layouts:** `fill`, the whole section it is in, its header held to the
  section's top and its sideways scrollbar on the section's floor however few its rows; `own`, the
  default, its own height among other content; or `dense`, the close grid of a record browser.
- **A screen may mark a row** with classes of its own, such as the one chosen, and may key rows itself
  where one row stands in two parts.
- **Its placeholder** (`DataTableSkeleton`) takes the same column names, so the head stands at once and
  only the cells wait.

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

## Code and files

- **Code is coloured and viewed through the monaco module:** the language a name or a fence names,
  coloured runs for a block, a read-only code view and a source view. A fenced block in the host's
  rendered text stands in its own box that scrolls sideways, its copy button over its top right
  corner, and its language at its top left where its fence names one (the code-copy and code-colour
  modules). A diagram fence is drawn as a figure (the diagram module), the source standing until it
  is drawn and where it cannot be.
- **The editor's two code themes are its own with their background taken out** (the code-themes
  module), so a code view stands on the surface the host gives it, and every colour a token takes
  reads at 4.5:1 or better on a fenced block's ground, the muted surface, under every theme in both
  modes.
- **The file components** are a file's text in the read-only viewer (`FilesText`), a name renamed in
  place (`FilesNameField`), an upload's progress (`FilesProgress`), and the one question asked when a
  change would land on names already taken (`FilesConflictDialog`): replace, keep both, skip, or give
  the change up. A file's icon comes from the file-icons module.
