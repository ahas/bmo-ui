import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { CatalogueError, component, components, pluginContract, tokens } from "../catalogue/catalogue";

import manifest from "../package.json";

// The layer's MCP server (`docs/harness.md`, "The tools"): four tools, each a thin call of one
// function of the catalogue module. What a call answers goes out both as the tool's structured
// content and as its text; a refusal goes out in the common wire format's error shape.

type Answer = { content: { type: "text"; text: string }[]; structuredContent?: Record<string, unknown>; isError?: boolean };

function answered(call: () => object): Answer {
  try {
    const value = call() as Record<string, unknown>;

    return { content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value };
  } catch (error) {
    const refusal = error instanceof CatalogueError ? { code: error.code, error: error.message } : { code: "failed", error: String(error) };

    return { content: [{ type: "text", text: JSON.stringify(refusal) }], isError: true };
  }
}

const part = z.object({ name: z.string(), type: z.string() });
const token = z.object({ group: z.string(), light: z.string(), dark: z.string(), source: z.enum(["layer", "library"]) });

export function uiServer(): McpServer {
  const server = new McpServer({ name: manifest.name, version: manifest.version });

  server.registerTool(
    "ui_components",
    {
      description: "The layer's common components and page plugins, each with one line. Read it before writing a component of your own.",
      inputSchema: { q: z.string().nullable().optional().describe("Words to narrow the list by.") },
      outputSchema: {
        items: z.array(z.object({ name: z.string(), kind: z.enum(["component", "page-plugin"]), line: z.string() })),
        more: z.boolean()
      }
    },
    ({ q }) => answered(() => components(q))
  );

  server.registerTool(
    "ui_component",
    {
      description: "One component: its props, slots, events and an example of its use.",
      inputSchema: { name: z.string().describe("The component's name, as ui_components lists it.") },
      outputSchema: {
        name: z.string(),
        line: z.string(),
        props: z.array(z.object({ name: z.string(), type: z.string(), required: z.boolean(), default: z.string().optional(), description: z.string().optional() })),
        slots: z.array(part),
        events: z.array(part),
        example: z.string()
      }
    },
    ({ name }) => answered(() => component(name))
  );

  server.registerTool(
    "ui_tokens",
    {
      description: "The design tokens: colours, type, spacing, radii and motion, each in the light mode and the dark.",
      inputSchema: { group: z.string().nullable().optional().describe("One group's name, the first word of a token past its namespace.") },
      outputSchema: { tokens: z.record(z.string(), token) }
    },
    ({ group }) => answered(() => tokens(group))
  );

  server.registerTool(
    "ui_plugin_contract",
    {
      description: "The console plugin contract a service publishes its console bundle and manifest by.",
      inputSchema: {},
      outputSchema: {
        contract: z.object({ route: z.string(), manifest: z.record(z.string(), z.unknown()), document: z.string() })
      }
    },
    () => answered(() => pluginContract())
  );

  return server;
}
