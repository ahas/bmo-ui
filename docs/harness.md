# The harness plugin

A coding harness takes the layer as its first entry point through its plugin: an MCP server the
package's own command starts, and the `bmo-ui` skill that tells a harness when and how to use it.
The server is a catalogue a harness reads while it builds a screen on the layer or a console bundle;
it calls no service and changes nothing.

## The command

- **`bmo-ui mcp`** starts the MCP server on standard input and output. The package names the command
  in its manifest, so a host's install puts it on the path of its own scripts, and a harness launches
  it there. It runs under Bun.
- **`bmo-ui --help`** says what the command takes. Any other word is refused with that text, and the
  command ends with a failure.

## The tools

Each tool is a thin call of one function of the `catalogue` module, which a host's own scripts may
import as well, since it reads the package's files and runs outside a browser. Each answers in the
common wire format: camelCase keys, a page as its items and whether more stand past
them, and a failure as a `code` and an `error`.

| Tool | Takes | Answers |
| --- | --- | --- |
| `ui_components` | `q`, words to narrow by, or none | A page of the components and page plugins, each by its `name`, its `kind` (a component or a page plugin) and its one `line`. Every one stands in the one page. |
| `ui_component` | `name`, a component's name | The component: its `name`, its `line`, its `props` (each by name, type, whether required, and its default and its description where it has them), its `slots` (each by name and the values it hands its content), its `events` (each by name and the values it carries) and an `example` of its use as a template. A name that is no component is refused as `not-found`. |
| `ui_tokens` | `group`, one group's name, or none | The design tokens, each by its custom property: its `group`, its value in the `light` mode and in the `dark` mode, and whether the layer or the component library states it. A group is the property's first word past the namespace, so `color`, `text`, `bg`, `border`, `font`, `radius`, `motion`, `ease`, `palette` and their kin. |
| `ui_plugin_contract` | nothing | The console plugin contract: the file a bundle declares itself in, the declaration's JSON Schema, and the contract's document whole (`docs/console-bundles.md`). |

A kind is `component` or `page-plugin`. The words `ui_components` narrows by are matched against
each name and line as the layer's own list search matches them (`docs/components.md`, "List
search").

## The catalogue

What the tools answer of components, page plugins and tokens is read once from the layer's sources
and kept in the catalogue's data file, committed beside the module and carried in the package, so the
server needs no compiler and no stylesheet reader at run time. The contract is read at run time from
the shared module and the document it carries.

- **A component's line and a page plugin's** are their rows in the boundary document's tables.
- **A component's props, slots and events** are read off the component by the Vue language tools'
  component reader, as its types state them.
- **A component's example** is its own example file in the catalogue's folder: a small component using
  it, held to the layer's types by the typecheck. Every component has one, and none stands for a
  component the layer does not ship.
- **The tokens** are the custom properties stated on the root and on the two modes' classes by the
  component library's stylesheet and by the layer's over it, with the theme's scales and the
  palette's grounds of the default theme and palette.

`bun run catalogue` writes the data file again from the sources. A test fails where the committed file
differs from what the sources give, so a change to a component, a token or the boundary document
carries the file written again with it.

## The skill

The `bmo-ui` skill stands in the package's `skills/` folder, in the shape a harness loads a skill in:
a description naming when it applies, then what to do. It applies to building or restyling a screen on
the layer, and to writing a console bundle; it tells a harness to read the catalogue before writing a
component or a value of its own, and the contract before declaring a bundle.
