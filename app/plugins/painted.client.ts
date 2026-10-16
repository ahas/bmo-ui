import { markPainted } from "../domain/loading";

// A skeleton stands only once the reads it waits for have begun, which is when hydration ends
// (`docs/components.md`, "Skeletons and loading"). A screen reached after that point finds the flag
// already up.
export default defineNuxtPlugin((nuxtApp) => {
  if (!nuxtApp.isHydrating) {
    markPainted();

    return;
  }

  nuxtApp.hooks.hookOnce("app:suspense:resolve", markPainted);
});
