import { watchInputModality } from "../domain/modality";

// Which hand last moved the focus, marked on the page's root for the stylesheet's `focus-bar`
// (`docs/design.md`, "Focus"): a text box counts every focus as one the keyboard could see, so this is
// the one place a press of the mouse or a finger is told apart from the keyboard for it.
export default defineNuxtPlugin(() => {
  watchInputModality(document);
});
