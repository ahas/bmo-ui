// Finding a line cut short to fit its box, so the one layer over the whole page can show its whole
// words (`docs/components.md`, "Tooltips"). A line is found by what its box does, never by a class
// a screen remembered to write: words ending in an ellipsis, or clamped to a count of lines, and
// actually running past the box as they stand.

// What a tooltip's own trigger carries, as the component library marks it. A line inside one is
// that tooltip's to name, so nothing is said twice.
const OWN_TOOLTIP = "[data-grace-area-trigger]";

// How many elements under a focus are looked through for the line it carries: a row's own few, never
// a whole panel that happened to take the focus.
const FOCUS_REACH = 64;

export interface LineBox {
  textOverflow: string;
  lineClamp: string;
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  clientHeight: number;
}

// Whether a box cuts its words as it stands now: an ellipsis over words wider than the box, or a
// clamp over lines taller than it.
export function boxCuts(box: LineBox): boolean {
  if (box.textOverflow === "ellipsis" && box.scrollWidth > box.clientWidth) {
    return true;
  }

  return box.lineClamp !== "none" && box.lineClamp !== "" && box.scrollHeight > box.clientHeight;
}

function lineBox(element: HTMLElement): LineBox {
  const style = getComputedStyle(element);

  return {
    textOverflow: style.textOverflow,
    lineClamp: style.webkitLineClamp,
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight
  };
}

function cuts(element: Element): element is HTMLElement {
  return element instanceof HTMLElement && boxCuts(lineBox(element));
}

// The cut line a pointer or a finger stands on: the element under it or the nearest one holding it.
export function cutLineAt(target: EventTarget | null): HTMLElement | null {
  for (let element = target instanceof Element ? target : null; element !== null; element = element.parentElement) {
    if (element.matches(OWN_TOOLTIP)) {
      return null;
    }

    if (cuts(element)) {
      return element.closest(OWN_TOOLTIP) === null ? element : null;
    }
  }

  return null;
}

// The cut line a keyboard focus brings up: the one holding what took it, else the first one inside.
export function cutLineIn(focused: Element): HTMLElement | null {
  const around = cutLineAt(focused);

  if (around !== null || focused.closest(OWN_TOOLTIP) !== null) {
    return around;
  }

  const inside = Array.from(focused.querySelectorAll("*")).slice(0, FOCUS_REACH);

  return inside.find((element): element is HTMLElement => cuts(element) && element.closest(OWN_TOOLTIP) === null) ?? null;
}

// The words a cut line holds, as one line of reading.
export function lineWords(line: HTMLElement): string {
  return (line.textContent ?? "").replace(/\s+/g, " ").trim();
}
