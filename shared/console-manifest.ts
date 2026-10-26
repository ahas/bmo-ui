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

// The methods a route a console relays outside the API prefix is named by.
export const RELAY_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export type RelayMethod = (typeof RELAY_METHODS)[number];

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

// A path of the service's own API, from its root: segments of the characters an address carries
// unescaped, none of them a dot or two standing for a folder.
const API_PATH = /^\/(?:(?!\.\.?(?:\/|$))[\w.~-]+(?:\/(?!\.\.?(?:\/|$))[\w.~-]+)*)?$/;

function apiPath(holds: string) {
  return z.string().regex(API_PATH, "a path of the service's API from its root").describe(holds);
}

// The segment of a share read's pattern that stands for the token.
const TOKEN_SEGMENT = "{token}";

// A share read's pattern: a path of the service's API whose segments stand as written or as a placeholder, a
// camelCase name in braces matching any one segment.
const SHARE_PATTERN = /^(?:\/(?:\{[a-z][A-Za-z0-9]*\}|(?!\.\.?(?:\/|$))[\w.~-]+))+$/;

function segmentsOf(path: string): string[] {
  return path.split("/").slice(1);
}

// Whether a path stands under an API prefix: the prefix itself or a path below it.
function under(prefix: string, path: string): boolean {
  return prefix === "/" || path === prefix || path.startsWith(`${prefix}/`);
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
      .describe("The other services the screens call through the console, each by the service name its own manifest gives it."),
    relays: z
      .array(
        z
          .object({
            method: z.enum(RELAY_METHODS).describe("The route's method."),
            path: apiPath("The route's whole path on the service's API.")
          })
          .strict()
      )
      .default([])
      .describe("The service's own routes outside the API prefix that a console relays as well."),
    shareReads: z
      .array(
        z
          .string()
          .regex(SHARE_PATTERN, "a path pattern of the service's API, its placeholders camelCase names in braces")
          .refine((pattern) => segmentsOf(pattern).filter((segment) => segment === TOKEN_SEGMENT).length === 1, {
            message: "a pattern holding {token} once"
          })
      )
      .default([])
      .describe("The reads a share token alone permits: path patterns under the API prefix, each holding {token} once.")
  })
  .strict()
  .refine((one) => one.title.startsWith(`${one.name}.`), { path: ["title"], message: "a key under the bundle's namespace" })
  .refine((one) => !one.calls.includes(one.serviceName), { path: ["calls"], message: "another service than the bundle's own" })
  .refine((one) => new Set(one.calls).size === one.calls.length, { path: ["calls"], message: "each service named once" })
  .refine((one) => new Set(one.relays.map((route) => `${route.method} ${route.path}`)).size === one.relays.length, {
    path: ["relays"],
    message: "each route named once"
  })
  .refine((one) => one.shareReads.every((pattern) => under(one.apiPrefix, pattern)), { path: ["shareReads"], message: "patterns under the API prefix" })
  .refine((one) => new Set(one.shareReads).size === one.shareReads.length, { path: ["shareReads"], message: "each pattern named once" });

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

// Whether a manifest names a route under `relays`: the method, in any letter case, and the whole path.
export function relaysRoute(manifest: ConsoleManifest, method: string, path: string): boolean {
  const asked = method.toUpperCase();

  return manifest.relays.some((route) => route.method === asked && route.path === path);
}

// Whether a method and a path are a share read the manifest names: a `GET` or a `HEAD`, in any letter case, whose
// path a pattern under `shareReads` matches segment by segment, a placeholder matching any one segment that is not
// empty. The path is taken as the call writes it, each segment still escaped.
export function shareRead(manifest: ConsoleManifest, method: string, path: string): boolean {
  const asked = method.toUpperCase();

  if (asked !== "GET" && asked !== "HEAD") return false;

  const segments = segmentsOf(path);

  return manifest.shareReads.some((pattern) => {
    const wanted = segmentsOf(pattern);

    return (
      wanted.length === segments.length &&
      wanted.every((segment, at) => (segment.startsWith("{") ? segments[at] !== "" : segment === segments[at]))
    );
  });
}

// The bundle's words as the service answers them: each locale's tree under the locale's code, every
// key under the bundle's namespace.
export type ConsoleWords = Record<string, Record<string, unknown>>;

// What the bundle's module exports as its default: the routes of its screens, each under the
// manifest's screen path.
export interface ConsoleBundleModule {
  routes: RouteRecordRaw[];
}
