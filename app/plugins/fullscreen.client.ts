import { holdThroughFullscreen } from "../domain/fullscreen";

// A video let go of full screen finds its screen where it was left, on every screen at once
// (`docs/design.md`, "The vertical"). It is held for as long as the page is open.
export default defineNuxtPlugin(() => {
  holdThroughFullscreen(document);
});
