// The open tabs of a screen, as a list the screen owns (`docs/components.md`, "Tab bar and
// toolbar"). The tab bar only draws the list and says what was pressed; every change to it is one of
// these, so each screen that opens things as tabs moves them the same way.

// How a row of the component library's link tabs is drawn (`docs/components.md`, "Tab bar and
// toolbar"). The row that holds it has a fixed height and no padding above or below, and the tabs
// take that whole height, so nothing squeezes them into scrolling. The row draws its own bottom line;
// the tabs draw none, and the active line stands at the row's bottom edge. A row wider than its place
// scrolls sideways. Until the library's sliding line stands, as on a page drawn on the server before it
// hydrates, the chosen tab draws the line itself, which the library places for a list padded on every
// side, a few pixels below the tab; in this row, which keeps no padding, it stands at the bottom edge
// as well, since a line below the row would make the row scroll vertically.
export const TAB_ROW_UI = {
  root: "h-full min-w-0",
  list: "h-full p-0 border-b-0 overflow-x-auto [scrollbar-width:none]",
  indicator: "bottom-0",
  trigger: "h-full shrink-0 in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:after:bottom-0"
};

// The bottom line of a row of tabs, drawn over the row's last pixel rather than as a border under
// it, so the tabs take the row's whole height and the row's height is theirs (`docs/components.md`,
// "Tab bar and toolbar"). It stands under the active tab's own line.
export const TAB_ROW_LINE =
  "relative before:pointer-events-none before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-(--ui-border)";

// A tab as the bar draws it.
export interface BarTab {
  id: string;
  label: string;
  // The whole name, where the label is a shortened one.
  title?: string;
  icon?: string;
  mono?: boolean;
  // Held at the row's left end, out of the reach of every closing but its own.
  pinned?: boolean;
}

// A choice the screen adds to a tab's own menu, under the closings and the pin.
export interface BarMenuItem {
  label: string;
  icon: string;
  disabled?: boolean;
  onSelect: () => void;
}

// An action on what the open tab shows, at the bar's right end.
export interface BarAction {
  id: string;
  label: string;
  icon: string;
  // A toggle that is on.
  pressed?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onSelect: () => void;
}

// One detail of what the open tab shows — its path, kind, size, language — as the properties
// viewer lists it. Details stand there and not above the body.
export interface BarProperty {
  label: string;
  value: string;
  mono?: boolean;
}

// One choice of a view switch.
export interface SwitchItem<V extends string = string> {
  value: V;
  label: string;
  icon?: string;
}

export interface SeenTab {
  seenAt: number;
  pinned?: boolean;
}

// The tabs after one more is opened: a tab already open keeps its place and its pin and takes the
// new value, a new one goes on the end, and past the cap the unpinned one looked at longest ago is
// closed. Pinned tabs are never closed for room; a row of nothing but pinned tabs grows past the cap.
export function openInTabs<T extends SeenTab>(tabs: readonly T[], same: (tab: T) => boolean, opened: T, cap: number): T[] {
  if (tabs.some(same)) {
    return tabs.map((tab) => (same(tab) ? { ...opened, pinned: tab.pinned } : tab));
  }

  const next = [...tabs, opened];
  const loose = next.filter((tab) => tab.pinned !== true && tab !== opened);

  if (next.length <= cap || loose.length === 0) {
    return next;
  }

  const oldest = loose.reduce((one, other) => (other.seenAt < one.seenAt ? other : one));

  return next.filter((tab) => tab !== oldest);
}

// The kept tabs put back under the ones a screen already opened before they arrived: the kept row
// stands as it was, and each tab opened meanwhile is opened into it.
export function mergeTabs<T extends SeenTab>(kept: readonly T[], opened: readonly T[], same: (one: T, other: T) => boolean, cap: number): T[] {
  return opened.reduce<T[]>((row, tab) => openInTabs(row, (one) => same(one, tab), tab, cap), pinnedFirst(kept, (tab) => tab.pinned === true));
}

// A tab pinned or let go. Pinned tabs stand together at the left end in the order they had, and a
// tab let go stands first after them.
export function pinTab<T extends { pinned?: boolean }>(tabs: readonly T[], index: number, on: boolean): T[] {
  const marked = tabs.map((tab, at) => (at === index ? { ...tab, pinned: on } : tab));

  return pinnedFirst(marked, (tab) => tab.pinned === true);
}

// The row with its pinned tabs moved to the left end, each part keeping its own order.
export function pinnedFirst<T>(tabs: readonly T[], pinned: (tab: T) => boolean): T[] {
  return [...tabs.filter(pinned), ...tabs.filter((tab) => !pinned(tab))];
}

// The tab to stand once the open one is closed: the one looked at last among those left.
export function lastSeen<T extends SeenTab>(tabs: readonly T[]): T | null {
  return tabs.reduce<T | null>((best, tab) => (best === null || tab.seenAt > best.seenAt ? tab : best), null);
}

// A tab dragged to a place in the row. The place is counted in the row as it stood before the drag,
// so dropping a tab on its right-hand neighbour puts it after that neighbour. A drag never crosses
// the edge between the pinned tabs and the rest: a tab let go past it stops at it.
export function moveTab<T>(tabs: readonly T[], from: number, to: number, pinned: (tab: T) => boolean = () => false): T[] {
  if (from < 0 || from >= tabs.length || from === to) {
    return [...tabs];
  }

  const next = [...tabs];
  const [moved] = next.splice(from, 1) as [T];
  const edge = next.filter(pinned).length;
  const at = Math.max(0, Math.min(to > from ? to - 1 : to, next.length));

  next.splice(pinned(moved) ? Math.min(at, edge) : Math.max(at, edge), 0, moved);

  return next;
}

// The indexes the bar's menu closes, for the tab it was opened on, given which tabs are pinned. A
// pinned tab is closed only by its own closing, never by one of these.
export function othersOf(pinned: readonly boolean[], index: number): number[] {
  return pinned.flatMap((held, at) => (held || at === index ? [] : [at]));
}

export function rightOf(pinned: readonly boolean[], index: number): number[] {
  return pinned.flatMap((held, at) => (held || at <= index ? [] : [at]));
}

export function allOf(pinned: readonly boolean[]): number[] {
  return pinned.flatMap((held, at) => (held ? [] : [at]));
}

// What a file tab says: the file's own name, or its whole path where another open file has the
// same name, since two tabs both reading `index.ts` are one tab too many to tell apart.
export function fileTabLabel(paths: readonly string[], path: string): string {
  const name = baseName(path);

  return paths.some((other) => other !== path && baseName(other) === name) ? path : name;
}

export function baseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}
