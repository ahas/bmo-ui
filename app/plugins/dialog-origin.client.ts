import { watchDialogOrigins } from "../domain/dialog-origin";

// Every dialog grows out of the control pressed to open it, on every screen, from the moment the
// page is up (`docs/components.md`, "Floating things").
export default defineNuxtPlugin(() => {
  watchDialogOrigins();
});
