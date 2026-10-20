import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

// The package's command as a harness runs it (`docs/harness.md`, "The command" and "The tools"): what
// only the running server shows. What each tool answers is the catalogue module's, tested there.

const command = fileURLToPath(new URL("../../bin/bmo-ui.ts", import.meta.url));

describe("the command", () => {
  test("says what it takes", () => {
    const run = Bun.spawnSync([process.execPath, command, "--help"]);

    expect(run.exitCode).toBe(0);
    expect(run.stdout.toString()).toContain("mcp");
  });

  test("refuses any other word with the same text", () => {
    for (const words of [[], ["serve"], ["mcp", "now"], ["--port", "1"]]) {
      const run = Bun.spawnSync([process.execPath, command, ...words]);

      expect(run.exitCode).toBe(2);
      expect(run.stderr.toString()).toContain("Usage: bmo-ui");
    }
  });
});

describe("the MCP server it starts", () => {
  const client = new Client({ name: "tester", version: "1.0.0" });

  beforeAll(async () => {
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [command, "mcp"], stderr: "pipe" }));
  });

  // Closing the transport ends the server's process, which starts nothing of its own.
  afterAll(async () => {
    await client.close();
  });

  test("lists exactly the four catalogue tools", async () => {
    const { tools } = await client.listTools();

    expect(tools.map((one) => one.name).toSorted()).toEqual(["ui_component", "ui_components", "ui_plugin_contract", "ui_tokens"]);
    expect(tools.every((one) => one.outputSchema !== undefined)).toBe(true);
  });

  test("answers a call with structured content", async () => {
    const answer = await client.callTool({ name: "ui_component", arguments: { name: "ToolBar" } });

    expect(answer.isError).toBeFalsy();
    expect((answer.structuredContent as { name: string }).name).toBe("ToolBar");
  });

  test("answers a refusal in the error shape", async () => {
    const answer = await client.callTool({ name: "ui_tokens", arguments: { group: "shadow" } });
    const [said] = answer.content as { type: string; text: string }[];

    expect(answer.isError).toBe(true);
    expect(JSON.parse(said!.text)).toMatchObject({ code: "not-found" });
  });
});
