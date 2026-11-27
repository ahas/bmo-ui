# Design foundations

What every screen built on the layer stands on: the page's measures, its motion, its letters, its
colours, its focus and its corners. The tokens named here are the layer's contract and are listed
whole in `docs/boundary.md`; this document says what each is for and how the layer holds it.

## Layout fundamentals

### Width

- **The body stands in one width of 768 pixels.** On any screen the content does not exceed that
  width and stands centred in the space left over.
  - That number is in one place, the `--ui-container` token, and the layer's override of the
    component library lays it on the dashboard panel every screen stands on, so a screen added
    later stands at the same width with nothing said.
  - On a narrow screen the width does not bind, and only the panel's 16-pixel gutter is left on
    either side.
  - **768 is the width of the content itself.** A gutter is added outside it, never taken out of
    it: a container that carries side room of its own grows by that room, so its text still
    stands 768 wide. A box drawn around an item — hovered, chosen or brought into view — keeps 12
    pixels of room of its own on each side, outside the item's content, so the content keeps its
    full width and never touches the box's edge.
  - A screen that reads across rather than down — a wide table, parts side by side under a
    splitter, tiles of live figures — releases the width in its own panel. Which screens do is the
    host's; one that does keeps the panel's own room around its content unless it has a reason of
    its own to stand flush.
- **The width binds not the panel body but what the body holds.** The box that scrolls is the panel
  body, so narrowing that box to 768 would put the scrollbar beside the text rather than at the
  window's edge. The box fills its place and what stands inside it stops at 768. Whichever box
  carries a screen's scroll, it fills the place it sits in, so the scrollbar always stands at the
  right edge of that place.
- **A writing box stands at the width of the box holding it.** A multi-line writing box left to
  itself is an inline thing about twenty characters wide, and would read at a different width in a
  row of boxes than in a plain block. The layer's override of the library's text area gives it the
  full width once, where the panel's width is given.

### Room at the foot

- **A content screen always leaves room at its foot.** If the last line ends where the scroll ends,
  a fully read screen cannot be told by eye from one not yet loaded. That room is the panel body's
  gutter, the same on all four sides — 16 on a phone, 24 wider — and no screen writes a bottom
  gutter of its own.
- **Only a screen that stands something at its foot or fills to its edge removes it:** one with an
  input box under its scroll, one with paging flush at its foot, one split into splitter sections
  that must fill to their ends, one whose table or terminal fills the panel.
- **A box put in the body is not shrunk.** A box told to shrink spills its content past its border,
  and the spilled content does not take the containing box's gutter with it. Only where what the
  box holds scrolls within itself — a table box, a terminal — is the wrapping box shrunk to fit the
  panel, and then the panel itself does not scroll.

### Popovers

- **A popover stands only as far as the room left to it, and scrolls within if it overflows.** The
  room left is measured by the library as it places the popover — the height and width between the
  control that opened it and the window's edge — and the ceiling comes from there, so no screen
  measures the window and no number goes false when the control moves. Past the ceiling the popover
  scrolls vertically within itself, by wheel or by finger, and reaching its end does not turn to the
  page behind. The layer's override of the library's popover sets this once; a popover with room
  is unchanged.

### The vertical

- **The vertical stands by what is visible, not by the window's height.** A shell nailed to the
  window clips what overflows it, so what is longer than the window is not pushed down but gone,
  and what is cut off is always the foot of the column.
  - **No piece has a floor.** Neither the panel nor the sidebar beside it sets a minimum height, so
    a band laid over the screen takes its share off the column rather than pushing the column
    longer than the room left.
  - **What is visible is not the window's height.** A phone's virtual keyboard overlays the page
    rather than cutting it, so the window keeps its height with its bottom behind the keys. The
    layer holds the visible height and where it starts in two tokens, `--bmo-screen` and
    `--bmo-screen-top`, kept by the screen module's visible-screen reading. While nothing
    overlays, the whole window is the answer, kept at `100dvh` so it follows the address bar
    rising and falling; when something overlays, the smaller height the browser reports as the
    visual viewport enters there, and its top too, since the browser pushes the page up to show a
    focused box. A screen zoomed with two fingers is not overlaid and is left alone. The layer's
    viewport meta also asks the browser to take the keyboard's place off the page, and where a
    browser listens the two tokens and the page agree.
  - **The document itself never scrolls.** Every scroll is a part's own. A screen that stands on no
    shell stands on `ScreenFrame` instead, pinned the way a shell is, by the same two tokens. Being
    pinned is what makes it the anchor of everything laid out absolutely inside it — a word kept
    for a screen reader alone, a hidden native control, a badge — so none of it finds its place
    against the page itself and grows the page a scroll of its own.
- **A video let go of full screen finds its screen where it was left.** Taking a player to full
  screen takes the layout with it: the video leaves the flow, the window grows or a phone turns,
  and every part scrolling around the player clamps or is anchored elsewhere. So the layer, on no
  screen's behalf, writes down where each part scrolling around a video stood at the press or key
  that reached it, before full screen can move anything, and puts that back when full screen is let
  go, frame after frame for a second while the window settles, stopping the moment the reader
  scrolls, presses or types. A part puts back its offset unless it says for itself what its place
  is. Full screen is read from the standard change, its WebKit prefix, and the begin and end an
  iPhone's own player announces on the video, since an iPhone plays full screen outside the page.
  The fullscreen plugin holds this for as long as the page is open.
- **The bars at the top of the window stand at one height.** The library's header height,
  `--ui-header-height`, is 3rem, so a top bar and the heads of the panels beside it make one line
  across the window.

### The bars a phone lays over the page

- **What floats over the screen keeps clear of the bars a phone lays over it.** The layer asks to be
  drawn under a phone's own bars (`viewport-fit=cover`), so a phone that draws its page edge to edge
  lays its gesture bar over the foot of the window and reports its height as the bottom safe area.
  The two insets are the tokens `--bmo-safe-top` and `--bmo-safe-bottom`, nought wherever the device
  reports none.
  - Every sheet and panel that reaches the bottom edge — a drawer from any side but the top, a
    slideover, a narrow screen's sidebar — adds the bottom inset inside its own box, under whatever
    padding its content keeps. Its colour runs to the screen's edge; only what it holds stands above
    the bar.
  - A dialog in the middle is centred between the two insets and its ceiling leaves them out.
  - Both are set once in the layer's overrides of the library, never per sheet, so a sheet written
    later stands clear without being told.

### Lists

- **A list dropped from a control stands its rows on the 4px grid.** In every select, select menu,
  input menu, dropdown menu and context menu, at every size, each padding and gap of a row, of a
  group's label and of the words of an empty list is a multiple of 4px, and so are the gaps between
  the marks in a row's trailing column and between the keys of a shortcut. Where the library's own
  stand off the grid, the layer's overrides take a row and a label to 8px all round with 8px between
  their parts, the empty list's words to 8px, the trailing marks to 8px apart and the keys to 4px.
  A row's trailing check therefore stands as far in from the row's edge as from its top.
- **A list is found as it was left.** Opening a row and coming back is one move, not an arrival: the
  scroll, the choice and the pages already read are where they were. Not taking the list down — the
  detail standing over it, or the page kept by the router — is the screen's own to arrange. What
  that does not give back is the scroll: a kept page's element is detached while it is away, and a
  detached element's offset reads as nothing. The list-place module keeps each list's offset under
  the name the list goes under, for as long as the page is open, and puts it back on the return once
  rows enough stand to reach it, giving up after a few frames where the list never grows that tall.
- **A list read a page at a time reads its next page as its end comes into view,** with nothing to press for
  it. This is the console's one way to page a list; no list ends in a button that loads more.
  - The foot of the list asks for the next page once it stands in view, measured against the rows that
    have landed, a little ahead of the very end so the page is already coming as the last rows are read.
    A page that lands and leaves the foot still in view is followed by the next at once, and the pages
    read so are one wait. Nothing more is asked while another read of the same list goes.
  - While a page is on its way, placeholders of its incoming rows stand at the list's end under a busy
    status the screen names.
  - A page that fails leaves every row already read where it stands. In its place stand the reason
    and the one control that asks it again (`common.action.retry`), and no further page is asked
    until that control is pressed.
  - Once the source holds no more, nothing stands below the last row.
  - A reader on the keyboard reaches the later pages the way a reader scrolling does: stepping through
    the rows brings each into view, and the foot with them. The placeholder's busy status, the
    failure as an alert and the retry as a button are heard by a screen reader.
  - A list that stands above other content on the same page scrolls inside a bounded box of its own,
    so its end can come into view and the content under it stays reachable.
  - The next-pages module holds the paging, its failure and its retry, and `NextPageFoot` draws the
    foot; inside a table the foot is one row across its columns. The screen supplies whether more is
    held, how one more page is read, its words for a failed page and its placeholder's piece.
- **A list that chooses many always offers the whole of them.** Wherever a list has a choosing state
  it carries one control that takes every row shown or gives the whole choice up, at every width and
  from the moment the state is entered — never folded into a menu.
  - It is `ChooseAll`, a checkbox at the three states the choice can be in: none of the rows shown,
    some of them as the checkbox's own indeterminate state, all of them. A press takes the choice to
    whichever end it is not at, and the words it shows beside the box — the keys
    `common.action.choose_all` and `common.action.choose_none` — name that end, so its words and its
    accessible name say what pressing would do.
  - A row of such a list marks itself chosen with a checkbox's own square, so one list is not read as
    two ways of choosing. The square is centred in a cell as wide as a row of one line is tall, at
    least 40 pixels under a finger, which the hover and press colours fill with the same room on
    every side of the box; the cell hangs out before the row by that room, so the box stands on the
    row's leading line, on one vertical line with the box of the choosing control over the list
    (`CHOOSE_CELL`).
  - The box is smaller than a finger, so the box and its words stand as one pressable control of the
    library's checkbox: a press on the box, on the words or on the room round them is one press, and
    the hover and press colours fill that control's own rounded shape, as a small button's do, never
    the toolbar's cell or row. The keyboard's ring goes round that whole shape, inside its edge, and
    the box draws none of its own.
  - What the states mean and what a press means are decided once, in the chooseall module. The list
    supplies the rows it is showing and what was chosen, and receives which of the two ends the press
    asked for.

### Writing boxes

- **Whether Enter sends or breaks a line is set by what the hand writes with.** Where the main input
  is a mouse or a trackpad, Enter sends and Shift+Enter or Alt+Enter breaks. Where it is a finger
  (`pointer: coarse`), Enter breaks and sending is only by the send button, because an on-screen
  keyboard has Enter as its only line-break key. It is not split by width: a narrowed desktop window
  has Shift, and a tablet laid on its side has only Enter. Where Enter sends, an Enter pressed while
  an input method is still composing sends too: the composition finishes, the text goes with its
  last syllable, and no line break is left behind; the repeated Enter some browsers send right after
  the commit is the same press and sends nothing more. The prompt module reads this for every box a
  message is written in.
- **A prompt box grows with its text, to a limit.** It grows to eight lines but never past three
  tenths of the visible height, and scrolls within itself beyond that, so it never pushes the
  column it stands in.
- **A line written in a box keeps its breaks while the writing goes on.** Each line is filled as far
  as it holds before the next begins, and a line already filled is never laid out again for what is
  typed after it, so nothing above the caret moves while a person types. A word in Hangul therefore
  breaks between syllables at the box's edge, a syllable still being composed stays where it was
  begun, a word in Latin letters still moves whole as it outgrows its line, and a run with no break
  wider than the box breaks anywhere. The prompt module names the one set of wrapping rules every
  writing box carries.

### Scrollbars

- **Every scrollbar is the thin one,** in the colour the borders are, on no track, through the
  standard properties where the browser has them and the WebKit parts where it does not.

## Motion

- **A fade is for a thing that comes and goes on its own over the screen** — the message pill's
  words, a popover, a menu, a dialog and its shade, a tooltip — and for the first page read into an
  empty moving list, and for nothing else. Any other item of a list never fades, and neither does the
  content of a page, a panel or a tab as it is replaced.
- **One screen moves along one axis at a time.** A fade never runs on the same screen as a slide, a
  scroll or items changing places, and nothing slides sideways while something beside it moves up or
  down. The parts of one change of mode are one movement, whatever way each goes: they start in the
  same frame, take one length and one easing, and end in the same frame.
- **How a thing comes and goes says where it came from.**
  - A thing that comes out of a place grows out of that place with a fade and shrinks back into it:
    a dialog out of the control pressed to open it, a menu, a list or a tooltip out of what it stands
    beside.
  - A thing that comes from no place in particular never grows. The message pill unfolds sideways
    from its own centre and only its words fade. A dialog nothing was pressed for only fades.
  - A sheet or a drawer slides in from its edge.
  - Content is never laid out again while its box opens: it stands at its final width from the first
    frame and the box hides what lies past its edge.
- **One set of lengths and easings,** seven tokens on the root, and every movement the layer draws or
  retimes names one of them rather than a number of its own.

  | Token | Value | For |
  | --- | --- | --- |
  | `--bmo-motion-quick` | 150ms | A thing changing state where it stands — a colour, a mark turning, a tab's marker, a figure's characters turning — and a menu, a list or a tooltip out of its control. Felt, never waited on. |
  | `--bmo-motion-pop` | 200ms | A dialog out of its control and its shade; a sheet sliding in. The shortest that still shows where it came from. |
  | `--bmo-motion-stagger` | 40ms | The step between one item of a list's first page fading in and the next. |
  | `--bmo-motion-unfold` | 320ms | A box changing size — the pill moving to its next shape, a region folding open, a list item unfolding or folding — list items sliding to new places, and a tab's panel sliding sideways. |
  | `--bmo-ease-enter` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Arriving: fast, then settling, so it can be read before it stops. |
  | `--bmo-ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Leaving: slow where the eye already is, then gone. |
  | `--bmo-ease-move` | `cubic-bezier(0.4, 0, 0.2, 1)` | A thing that stays on screen while it changes. |

  - Tailwind's default transition length and easing are `quick` and `move`, so every transition
    class without a length of its own follows them.
  - The component library's own movements are kept — each already grows from its control or slides
    from its edge — and only retimed onto these, in the layer's overrides. The drawers keep the
    drawer library's own slide, since the same curve settles a drawer a finger has thrown.
- **A list whose items come, go and change places while it is read is a moving list**
  (`MovingList`), and shows that by position alone.
  - It moves along its own axis, which its layout says: a flex row, forward or reversed, lays its
    items out sideways and moves them sideways; every other list is a column and moves them up and
    down.
  - The items that stay slide to their new places within the list, judged by where each stands in
    the list's own box: a list the page moves as a whole, a head or a skeleton above it changing size
    in the same change, slides none of its items. An item that comes unfolds from nothing where it
    lands, one that goes folds to nothing where it stood: its size along the axis, its padding and
    its border on that axis's two sides. The items around it close up as it does, so nothing jumps
    at the end: an item with one before it gives back the list's gap before it and sets its own
    margins on the axis aside, and an item standing first gives back the gap after it and the
    leading margin of the item after it. A gap and an overlap drawn as a negative margin close up
    the same way. What an item shows is laid out at its full size throughout and only clipped.
  - How a list fills is the list's own choice, and a list read a page at a time is the default. Such a
    list filled or lengthened stands at once: items that come with nothing but other new items after
    them — the first page read into a list that held none, the next page an endless scroll or a
    load-more button puts at its end — stand where they land with no movement, filling the place the
    skeleton held, so the layout never moves as a list is read. The first page read into a list that
    held none fades in where it stands, its top item first and each next one `stagger` after the one
    before, the steps stopping at the eighth so the rest fade in together; each fades at `unfold`,
    eased by `enter`. A page put at the end of items already standing stands at once. A reader who
    asked for less movement sees the first page stand at once too. Only an item that comes before or
    between items already standing unfolds: one a filter, a search, an arrival or a reorder puts
    among them.
  - A list whose every item is an arrival of its own, never a page read in, unfolds every item that
    comes, one put at its end included. A row of faces is one: a face joining it, and the cap the
    first face past the most brings, unfold where they land.
  - Every item moves at once, at `unfold`, eased by `move`: no item waits for the one before it.
  - Items are keyed by their own lasting id, never by position.
  - A list a search narrows is one too. The one select's choices (`ChoiceSelect`) slide, fold and
    unfold as the words typed change them, and a group the words leave no choice in folds as one,
    its heading with it. The component library draws that list itself, so the layer's patch of its
    select menu has the menu draw its groups and choices through Vue's `TransitionGroup` with the
    moving-list module's `MOVING_LIST`, the same engine `MovingList` is. The side tree's rows
    (`ChoiceTree`) are the component library's tree laid out flat, each row keyed by its node, and
    the tree is handed a `TransitionGroup` as the list its rows stand in: `MOVING_LIST` while the
    words typed narrow it, and `STANDING_LIST` for every other change, so a new choice or new nodes
    stand at once.
- **A box that changes size around what it holds unfolds to its new size** (`UnfoldingBox`). Its
  ground alone changes box: what it holds is laid out at its final size from the first frame and
  only moves, the box hiding what lies past its edge while it is smaller. A change that comes at
  once — words replaced, a figure gaining a place — moves the box at `unfold`, eased by `move`.
  While a part of what it holds is unfolding or folding of its own, as a moving list's item does,
  the box follows that size frame by frame and adds no movement of its own, since a second
  movement chasing the first would end after it and leave the content outside its ground. Nothing
  in it scales.
- **A tabbed panel moves as one panel sideways** (`TabSlide`). The panel under the tabs is keyed by
  its tab; the new tab's panel comes in from the side its tab stands on in the tab order while the
  old one leaves to the other side, both together, at `unfold` eased by `move`. The rows inside move
  with their panel and have no movement of their own, and the new panel opens at its own top. A tab
  bar whose tabs are pages of their own changes page and moves nothing.
- **A mark turns only while the work it stands for runs.** The work-in-progress mark spins where the
  screen drawing it says so, for as long as the request, the save or the run it marks is under way;
  drawn for a state at rest, or kept in the page hidden, it stands still. The component library's
  own loading icons spin themselves while they load. The layer's stylesheet stands the mark still
  wherever less movement was asked for.
- **A number that changes while it is read turns only its changed characters** (`RollingNumber`).
  - Each character stands in a window of its own, one character wide and one line high, the places
    counted from the right so the ones stay over the ones. Where the number grew, the new character
    comes up from below and the old one leaves upward; where it shrank, the new one comes down from
    above and the old one leaves downward. A place a growing number adds comes in the same way; one
    it drops goes at once.
  - Every other character and the words round the number stand still, and its figures are tabular,
    so its width does not flutter.
  - It moves at `quick`, the arriving character eased by `enter` and the leaving one by `exit`; a
    number as it is first drawn stands still.
  - A count inside a sentence is drawn by `RollingSentence`: the sentence is the language pack's
    own, with each figure standing in its placeholder.
- **A list replaced by a different one stands at once.** Keyed by what it was read for, the new list
  replaces the old with none of its rows moving.
- **Which tool moves what.** A list is Vue's own `TransitionGroup`, through `MovingList`. A tab's
  panel is Vue's own `Transition` of one keyed element, through `TabSlide`. A box's size is a CSS
  transition on the size it is held to, through `UnfoldingBox`. One list is moved by one engine,
  never two. A page change on its own does not move.
- **A reader who asked for less movement sees nothing move, grow or unfold.** Every transition's
  length is nought, the pill stands and goes at once, and a dialog, a menu or a folding region only
  fades where it stands.

## Fonts

- **Nothing is drawn under 14 pixels.** Caption, metadata, badge, table and secondary text are 14;
  normal body 16; a subtitle or a section heading 18; a title 20. The stylesheet draws the step below
  14 at 14 as well (`--text-xs` is 0.875rem), so a library component that asks for it — a badge, a
  small button, a menu item — stands at 14 too.
- **Icons come from Material Symbols,** and the library's own components are told to draw theirs
  from the same set.
  - **An icon first drawn after the page has loaded never redraws the page's letters.** The icon
    library puts the style of each icon it draws for the first time into the page's head, ahead of
    every other stylesheet, and a sheet put in ahead of the others makes the browser rebuild its
    whole set of fonts: for one frame every letter stands in the system font behind and the screen
    lurches. The icon-styles plugin has those styles put in behind the others instead. They sit in a
    cascade layer and match with no weight of their own, so where they stand changes nothing they
    draw.
- **The interface's stack names Apple SD Gothic Neo first, then Pretendard, then the system's sans
  serif.** Hangul and Latin then come from one family on one line.
  - The layer carries no Apple SD Gothic Neo face: it is under no open licence. A host that carries
    the face declares it under that family name, and the layer's stack takes it; otherwise a
    machine's own installed copy answers.
  - **Behind it stands Pretendard, for what Apple SD Gothic Neo lacks.** The layer carries Pretendard
    in the four weights the screens use — 400, 500, 600 and 700 — each cut to exactly the letters
    that face lacks: most accented Latin, the middle dot, the minus sign and the narrow spaces,
    around 33KB a weight. Its files hold those letters alone, so a letter they lack goes straight
    to the faces behind.
  - Should a face arrive late, letters stand first in the font behind and are swapped in place when
    it arrives.
- **A page in Japanese or Chinese names its own language's faces where the Korean ones stand.** A
  Korean face holds kana and Han as well, drawn in Korean shapes, so the stacks above hold for every
  page but one whose root names Japanese or Chinese as its language. Such a page reads Hiragino Sans
  first for Japanese and PingFang SC first for Chinese, then the system's own faces, then its
  language's faces on Windows and Linux (Yu Gothic UI, Meiryo and Noto Sans JP; Microsoft YaHei and
  Noto Sans SC), with Pretendard and the system's sans serif behind, and names no Korean face. The
  fixed-width stack names the same faces of its language right behind CaskaydiaCove. The layer
  carries none of these faces.
- **Words kept whole stay whole in Korean alone.** A place that keeps a word from breaking inside it —
  a diagram's label, a side list's line — keeps Korean words whole, while in a page in Japanese or
  Chinese, which put no spaces between words, it breaks as that language's own rules allow.
- **Monospace letters stand in CaskaydiaCove,** Cascadia Code from Nerd Fonts, carried and served
  with the layer. One weight is carried, cut to letters, digits, punctuation, arrows and
  box-drawing, 36KB: the icon glyphs are not carried, since icons are drawn as pictures and carrying
  them would make the file thirty times larger.
- **Behind it stands the interface's stack.** No monospace font has Hangul, so Hangul in a monospace
  place would otherwise fall to whatever font a machine happens to have. In this order Latin, digits
  and symbols come out in the coding font and the Hangul between them in the interface's own face,
  with Pretendard behind it. The system monospace stack stands last.
- **A place needing monospace stays monospace** — commands, paths, code, column names. Where all that
  is needed is aligned digits, the interface's face is given tabular figures instead.
- **A number saying how much carries a thousands separator; a number pointing at what does not.**
  A count, a length, a size carries one, through the numbers module; an item's number, a port, a
  year does not, since a separator there makes the value wrong. The locale the separator is written
  in is set, never left to the browser's or the server's own, which need not agree and would redraw
  the place on hydration. It is the host's locale setting (`docs/boundary.md`).
- **A number that changes as it is watched, or is read down a column, stands in tabular figures**,
  so a 1 turning to an 8 does not widen its column. The layer's `tabular-nums` class also draws at
  geometric precision: Chromium on Linux rounds each glyph's advance to a whole pixel after hinting,
  so digits of one width in the font would still land a pixel apart on the screen.
- **A figure that ticks in a column, or beside something else on its line, keeps the width of the
  widest it realistically reaches** (`SteadyFigure`). Tabular figures hold a width only while the
  places stay as many. The caller names the figure's widest form, and that form stands unseen under
  the reading, so the box is the wider of the two from the first frame. A figure in a column compared
  down it stands at the column's end.

## Colour

- **The colours are the library's semantic tokens** — primary, secondary, success, info, warning,
  error and a neutral grey, the primary and the neutral named by the theme. A light screen paints
  each from its 500 shade and a dark one from its 400.
- **A coloured word reads at 4.5:1 or better on every surface, in both modes, under every theme.**
  The step a colour is filled at does not read as a word, so each semantic colour has a word token,
  `--bmo-ink-<colour>`, which the colour's text utilities read, every variant of them included,
  while fills, edges, rings and tints keep reading the colour and keep the library's look. The layer
  states each word token in each mode at the step that reads on the page, the muted and the
  elevated surface under the colour's own tint of up to 15%: in the light mode the 800 for the
  primary, the success, the warning and the error and the 700 for the secondary and the info; in
  the dark mode the 300 for the primary, the secondary, the info and the error and the 400 for the
  success and the warning. They stand under every rule a host writes outside a cascade layer, so a
  host that wants another step states its own and has it; where a word token resolves to nothing,
  the words read the colour itself.
- **The muted words read at 4.5:1 or better on every surface too.** The light mode draws them in the
  neutral's 600, the library's 500 falling under 4.5:1 on the elevated surface; the dark mode keeps
  the library's 400.
- **A coloured badge's words read at 4.5:1 or better in both modes.** The light mode's 500 shade is a
  fill colour: as text on white or on its own tint it reads at 1.8 to 3.3, and a white word on it at
  under 4. So in the light mode every badge takes its colour tokens from the 800 shade, the step at
  which every colour still reads on the elevated surface under its own tint, and its words take the
  same step over any word step a host states, so a badge reads the same on every host. It is set once
  on the `badge-ink` class, which the layer's badge override puts on every badge. Each of the four
  shapes — solid, outline, soft and subtle — stays the shape it is. In the dark mode a badge keeps
  the 400 for its fill, edge and tint, and its words read the colour's dark word step.
- **A soft or subtle alert's words read at 4.5:1 or better the same way.** Those two shapes draw an
  alert's title and description in its colour on its own tint, as a badge of the same shape does,
  so the layer's alert override puts the `badge-ink` class on both, for every colour. It also draws
  their description at its full colour: the nine tenths the library draws it at falls under 4.5:1 on
  the muted and elevated surfaces, in the dark mode as well.
- A check paints every colour in every badge shape, and in an alert's soft and subtle shapes, on each
  surface either is read on — the page, the muted one and the elevated one — in both modes and under
  every theme, under a host whose word tokens stand at the fill's own step, and measures the words as
  the browser drew them. Another paints every colour's words bare and under its own tint of 5, 10 and
  15%, and the muted words, on the same three surfaces in both modes under every theme, at a desk's
  width and a phone's, over the library's own surfaces with no word step a host states, and measures
  them the same way. Another compiles the layer's theme and reads which token each colour's text,
  fill, edge and ring utilities draw with.

## Themes

- **A theme names the accent and the grey, and nothing else:** the accent (the primary token) and the
  neutral grey every ground, surface, edge and letter is read from. The focus ring and the badges keep
  the steps they take of the tokens, and the palette's grounds are the palette's, so choosing a theme
  changes everything but those grounds.

  | Id | Accent | Neutral |
  | --- | --- | --- |
  | `teal` | teal | zinc |
  | `sea` | sky | zinc |
  | `forest` | emerald | stone |
  | `violet` | violet | mauve |
  | `sunset` | orange | stone |

- **The default theme is `teal`,** the one read wherever no choice has been made.
- **A theme is one entry of the themes module's list,** carrying its id, the key of its name and its
  two colours. The theme tokens, the settings' swatches and previews and every contrast check read the
  list, so a theme added there is offered, drawn and checked with nothing else changed. Each theme's
  name is the key `common.label.theme_<id>`.
- **The screen mode stands beside the theme and apart from it:** system, light or dark, kept in a
  cookie whose name the layer states, and every theme is drawn in both modes. A reader who never
  chose a mode reads dark. The mode is kept in a cookie so a page rendered on the server already
  stands in it, and the cookie lasts a year from the last time the mode was written to it, so a
  choice outlives the browser's session.
- Where a reader's choice is kept, and how it reaches the page, is the host's.

## Palettes

- **A palette names two grounds, and nothing else:** the reader's own and everyone else's, each in the
  light mode and the dark. It is the colouring of the two sides of a conversation the host draws;
  every ink and surface the host draws on those grounds is the host's to compute.

  | Id | Own, light | Own, dark | Other, light | Other, dark |
  | --- | --- | --- | --- | --- |
  | `teal` | `#d8f3f3` | `#17504f` | `#f4f4f5` | `#27272a` |
  | `sea` | `#dceafa` | `#1b3d5c` | `#f4f4f5` | `#27272a` |
  | `forest` | `#dcf2e3` | `#1d4a33` | `#f5f5f4` | `#292524` |
  | `violet` | `#ebe5fb` | `#3a2d63` | `#f3f1f3` | `#2a212c` |
  | `sunset` | `#fce5d8` | `#5a301f` | `#f5f5f4` | `#292524` |
  | `lemon` | `#fbf0b3` | `#4a4216` | `#f4f4f5` | `#27272a` |

- **The default palette is `teal`.**
- **A palette is one entry of the palettes module's list,** carrying its id, the key of its name and
  its grounds, read as the theme list is. Each palette's name is the key `common.label.palette_<id>`.
- **A palette and a theme that share an id share a hue.**
- **The grounds are stated as tokens:** `--bmo-palette-own-light`, `--bmo-palette-own-dark`,
  `--bmo-palette-other-light` and `--bmo-palette-other-dark`, and the mode's own pair,
  `--bmo-palette-own` and `--bmo-palette-other`, resolved on the root, on `.light` and on `.dark`.
  `PaletteSwatch` paints the mode's pair; a host draws its own grounds from the same tokens.

## Both on the page

- **The page can stand in its theme and palette from its first frame.** The themes and palettes
  modules each turn an entry into its declarations, ready to be stated in the page's head over the
  library's own, so even the ground painted before any stylesheet arrives is the chosen one. The
  layer's head paints the screen mode's ground from the first frame, white in the light mode and the
  theme's 900 grey in the dark. Reading the reader's choice and stating it is the host's.
- **A box can stand in a theme and mode of its own.** The scheme module provides a box with a scheme
  of its own, and `ThemePreview`, `ThemeSwatch` and `PaletteSwatch` state their entry's tokens on
  their own box, so what is inside reads them whatever the page stands in.
- **Every pair keeps the contrast promises in both modes.** The checks of the badges and of the focus
  ring run over every theme, and the check of the palette's grounds over every palette under every
  theme: the library's words read at 4.5:1 or better on both grounds in both modes, and the mode's
  pair resolves to the mode's own grounds on the root, on `.light` and on `.dark`, a box of either
  mode standing in a page of the other included.

## Focus

- **Focus is shown only where the keyboard put it.** A control focused by a press of the mouse or a
  finger draws nothing; one the keyboard reached — Tab, an arrow along a list, a dialog handing focus
  back after a key closed it — draws the ring. The browser's own `:focus-visible` tells the two
  apart, and nothing in the layer draws a ring on `:focus` alone. The dialog close (`ShellClose`) is
  where that tell falls short: a dialog opened by a press on a control the keyboard had reached
  inherits the visible focus on its own close, so the close draws no ring for a focus no key moved,
  read off the page's modality mark, until that focus leaves it.
- **The focus a floating thing takes up on its own as it opens draws no ring unless a key opened
  it.** A dialog opened as the page loads, from the address, moves the focus onto its first control,
  its close or its own box with no key pressed, and the browser counts a focus with nothing before
  it as the keyboard's. The overlays module tells such a focus as it lands (`docs/components.md`,
  "Tooltips") and marks the element it landed on, unless the reader's last key or press before the
  floating thing opened was a key; the stylesheet draws no ring on a marked element, whatever ring
  the library gives it. The mark goes the moment the focus leaves that element or the reader presses
  a key, so Tab from there rings what it reaches, and a floating thing a key opened keeps its ring.
  A field's edge is no ring and still shows.
- **The ring is one style for every screen,** three tokens on the root.

  | Token | Value | For |
  | --- | --- | --- |
  | `--bmo-focus` | primary's 600 in the light mode, its 400 in the dark | The ring's colour: the accent at the step that reads at 3:1 or better on the page, the muted and the elevated surface. |
  | `--bmo-focus-width` | 2px | How thick the ring is. |
  | `--bmo-focus-gap` | 2px | How far outside the element it stands. |

  - The ring is an outline, so it follows the element's own corner radius.
  - A row inside a box that clips what stands past its edge — a scrolling list, a tab bar, a table —
    draws the ring inside its own edge instead, with the `focus-inset` utility, at the same width.
  - It is set on the stylesheet's base for every element, and over the colour and width the library
    gives its own controls, so no component names either.
  - An outline on a screen is the ring alone, so every element's outline is the accent at rest as
    well. The library rests a control's outline in a quarter of the control's own colour and fades its
    colours as they change; with the accent already there the ring has nothing to fade from, and it
    stands in the accent from the frame the keyboard reaches the control.
  - A library control that redraws its own edge on focus keeps the edge it rests with: the ring alone
    says it has focus.
- **A field shows focus on its own edge, with no ring.** A text box, a number box and a select take
  the accent on their edge while they hold focus, and a field drawn with no edge takes the elevated
  background instead. A text box shows it however it was focused, since the caret is in it either
  way.
- **A message box shows it on its bar** (`focus-bar`). It draws no ring around itself or its text;
  while its text holds focus the bar's background steps from the half-elevated tone to the elevated
  one, and only where the keyboard brought the focus does its edge take the accent as well. Which
  hand last moved the focus is marked on the page's root by the input-modality plugin, since a text
  box counts every focus as one the keyboard could see.

## Corners

- **Every corner takes one of four tiers,** all read off the library's one radius (`--ui-radius`,
  4px), and nothing is given a radius of its own.

  | Tier | Value | For |
  | --- | --- | --- |
  | small | 4px, the radius itself | A chip and a badge, all one height side by side; and what stands 4px inside a large box's corner, such as a button inside an input box. |
  | medium | 6px, one and a half times it | A button, a field, a quote or a highlighted line inside a card: the library's own default for each. |
  | large | 8px, twice it | A box that holds others: a card, a panel, an input box, an item of a list drawn as a card. |
  | round | a circle | A face, a dot. Nothing else is round. |

- **What stands inside a rounded box near its edge follows that box's corner.** An element closer to
  the box's edge than the box's radius takes the box's radius less its inset, so the two curves are
  concentric; one standing the radius or further in takes its own tier. A picture running to the
  edge takes no corners of its own and is cut by the box's, through the `rounded-inherit` utility.
- Chips and badges that stand side by side are one tier, one height and one padding, whatever each
  says.
