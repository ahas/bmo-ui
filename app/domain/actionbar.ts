// How much room a bar of actions actually has, and what it does when it runs out.
//
// A bar is as narrow as the part it stands in and not as the window. A toolbar inside a side panel,
// inside one half of a splitter, or over a list standing in a reading column carries that part's
// width however wide the screen around it is — a list panel beside a reading pane is often narrower
// than a phone — so a bar that asked the window would stand its whole row of actions where there is
// no room for them and run off its own edge.
//
// What a bar does when it runs out of room is gather: the actions reached for most stand, and the
// rest go into one More menu at the end of the row. Which of those two shapes a bar takes is read
// here, from the bar's own width, once for every bar rather than screen by screen.

import { useWidth } from "./screen";

import type { Ref } from "vue";

// The room a bar needs before it stands its actions rather than gathering them. Below it, a bar
// holds what a hand reaches for first and nothing else; at it and above, it stands them all.
export const BAR_GATHERS_UNDER_PX = 560;

// How many actions stand outside the menu at a given room. A gathered bar keeps the two reached
// for first; a bar with the room stands as many as a group is allowed to hold before it folds
// whole, which is what the count rule already says.
export const GATHERED_ACTIONS = 2;
export const STANDING_ACTIONS = 3;

export function barGathers(room: number): boolean {
  return room < BAR_GATHERS_UNDER_PX;
}

// How many of a bar's actions stand outside its More menu, by the room the bar has.
export function actionsOutside(room: number): number {
  return barGathers(room) ? GATHERED_ACTIONS : STANDING_ACTIONS;
}

// The width a bar actually has, watched. It reads as room enough until it has been measured, so a
// bar drawn by the server and a bar on its first frame stand their actions rather than flashing
// gathered and opening again a moment later.
export function useBarRoom(element: () => HTMLElement | null | undefined): Ref<number> {
  return useWidth(element, Number.POSITIVE_INFINITY);
}

// Whether the bar standing in this element gathers its actions.
export function useBarGathers(element: () => HTMLElement | null | undefined): Ref<boolean> {
  const room = useBarRoom(element);

  return computed(() => barGathers(room.value));
}
