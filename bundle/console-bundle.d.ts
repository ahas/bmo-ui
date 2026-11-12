import type { Plugin } from "vite";

// The types of the bundle build, which is written in JavaScript beside this file.

/**
 * The plugin a console bundle is built with: the shared libraries left unbundled, the layer written,
 * and the words its screens ask for held to its own words and the layer's keys.
 */
export declare function consoleBundle(options: {
  /** The bundle's name, in kebab-case, as its manifest names it: its words' namespace. */
  name: string;
  /** The bundle's words as its service answers them: each locale's tree under the locale's code. */
  words: Record<string, Record<string, unknown>>;
}): Plugin;
