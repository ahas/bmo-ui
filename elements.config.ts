import { fileURLToPath } from "node:url";

import ui from "@nuxt/ui/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

import type { AcceptedPlugin } from "postcss";

// The layer's custom elements built into one script each (`docs/components.md`, "The audio player as an
// element"): the script carries Vue, the component library, the player, its icons and its sheet, so a page
// with no app of the layer's loads it alone. `bun run elements` writes it to `dist/`.

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

// The layer's app configuration is written for Nuxt, which supplies the helper it is wrapped in.
(globalThis as { defineAppConfig?: (config: unknown) => unknown }).defineAppConfig = (config) => config;

const { default: appConfig } = (await import("./app/app.config.ts")) as { default: { ui: { icons: Record<string, string> } } };

// The sheet stands in a shadow root: what the stylesheet states of the root it states of the element's
// host, and a face, which a shadow root cannot load, is left to the page.
const shadowSheet: AcceptedPlugin = {
  postcssPlugin: "bmo-ui-shadow-sheet",
  AtRule: {
    "font-face": (rule) => {
      rule.remove();
    }
  },
  Rule(rule) {
    rule.selectors = rule.selectors.map((selector) => selector.replace(/:root\b/g, ":host"));
  }
};

export default defineConfig({
  // The script runs in the browser alone: what Nuxt states of the side a file runs on is stated here.
  define: { "import.meta.client": "true", "import.meta.server": "false", "import.meta.dev": "false", "process.env.NODE_ENV": JSON.stringify("production") },
  plugins: [
    vue({ features: { customElement: true } }),
    ui({
      router: false,
      colorMode: false,
      dts: false,
      ui: appConfig.ui,
      autoImport: { imports: ["vue"], dts: false },
      components: { dirs: [here("./app/components")], dts: false },
      // The icons travel in the script, since the page may open no connection to fetch one: every icon the
      // player's files name, and the mark a button stands in while it waits.
      icon: { clientBundle: { icons: [appConfig.ui.icons.loading!], scan: { globInclude: ["app/components/AudioPlayer.vue", "app/elements/**"] } } }
    })
  ],
  css: { postcss: { plugins: [shadowSheet] } },
  build: {
    outDir: here("./dist"),
    emptyOutDir: false,
    lib: { entry: here("./app/elements/audio-player.ts"), formats: ["iife"], name: "BmoAudioPlayer", fileName: () => "bmo-audio-player.js" }
  }
});
