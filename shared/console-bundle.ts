import { z } from "zod";

// The console plugin contract's declaration (`docs/console-bundles.md`, "The declaration"). One shape
// states the type, the reading and the JSON Schema a harness is handed, so the three never part.

// The file a bundle declares itself in, at its package's root.
export const CONSOLE_BUNDLE_FILE = "console-bundle.json";

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

const declaration = z
  .object({
    name: z.string().regex(KEBAB, "a name in kebab-case").describe("The bundle's name: its words' namespace and its components' prefix."),
    title: z.string().min(1).describe("The key, in the bundle's own pack, of the words its screen is named by; under the bundle's namespace."),
    icon: z
      .string()
      .regex(/^i-[a-z0-9]+(?:-[a-z0-9]+)+$/, "an icon as the component library names one")
      .describe("The icon drawn beside the screen's name."),
    screenPath: z
      .string()
      .regex(/^(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)+$/, "a path of kebab-case segments, each led by a slash")
      .describe("The path the bundle's screens stand under."),
    serviceName: z.string().regex(KEBAB, "a name in kebab-case").describe("The service whose API the screens call."),
    languagePack: z
      .string()
      .regex(/^[\w-][\w.-]*(?:\/[\w-][\w.-]*)*$/, "a folder relative to the package's root, inside it")
      .describe("The folder of the bundle's words, one JSON file to a locale."),
    events: z.boolean().default(false).describe("Whether the screens read the service's event stream."),
    websocket: z.boolean().default(false).describe("Whether the screens open a WebSocket to the service."),
    pushKinds: z
      .array(z.string().regex(/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/, "an event kind, a resource and its change"))
      .default([])
      .describe("The event kinds a console may raise as a notice to a reader not on the screen.")
  })
  .strict()
  .refine((one) => one.title.startsWith(`${one.name}.`), { path: ["title"], message: "a key under the bundle's namespace" });

// A declaration as a console reads it, every optional field filled.
export type ConsoleBundle = z.output<typeof declaration>;

// The declaration's JSON Schema, as a bundle writes its file.
export const CONSOLE_BUNDLE_SCHEMA: Record<string, unknown> = z.toJSONSchema(declaration, { io: "input" });

// A parsed declaration read with its defaults filled, or refused with each field at fault named.
export function consoleBundle(value: unknown): ConsoleBundle {
  const read = declaration.safeParse(value);

  if (read.success) return read.data;

  const faults = read.error.issues.map((issue) => `${issue.path.join(".") || "the declaration"}: ${issue.message}`);

  throw new Error(`The console bundle's declaration does not keep the contract: ${faults.join("; ")}`);
}
