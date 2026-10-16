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

- **A list is found as it was left.** Opening a row and coming back is one move, not an arrival: the
  scroll, the choice and the pages already read are where they were. Not taking the list down — the
  detail standing over it, or the page kept by the router — is the screen's own to arrange. What
  that does not give back is the scroll: a kept page's element is detached while it is away, and a
  detached element's offset reads as nothing. The list-place module keeps each list's offset under
  the name the list goes under, for as long as the page is open, and puts it back on the return once
  rows enough stand to reach it, giving up after a few frames where the list never grows that tall.
- **A list that chooses many always offers the whole of them.** Wherever a list has a choosing state
  it carries one control that takes every row shown or gives the whole choice up, at every width and
  from the moment the state is entered — never folded into a menu.
  - It is `ChooseAll`, a checkbox at the three states the choice can be in: none of the rows shown,
    some of them as the checkbox's own indeterminate state, all of them. A press takes the choice to
    whichever end it is not at, and the name it carries — the keys `common.action.choose_all` and
    `common.action.choose_none` — is that end, so the tooltip and the accessible name say what
    pressing would do.
  - A row of such a list marks itself chosen with a checkbox's own square, so one list is not read as
    two ways of choosing.
  - The box is smaller than a finger, so it stands in a cell as wide as a toolbar is tall and the
    whole cell is pressed, with the hover and press colours a toolbar's other cells carry.
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
  words, a popover, a menu, a dialog and its shade, a tooltip — and for nothing else. An item of a
  list never fades, and neither does the content of a page, a panel or a tab as it is replaced.
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
- **One set of lengths and easings,** six tokens on the root, and every movement the layer draws or
  retimes names one of them rather than a number of its own.

  | Token | Value | For |
  | --- | --- | --- |
  | `--bmo-motion-quick` | 150ms | A thing changing state where it stands — a colour, a mark turning, a tab's marker, a figure's characters turning — and a menu, a list or a tooltip out of its control. Felt, never waited on. |
  | `--bmo-motion-pop` | 200ms | A dialog out of its control and its shade; a sheet sliding in. The shortest that still shows where it came from. |
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
  - The items that stay slide to their new places. An item that comes unfolds its height from
    nothing where it lands, one that goes folds its height to nothing where it stood, and the items
    around it close up as it does, the list's own gap included, so nothing jumps at the end. What an
    item shows is laid out at its full size throughout and only clipped.
  - Every item moves at once, at `unfold`, eased by `move`: no item waits for the one before it.
  - Items are keyed by their own lasting id, never by position.
- **A tabbed panel moves as one panel sideways** (`TabSlide`). The panel under the tabs is keyed by
  its tab; the new tab's panel comes in from the side its tab stands on in the tab order while the
  old one leaves to the other side, both together, at `unfold` eased by `move`. The rows inside move
  with their panel and have no movement of their own, and the new panel opens at its own top. A tab
  bar whose tabs are pages of their own changes page and moves nothing.
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
  panel is Vue's own `Transition` of one keyed element, through `TabSlide`. One list is moved by one
  engine, never two. A page change on its own does not move.
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
    around 33KB a weight. Each face names the ranges it covers, so a letter outside them goes
    straight to the faces behind.
  - Should a face arrive late, letters stand first in the font behind and are swapped in place when
    it arrives.
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
- **A coloured badge's words read at 4.5:1 or better in both modes.** The light mode's 500 shade is a
  fill colour: as text on white or on its own tint it reads at 1.8 to 3.3, and a white word on it at
  under 4. So in the light mode every badge takes its colour tokens from the 800 shade, the step at
  which every colour still reads on the elevated surface under its own tint. It is set once on the
  `badge-ink` class, which the layer's badge override puts on every badge. Each of the four shapes —
  solid, outline, soft and subtle — stays the shape it is. The dark mode's 400 already reads at 5 or
  better and is left as it is.
- A check paints every colour in every shape on each surface a badge is read on — the page, the
  muted one and the elevated one — in both modes, and measures the words as the browser drew them.

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
  stands in it.
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
  ring run over every theme, and the check of the palette's grounds over every palette.

## Focus

- **Focus is shown only where the keyboard put it.** A control focused by a press of the mouse or a
  finger draws nothing; one the keyboard reached — Tab, an arrow along a list, a dialog handing focus
  back after a key closed it — draws the ring. The browser's own `:focus-visible` tells the two
  apart, and nothing in the layer draws a ring on `:focus` alone.
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
