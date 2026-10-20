#!/usr/bin/env bun
import { parseArgs } from "node:util";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { uiServer } from "../mcp/server";

// The package's command (`docs/harness.md`, "The command"). `mcp` starts the MCP server on standard
// input and output; `--help` says what the command takes, and any other word is refused with it.

const USAGE = `Usage: bmo-ui <command>

Commands:
  mcp     Start the layer's MCP server on standard input and output.

Options:
  -h, --help  Print this help.
`;

function refused(): never {
  process.stderr.write(USAGE);
  process.exit(2);
}

function read(): ReturnType<typeof parseArgs<{ options: { help: { type: "boolean"; short: "h" } }; allowPositionals: true }>> {
  try {
    return parseArgs({ args: Bun.argv.slice(2), options: { help: { type: "boolean", short: "h" } }, allowPositionals: true });
  } catch {
    return refused();
  }
}

const { values, positionals } = read();

if (values.help === true) {
  process.stdout.write(USAGE);
} else if (positionals.length === 1 && positionals[0] === "mcp") {
  await uiServer().connect(new StdioServerTransport());
} else {
  refused();
}
