import layer from "../shared/layer.json" with { type: "json" };

// The bundle build (`docs/boundary.md`, "The bundle build"; `docs/console-bundles.md`, "The layer a
// bundle is built on"). A service's build configuration loads this module from the installed package
// under Node, which strips no TypeScript from a file under `node_modules`, so it is written in
// JavaScript and its types stand in the declaration file beside it.

// The file beside the module that names the layer the bundle was built on.
const LAYER_FILE = "layer.json";

/** Whether an import names a library the bundle shares with its console, by its package's own path. */
function shared(id) {
  return layer.sharedLibraries.some((name) => id === name || id.startsWith(`${name}/`));
}

/** The plugin a console bundle is built with: the shared libraries left unbundled, the layer written. */
export function consoleBundle() {
  return {
    name: "bmo-ui-console-bundle",
    apply: "build",
    // Ahead of every resolver, so no other plugin or external setting reaches a shared library first.
    enforce: "pre",
    resolveId(source) {
      return shared(source) ? { id: source, external: true } : null;
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: LAYER_FILE, source: `${JSON.stringify({ layer: layer.layer })}\n` });
    }
  };
}
