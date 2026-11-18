import { fileURLToPath } from "node:url";

import ui from "@nuxt/ui/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// The dialog head harness page built into one script (`tests/browser/dialog-head.test.ts`), the way
// the layer's custom elements are built: Vue, the component library and the settings dialog, so a
// page with no app of the layer's draws them. The test hands it an output folder.

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

// The layer's app configuration is written for Nuxt, which supplies the helper it is wrapped in.
(globalThis as { defineAppConfig?: (config: unknown) => unknown }).defineAppConfig = (config) => config;

const { default: appConfig } = (await import("../../app/app.config.ts")) as { default: { ui: Record<string, unknown> & { icons: Record<string, string> } } };

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
      icon: { clientBundle: { icons: [appConfig.ui.icons.loading!, "i-material-symbols-close"], scan: { globInclude: ["app/components/SettingsDialog.vue", "app/components/ShellClose.vue"] } } }
    })
  ],
  build: {
    emptyOutDir: true,
    lib: { entry: here("./dialog-head-harness.ts"), formats: ["iife"], name: "DialogHeadHarness", fileName: () => "dialog-head-harness.js" }
  }
});
