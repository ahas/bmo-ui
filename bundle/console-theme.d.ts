import type { Plugin } from "vite";

// The types of the theme plugin, which is written in JavaScript beside this file.

/**
 * The plugin a console bundle's stylesheet reads the layer's theme through: the layer's stylesheet and
 * the component library's copied with none of the sources they scan, and the copy of the layer's named
 * by the import `#console-theme`.
 */
export declare function consoleTheme(options?: {
  /** Nuxt's build folder, where `nuxi prepare` writes the component library's theme; `.nuxt` under the build's root where left out. */
  buildDir?: string;
}): Plugin;
