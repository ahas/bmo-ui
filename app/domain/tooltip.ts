// The shared tooltip's box, the same wherever one comes up (`docs/components.md`, "Tooltips"): its
// words wrap inside a box no wider than a phone has room for, so a long name is read whole rather
// than cut a second time.
export const TOOLTIP_UI = { content: "h-auto max-w-80 py-1", text: "whitespace-normal break-words" };

// What the host hands the library's app root as its tooltip setting (`docs/boundary.md`, "What the
// host owes"). A tooltip answers hover and the keyboard; a focus handed back by a closing dialog or
// sheet to the control it was opened from is neither, and on a phone it would leave that control's
// name standing over what the reader returned to.
export const TOOLTIP_PROVIDER = { ignoreNonKeyboardFocus: true };
