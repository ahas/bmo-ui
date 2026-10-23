import { z } from "zod";

import type { RouteRecordRaw } from "vue-router";

// The console plugin contract's manifest (`docs/console-bundles.md`, "The manifest"). One shape states
// the type, the reading and the JSON Schema a harness is handed, so the three never part. A service
// answers it, a console reads it, and both import it from here.

// The route of a service's own API the manifest is answered at.
export const CONSOLE_MANIFEST_ROUTE = "/console-manifest";

// The headers a console sets on every call and socket it relays, in place of any the browser sent:
// the signed-in login's owner key, and the role the reader holds.
export const OWNER_KEY_HEADER = "Owner-Key";
export const OWNER_ROLE_HEADER = "Owner-Role";

// The roles a reader holds, the one holding more first: an administrator holds every role a member
// holds.
export const CONSOLE_ROLES = ["administrator", "member"] as const;

export type ConsoleRole = (typeof CONSOLE_ROLES)[number];

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

// A path of the service's own API, from its root: segments of the characters an address carries
// unescaped, none of them a dot or two standing for a folder.
const API_PATH = /^\/(?:(?!\.\.?(?:\/|$))[\w.~-]+(?:\/(?!\.\.?(?:\/|$))[\w.~-]+)*)?$/;

function apiPath(holds: string) {
  return z.string().regex(API_PATH, "a path of the service's API from its root").describe(holds);
}

const manifest = z
  .object({
    name: z.string().regex(KEBAB, "a name in kebab-case").describe("The bundle's name: its words' namespace."),
    title: z.string().min(1).describe("The key, in the bundle's words, its screen is named by in the console's menu; under the bundle's namespace."),
    icon: z
      .string()
      .regex(/^i-[a-z0-9]+(?:-[a-z0-9]+)+$/, "an icon as the component library names one")
      .describe("The icon drawn beside the screen's name."),
    screenPath: z
      .string()
      .regex(/^(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)+$/, "a path of kebab-case segments, each led by a slash")
      .describe("The path the bundle's screens stand under."),
    serviceName: z.string().regex(KEBAB, "a name in kebab-case").describe("The service's name, which the console relays it under."),
    bundle: apiPath("The path of the service's API the bundle's module is answered at."),
    stylesheet: apiPath("The path of the service's API the bundle's stylesheet is answered at.").optional(),
    words: apiPath("The path of the service's API the bundle's words are answered at."),
    apiPrefix: apiPath("The path of the service's API every call the screens make stands under.").default("/"),
    role: z.enum(CONSOLE_ROLES).describe("The least role a reader holds to open the screen."),
    ownerKey: z.boolean().default(false).describe("Whether every call the screens make needs the reader's owner key."),
    events: z.boolean().default(false).describe("Whether the screens read the service's event stream."),
    websocket: z.boolean().default(false).describe("Whether the screens open a WebSocket to the service."),
    pushKinds: z
      .array(z.string().regex(/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/, "an event kind, a resource and its change"))
      .default([])
      .describe("The event kinds a console may raise as a notice to a reader not on the screen."),
    calls: z
      .array(z.string().regex(KEBAB, "a name in kebab-case"))
      .default([])
      .describe("The other services the screens call through the console, each by the service name its own manifest gives it.")
  })
  .strict()
  .refine((one) => one.title.startsWith(`${one.name}.`), { path: ["title"], message: "a key under the bundle's namespace" })
  .refine((one) => !one.calls.includes(one.serviceName), { path: ["calls"], message: "another service than the bundle's own" })
  .refine((one) => new Set(one.calls).size === one.calls.length, { path: ["calls"], message: "each service named once" });

// A manifest as a console reads it, every optional field but the stylesheet filled.
export type ConsoleManifest = z.output<typeof manifest>;

// The manifest's JSON Schema, as a service writes its answer.
export const CONSOLE_MANIFEST_SCHEMA: Record<string, unknown> = z.toJSONSchema(manifest, { io: "input" });

// A parsed manifest read with its defaults filled, or refused with each field at fault named.
export function consoleManifest(value: unknown): ConsoleManifest {
  const read = manifest.safeParse(value);

  if (read.success) return read.data;

  const faults = read.error.issues.map((issue) => `${issue.path.join(".") || "the manifest"}: ${issue.message}`);

  throw new Error(`The console manifest does not keep the contract: ${faults.join("; ")}`);
}

// Whether a reader holding one role may open a screen needing another.
export function roleAllows(held: ConsoleRole, needed: ConsoleRole): boolean {
  return CONSOLE_ROLES.indexOf(held) <= CONSOLE_ROLES.indexOf(needed);
}

// Whether a bundle's screens call a service: their own, or one their manifest names under `calls`.
export function screensCall(manifest: ConsoleManifest, serviceName: string): boolean {
  return manifest.serviceName === serviceName || manifest.calls.includes(serviceName);
}

// The bundle's words as the service answers them: each locale's tree under the locale's code, every
// key under the bundle's namespace.
export type ConsoleWords = Record<string, Record<string, unknown>>;

// What the bundle's module exports as its default: the routes of its screens, each under the
// manifest's screen path.
export interface ConsoleBundleModule {
  routes: RouteRecordRaw[];
}
