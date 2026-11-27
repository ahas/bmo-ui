import { readdirSync } from "node:fs";

import { describe, expect, test } from "bun:test";

import { CatalogueError, component, components, pluginContract, tokens } from "../../catalogue/catalogue";
import { CATALOGUE_FILE, catalogueText, exampleNames } from "../../catalogue/generate";
import { CONSOLE_MANIFEST_ROUTE, CONSOLE_MANIFEST_SCHEMA } from "../../shared/console-manifest";

// The catalogue the MCP server's tools answer from (`docs/harness.md`, "The catalogue").

const shipped = readdirSync(new URL("../../app/components/", import.meta.url))
  .filter((one) => one.endsWith(".vue"))
  .map((one) => one.slice(0, -".vue".length))
  .sort();

function refusal(call: () => unknown): string {
  try {
    call();
  } catch (error) {
    if (error instanceof CatalogueError) return error.code;

    throw error;
  }

  throw new Error("the call was answered");
}

describe("the catalogue's data file", () => {
  test("is what the layer's sources give", async () => {
    expect(await Bun.file(CATALOGUE_FILE).text()).toBe(catalogueText());
  });

  test("draws on one example for every component the layer ships, and none for another", () => {
    expect(exampleNames()).toEqual(shipped);
  });
});

describe("the list", () => {
  test("holds every component and page plugin, each with its line", () => {
    const { items, more } = components();

    expect(more).toBe(false);
    expect(items.filter((one) => one.kind === "component").map((one) => one.name).toSorted()).toEqual(shipped);
    expect(items.filter((one) => one.kind === "page-plugin").map((one) => one.name)).toContain("overlays");
    expect(items.every((one) => one.line.length > 0)).toBe(true);
  });

  test("narrows by the words given, in a name or a line", () => {
    const names = components("table").items.map((one) => one.name);

    expect(names).toContain("DataTable");
    expect(names).toContain("DataTableSkeleton");
    expect(names).not.toContain("TabBar");
    expect(components("back gesture").items.map((one) => one.name)).toEqual(["overlays"]);
  });
});

describe("one component", () => {
  test("answers its props, slots, events and example", () => {
    const bar = component("TabBar");

    expect(bar.props.find((one) => one.name === "tabs")).toEqual({ name: "tabs", type: "readonly BarTab[]", required: true });
    expect(bar.props.find((one) => one.name === "pinnable")?.default).toBe("true");
    expect(bar.slots.map((one) => one.name)).toContain("actions");
    expect(bar.events.map((one) => one.name)).toContain("update:active");
    expect(bar.example).toStartWith("<TabBar ");
  });

  test("is refused where the name is no component's", () => {
    expect(refusal(() => component("overlays"))).toBe("not-found");
    expect(refusal(() => component("Calendar"))).toBe("not-found");
  });
});

describe("the tokens", () => {
  test("answer each property in both modes, by who states it", () => {
    const all = tokens().tokens;

    expect(all["--ui-text-dimmed"]).toEqual({ group: "text", light: "var(--ui-color-neutral-400)", dark: "var(--ui-color-neutral-500)", source: "library" });
    expect(all["--ui-text-muted"]).toEqual({ group: "text", light: "var(--ui-color-neutral-600)", dark: "var(--ui-color-neutral-400)", source: "layer" });
    expect(all["--ui-container"]).toEqual({ group: "container", light: "48rem", dark: "48rem", source: "layer" });
    expect(all["--bmo-focus"]?.dark).toBe("var(--ui-color-primary-400)");
  });

  test("narrow to one group, and refuse a group none is in", () => {
    expect(Object.keys(tokens("motion").tokens)).toEqual(["--bmo-motion-quick", "--bmo-motion-pop", "--bmo-motion-stagger", "--bmo-motion-unfold"].toSorted());
    expect(refusal(() => tokens("shadow"))).toBe("not-found");
  });
});

describe("the plugin contract", () => {
  test("answers the manifest's route, its schema and the contract's document", () => {
    const { contract } = pluginContract();

    expect(contract.route).toBe(CONSOLE_MANIFEST_ROUTE);
    expect(contract.manifest).toEqual(CONSOLE_MANIFEST_SCHEMA);
    expect(contract.document).toStartWith("# The console plugin contract\n");
  });
});
