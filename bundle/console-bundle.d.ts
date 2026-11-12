import type { Plugin } from "vite";

// The types of the bundle build, which is written in JavaScript beside this file.

/** The plugin a console bundle is built with: the shared libraries left unbundled, the layer written. */
export declare function consoleBundle(): Plugin;
