---
name: ahas-ui
description: Build or restyle a screen on the bmo-ui Nuxt layer, or write a console bundle that a console attaches by the layer's console plugin contract. Use before writing the first component, colour, size or wording of such a screen, and before declaring a bundle.
---

# Building on bmo-ui

bmo-ui is a Nuxt layer on Nuxt UI: design tokens, the component library's overrides, common
components and page plugins, and the console plugin contract. Its MCP server, started by the
package's command `bmo-ui mcp`, is a catalogue of all of it. Read the catalogue before writing
anything of your own, since what the layer already has is the one a screen is meant to use.

## Before writing a screen

1. **Ask `ui_components`** for what the layer has, with a few words of what the screen needs
   (a table, a tab bar, a settings row, a skeleton, a share link, a notice).
2. **Ask `ui_component`** for each one you will use: its props, slots and events, and an example of
   its use. Write it as the example does.
3. **Ask `ui_tokens`** for the values the screen draws with: the text, ground and border colours of
   both modes, the motion lengths and eases, the reading width, the header height, the radius, the
   focus ring. Draw with the tokens and the classes built on them, never with a value of your own.
4. Only for what none of them answers, write your own component, on Nuxt UI's components and the
   layer's tokens.

## Rules a screen on the layer keeps

- **The host extends the layer** from its Nuxt configuration and installs the i18n module; the layer
  brings Nuxt UI, its stylesheet, fonts, components and page plugins.
- **No word is written into a template.** Every word is a key of the screen's own language pack, in
  the shape domain, role and key; the layer's components read their own keys under `common` and
  `files`, which the host's pack answers.
- **Times and figures** go through the layer's time and numbers modules, which read the host's zone
  and locale.
- **The layer's modules are imported by the package's path,** and a layer or bundle reaches its own
  files by relative path, never through an alias Nuxt binds to the host's folders.
- **Lists that search** use the layer's search module and mark hits with its search components.

## Writing a console bundle

1. **Ask `ui_plugin_contract`.** It answers the file a bundle declares itself in, the declaration's
   JSON Schema and the contract's whole document. Follow the document.
2. **Declare the bundle** at its package's root, in that file, by the schema, and read it in the
   bundle's own test through the layer's `consoleBundle` reading, so a declaration that breaks the
   contract fails there first.
3. **Keep to the contract:** pages only under the declared screen path, components prefixed with the
   bundle's name, words only under its namespace in its own pack, and every call through the layer's
   relay address for the service's name, never a fixed address.
