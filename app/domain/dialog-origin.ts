// A dialog grows out of the control pressed to open it and shrinks back into it, so where it came
// from is seen rather than remembered (`docs/components.md`, "Floating things"). No screen says which
// control that was: the last press is remembered here, and every dialog the library opens is found
// on the page the moment it opens and handed that press's place. A dialog nothing was pressed for
// is handed nothing and only fades, since it comes from no place.
//
// Which element is a dialog that moves this way is read off the movement itself — the animation
// the layer gives every dialog — so a sheet or a drawer, which slides in from its edge, and a
// popover or a menu, which the library already grows out of what it stands beside, are left alone.

const DIALOG_IN = "bmo-dialog-in";

// What a reader presses to open something. A press landing on what is inside one of these — the
// mark or the words of a button — is a press of the whole control, and the dialog grows out of the
// control's middle rather than the pixel the finger happened to land on.
const CONTROL =
  "button, a[href], summary, label, [role=button], [role=link], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio], [role=option], [role=tab]";

// How long after a press a dialog opening is still that press's. A dialog opened from a menu opens
// only once the menu has gone, a turn or two later; one opening past this is opening of its own
// accord, after a load or a message, and is no press's.
const PRESS_FRESH_MS = 1_000;

// How small a dialog starts at its control. Small enough that the growing reads as coming out of
// that place rather than as the dialog merely settling.
const GROWN_FROM = "0.5";

export interface Press {
  x: number;
  y: number;
  at: number;
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Where in a dialog's own box the press that opened it stands, as its transform origin, or null
// where no press is behind it. The box is read off the screen while the dialog is still growing out
// of its own middle, so its middle is already where it will stand and its full size is laid around
// that middle.
export function originOf(press: Press | null, now: number, box: Box, size: { width: number; height: number }): string | null {
  if (press === null || now - press.at > PRESS_FRESH_MS) {
    return null;
  }

  const left = box.left + box.width / 2 - size.width / 2;
  const top = box.top + box.height / 2 - size.height / 2;

  return `${press.x - left}px ${press.y - top}px`;
}

let press: Press | null = null;

function remember(event: MouseEvent): void {
  if (!(event.target instanceof Element)) {
    return;
  }

  const control = event.target.closest(CONTROL);

  // A press on nothing that is a control of its own is placed where it landed, unless it came from
  // a key, which lands nowhere: then it is the middle of what took it.
  if (control === null && event.detail > 0) {
    press = { x: event.clientX, y: event.clientY, at: performance.now() };

    return;
  }

  const box = (control ?? event.target).getBoundingClientRect();

  press = { x: box.left + box.width / 2, y: box.top + box.height / 2, at: performance.now() };
}

function grow(dialog: HTMLElement): void {
  const origin = originOf(press, performance.now(), dialog.getBoundingClientRect(), { width: dialog.offsetWidth, height: dialog.offsetHeight });

  press = null;

  if (origin === null) {
    return;
  }

  dialog.style.transformOrigin = origin;
  dialog.style.setProperty("--bmo-dialog-from", GROWN_FROM);
}

// The dialogs already handed a place, so an opening is handed one once. A dialog drawn again while
// open is the same opening; one closed is forgotten, so opening it again is a new one.
const placed = new WeakSet<Element>();

function sweep(): void {
  for (const dialog of document.querySelectorAll<HTMLElement>("[role=dialog]")) {
    if (dialog.getAttribute("data-state") !== "open") {
      placed.delete(dialog);
      continue;
    }

    if (placed.has(dialog) || getComputedStyle(dialog).animationName !== DIALOG_IN) {
      continue;
    }

    placed.add(dialog);
    grow(dialog);
  }
}

let watching = false;

export function watchDialogOrigins(): void {
  if (watching || import.meta.server) {
    return;
  }

  watching = true;
  window.addEventListener("click", remember, true);
  new MutationObserver(sweep).observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-state"]
  });
}
