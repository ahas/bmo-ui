#!/usr/bin/env bun
// The check packing runs first (the README, "Version"): the layer's version file must name the
// package's own version, which only the release verb writes, in the scratch export it packs. A
// checkout's file names the version marked `+source`, so packing there is refused.

import { packable } from "./release";

const root = new URL("../", import.meta.url);
const manifest = (await Bun.file(new URL("package.json", root)).json()) as { version: string };
const layer = (await Bun.file(new URL("shared/layer.json", root)).json()) as { layer: string };

if (!packable(layer.layer, manifest.version)) {
  process.stderr.write(
    `bmo-ui ${manifest.version} is packed by its release verb alone: run \`bun run release\` in its repository. ` +
      "A host vendors the file the verb wrote under releases/ as it stands.\n"
  );
  process.exit(1);
}
