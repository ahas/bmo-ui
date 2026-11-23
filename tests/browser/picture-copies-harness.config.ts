import { fileURLToPath } from "node:url";

import ui from "@nuxt/ui/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// The picture-copies harness page built into one script (`tests/browser/picture-copies.test.ts`), the way the layer's
// custom elements are built: Vue, the component library and the loading picture, so a
// page with no app of the layer's draws it. The test hands it an output folder.

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

// The layer's app configuration is written for Nuxt, which supplies the helper it is wrapped in.
(globalThis as { defineAppConfig?: (config: unknown) => unknown }).defineAppConfig = (config) => config;

const { default: appConfig } = (await import("../../app/app.config.ts")) as { default: { ui: Record<string, unknown> } };

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
      icon: { clientBundle: { icons: [], scan: false } }
    })
  ],
  build: {
    emptyOutDir: true,
    lib: { entry: here("./picture-copies-harness.ts"), formats: ["iife"], name: "PictureCopiesHarness", fileName: () => "picture-copies-harness.js" }
  }
});
