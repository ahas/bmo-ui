import { fileURLToPath } from "node:url";

import ui from "@nuxt/ui/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// The toolbar harness page built into one script (`tests/browser/toolbar.test.ts`), the way the layer's
// custom elements are built: Vue, the component library, the layer's toolbar pieces and the sheet they
// are drawn with, so a page with no app of the layer's draws them. The test hands it an output folder.

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

// The layer's app configuration is written for Nuxt, which supplies the helper it is wrapped in.
(globalThis as { defineAppConfig?: (config: unknown) => unknown }).defineAppConfig = (config) => config;

const { default: appConfig } = (await import("../../app/app.config.ts")) as { default: { ui: Record<string, unknown> & { icons: Record<string, string> } } };

// The marks the harness page draws, named as its own file names them.
const HARNESS_ICONS = [
  "i-material-symbols-visibility-outline",
  "i-material-symbols-code",
  "i-material-symbols-chevron-left",
  "i-material-symbols-chevron-right",
  "i-material-symbols-refresh",
  "i-material-symbols-more-vert",
  "i-material-symbols-arrow-back",
  "i-material-symbols-zoom-in",
  "i-material-symbols-zoom-out",
  "i-material-symbols-fit-screen-outline",
  "i-material-symbols-add"
];

export default defineConfig({
  root: here("../.."),
  // The script runs in the browser alone: what Nuxt states of the side a file runs on is stated here.
  define: { "import.meta.client": "true", "import.meta.server": "false", "import.meta.dev": "false", "process.env.NODE_ENV": JSON.stringify("production") },
  plugins: [
    vue(),
    ui({
      router: false,
      colorMode: false,
      dts: false,
      ui: appConfig.ui,
      autoImport: { imports: ["vue"], dts: false },
      components: { dirs: [here("../../app/components")], dts: false },
      // The icons travel in the script, since the page fetches nothing but it.
      icon: { clientBundle: { icons: [appConfig.ui.icons.loading!, ...HARNESS_ICONS], scan: { globInclude: ["app/components/ActionGroup.vue", "app/components/TabBar.vue", "app/components/ImageViewer.vue", "app/components/ShellClose.vue"] } } }
    })
  ],
  build: {
    emptyOutDir: true,
    lib: { entry: here("./toolbar-harness.ts"), formats: ["iife"], name: "ToolbarHarness", fileName: () => "toolbar-harness.js" }
  }
});
