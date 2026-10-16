import { watchOverlays } from "../domain/overlays";

// What floats over the page closes to the back gesture and to a finger's tap away from it, on
// every screen, from the moment the page is up (`docs/components.md`, "Floating things").
export default defineNuxtPlugin(() => {
  watchOverlays();
});
