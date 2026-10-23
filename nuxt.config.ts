import { fileURLToPath } from "node:url";

import { DEFAULT_SCHEME, SCHEME_COOKIE } from "./shared/screen-mode";

// The layer a consumer extends. It brings the component library and what every screen built on it
// stands on; the host brings its own modules, its language pack, its address and its pages.
export default defineNuxtConfig({
  modules: ["@nuxt/ui"],
  // The layer's stylesheet, named from the layer's own folder: an alias in a layer's configuration
  // is read against the host that extends it.
  css: [fileURLToPath(new URL("./app/assets/css/main.css", import.meta.url))],
  // The screen mode is dark until a reader chooses another, and it is kept in a cookie so a server
  // rendering a page knows the mode it stands in (`docs/design.md`, "Themes").
  colorMode: { preference: DEFAULT_SCHEME, storage: "cookie", storageKey: SCHEME_COOKIE },
  // The translator a console names (`docs/boundary.md`, "What the host owes"): the service it is relayed under
  // and its translating route, settings of the host's deployment. Both stand empty, so nothing translates
  // until the host names one.
  runtimeConfig: {
    public: {
      bmoUi: { translator: { service: "", path: "" } }
    }
  },
  compatibilityDate: "2025-09-01",
  devtools: { enabled: false },
  app: {
    head: {
      meta: [
        // The keyboard takes its room out of the page rather than lying over it, where the browser
        // will do that: a screen laid out in one screenful with nothing behind it to scroll to would
        // otherwise have the box being typed in covered by the keyboard. Where a browser does not
        // honour this it is read off the visual viewport instead, and the layout answers either way.
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        }
      ],
      // The ground of the screen mode is painted from the first frame, ahead of every stylesheet, so
      // no screen opens on a white flash while the styles are still arriving. The mode's class is on
      // the root before the body is read; the dark ground is the theme's own grey where the page
      // states a theme.
      style: [{ innerHTML: "html{background:#fff;color-scheme:light}html.dark{background:var(--ui-color-neutral-900,#18181b);color-scheme:dark}" }]
    }
  },
  ui: {
    theme: {
      colors: ["primary", "secondary", "success", "info", "warning", "error", "neutral"]
    }
  }
});
