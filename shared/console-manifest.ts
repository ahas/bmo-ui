import { z } from "zod";

import type { RouteRecordRaw } from "vue-router";

import layer from "./layer.json" with { type: "json" };

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

// The sections of a console's sidebar a bundle's entry stands in: among the services an administrator runs the
// system with, among the applications a reader works in, or in the reader's own menu, among what concerns the
// reader's own account and their use of the console.
export const CONSOLE_SIDEBAR_SECTIONS = ["administration", "application", "account"] as const;

export type ConsoleSidebarSection = (typeof CONSOLE_SIDEBAR_SECTIONS)[number];

// The methods a route a console relays outside the API prefix is named by.
export const RELAY_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export type RelayMethod = (typeof RELAY_METHODS)[number];

// What the layer's version file holds: the version, and in a release's file the bound and the releases
// from it up, which the release verb writes there. A checkout's file names its version alone.
interface LayerFile {
  layer: string;
  bound?: string;
  range?: string[];
  sharedLibraries: string[];
}

const layerFile: LayerFile = layer;

// The version of the layer this module is part of (`docs/console-bundles.md`, "The layer a bundle is
// built on"): a release's version where the layer was installed from the file its release verb wrote,
// the package's version marked `+source` where it was installed from its source.
export const LAYER_VERSION: string = layerFile.layer;

// That release's bound, the oldest release whose bundles still run on it unchanged, and every release
// from the bound up to it in the order they were released, which a console on it attaches bundles of.
// A layer taken from its source is its own bound and attaches its own bundles alone.
export const LAYER_BOUND: string = layerFile.bound ?? layerFile.layer;
export const LAYER_RANGE: readonly string[] = layerFile.range ?? [layerFile.layer];

// The libraries a bundle leaves unbundled and finds as its console's copy, each by its package's path.
export const CONSOLE_SHARED_LIBRARIES: readonly string[] = layerFile.sharedLibraries;

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

// The share head's pattern: a path of the service's API whose segments stand as written, but one that is `{token}`.
const SHARE_HEAD_PATTERN = /^(?:\/(?:\{token\}|(?!\.\.?(?:\/|$))[\w.~-]+))+$/;

// An event kind as the stream names it: a resource and its change.
const EVENT_KIND = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;

// A notice's place pattern: a path of the console's own whose segments stand as written or as a placeholder, a
// camelCase name in braces matching any one segment.
const PLACE_PATTERN = SHARE_PATTERN;

// A member's field a manifest names: a camelCase name.
const FIELD_NAME = /^[a-z][A-Za-z0-9]*$/;

// A placeholder segment of a pattern, and the field it names.
const PLACEHOLDER_SEGMENT = /^\{([a-z][A-Za-z0-9]*)\}$/;

// A screen path: one or more kebab-case segments, each led by a slash.
const SCREEN_PATH = /^(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

function screenPath(holds: string) {
  return z.string().regex(SCREEN_PATH, "a path of kebab-case segments, each led by a slash").describe(holds);
}

function segmentsOf(path: string): string[] {
  return path.split("/").slice(1);
}

// Whether a path stands under an API prefix: the prefix itself or a path below it.
function under(prefix: string, path: string): boolean {
  return prefix === "/" || path === prefix || path.startsWith(`${prefix}/`);
}

// Whether a path stands at or below a screen path.
function atOrBelow(screen: string, path: string): boolean {
  return path === screen || path.startsWith(`${screen}/`);
}

// Whether either of two screen paths stands at or below the other.
function overlap(one: string, other: string): boolean {
  return atOrBelow(one, other) || atOrBelow(other, one);
}

const manifest = z
  .object({
    name: z.string().regex(KEBAB, "a name in kebab-case").describe("The bundle's name: its words' namespace."),
    title: z.string().min(1).describe("The key, in the bundle's words, its screen is named by in the console's menu; under the bundle's namespace."),
    icon: z
      .string()
      .regex(/^i-[a-z0-9]+(?:-[a-z0-9]+)+$/, "an icon as the component library names one")
      .describe("The icon drawn beside the screen's name."),
    screenPath: screenPath("The path the bundle's screens stand under."),
    formerScreenPaths: z
      .array(screenPath("A path the bundle's screens stood under before."))
      .default([])
      .describe("The paths the bundle's screens stood under before; a console answers every address under one as moved to the screen path."),
    serviceName: z.string().regex(KEBAB, "a name in kebab-case").describe("The service's name, which the console relays it under; never people, the name the console answers the company's members under itself."),
    layer: z.string().min(1, "the layer's version the bundle build wrote").describe("The version of the layer the bundle was built on, as the bundle build wrote it."),
    bundle: apiPath("The path of the service's API the bundle's module is answered at."),
    stylesheet: apiPath("The path of the service's API the bundle's stylesheet is answered at.").optional(),
    words: apiPath("The path of the service's API the bundle's words are answered at."),
    apiPrefix: apiPath("The path of the service's API every call the screens make stands under.").default("/"),
    role: z.enum(CONSOLE_ROLES).describe("The least role a reader holds to open the screen."),
    sidebarSection: z
      .enum(CONSOLE_SIDEBAR_SECTIONS)
      .default("application")
      .describe("The section of a console's sidebar the bundle's entry stands in: administration, among the services an administrator runs the system with, application, among the applications a reader works in, or account, in the reader's own menu."),
    sidebarSections: z
      .partialRecord(z.enum(CONSOLE_ROLES), z.enum(CONSOLE_SIDEBAR_SECTIONS))
      .default({})
      .describe("The section the entry stands in for a reader by the role they hold, where it is not the sidebarSection: each key a role, each value a section."),
    ownerKey: z.boolean().default(false).describe("Whether every call the screens make needs the reader's owner key."),
    events: z.boolean().default(false).describe("Whether the screens read the service's event stream."),
    websocket: z.boolean().default(false).describe("Whether the screens open a WebSocket to the service."),
    pushKinds: z
      .array(z.string().regex(EVENT_KIND, "an event kind, a resource and its change"))
      .default([])
      .describe("The event kinds a console may raise as a notice to a reader not on the screen."),
    pushPlaces: z
      .record(
        z.string().regex(EVENT_KIND, "an event kind, a resource and its change"),
        z.string().regex(PLACE_PATTERN, "a path pattern of the console's, its placeholders camelCase names in braces")
      )
      .default({})
      .describe("The place on the screen a notice of a kind under pushKinds opens, by kind: a path pattern at or below the screen path, its placeholders filled from the event's member."),
    pushReaders: z
      .record(
        z.string().regex(EVENT_KIND, "an event kind, a resource and its change"),
        z.union([
          z.object({ role: z.enum(CONSOLE_ROLES).describe("The role every reader the notice rings holds.") }).strict(),
          z
            .object({
              field: z
                .string()
                .regex(FIELD_NAME, "a field in camelCase")
                .describe("The member's field holding the account key of the one reader the notice rings.")
            })
            .strict()
        ])
      )
      .default({})
      .describe("The readers a notice of a kind under pushKinds rings, by kind: those holding a role, or the one account a field of the event's member names; every reader the manifest's role allows where a kind names none."),
    sidebarUnread: z
      .object({
        path: apiPath("The path of the service's API the count is answered at."),
        field: z
          .string()
          .regex(FIELD_NAME, "a field in camelCase")
          .describe("The answer's field holding the count, a whole number nought or more.")
      })
      .strict()
      .optional()
      .describe("The route a console reads a sidebar unread count from, and the field of its answer that holds it."),
    calls: z
      .array(z.string().regex(KEBAB, "a name in kebab-case"))
      .default([])
      .describe("The other services the screens call through the console, each by the service name its own manifest gives it, or people, the company's members the console answers itself."),
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
      .describe("The reads a share token alone permits: path patterns under the API prefix, each holding {token} once."),
    shareHead: z
      .string()
      .regex(SHARE_HEAD_PATTERN, "a path pattern of the service's API, its one placeholder {token}")
      .refine((pattern) => segmentsOf(pattern).filter((segment) => segment === TOKEN_SEGMENT).length === 1, {
        message: "a pattern holding {token} once"
      })
      .optional()
      .describe("The read a console asks for what a share address reads as before it is opened: a path pattern under the API prefix holding {token} once.")
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
  .refine((one) => new Set(one.shareReads).size === one.shareReads.length, { path: ["shareReads"], message: "each pattern named once" })
  .refine((one) => one.shareHead === undefined || under(one.apiPrefix, one.shareHead), { path: ["shareHead"], message: "a pattern under the API prefix" })
  .refine((one) => Object.keys(one.pushPlaces).every((kind) => one.pushKinds.includes(kind)), {
    path: ["pushPlaces"],
    message: "places of kinds under pushKinds"
  })
  .refine((one) => Object.keys(one.pushReaders).every((kind) => one.pushKinds.includes(kind)), {
    path: ["pushReaders"],
    message: "readers of kinds under pushKinds"
  })
  .refine((one) => Object.values(one.pushPlaces).every((pattern) => atOrBelow(one.screenPath, pattern)), {
    path: ["pushPlaces"],
    message: "patterns at or below the screen path"
  })
  .refine((one) => one.formerScreenPaths.every((former) => !overlap(former, one.screenPath)), {
    path: ["formerScreenPaths"],
    message: "paths neither the screen path nor under or over it"
  })
  .refine((one) => one.formerScreenPaths.every((former, at) => one.formerScreenPaths.every((other, there) => at === there || !overlap(former, other))), {
    path: ["formerScreenPaths"],
    message: "each path named once, none under or over another"
  })
  .refine((one) => one.sidebarUnread === undefined || under(one.apiPrefix, one.sidebarUnread.path), {
    path: ["sidebarUnread"],
    message: "a path under the API prefix"
  });

// A manifest as a console reads it, every optional field that states a default filled.
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

// Whether a bundle was built on a release inside the range of the layer this module is part of, the one a
// console attaches it by; a range is handed in where another release's is read.
export function onThisLayer(manifest: ConsoleManifest, range: readonly string[] = LAYER_RANGE): boolean {
  return range.includes(manifest.layer);
}

// Whether a reader holding one role may open a screen needing another.
export function roleAllows(held: ConsoleRole, needed: ConsoleRole): boolean {
  return CONSOLE_ROLES.indexOf(held) <= CONSOLE_ROLES.indexOf(needed);
}

// The section a bundle's entry stands in for a reader holding a role: the section the manifest names for that role, else
// its sidebar section.
export function sectionFor(manifest: ConsoleManifest, held: ConsoleRole): ConsoleSidebarSection {
  return manifest.sidebarSections[held] ?? manifest.sidebarSection;
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

// What a placeholder of a share read's pattern matches: one segment that is not empty and does not read, plain or
// escaped, as a dot or two.
function placeholderMatches(segment: string): boolean {
  let read: string;

  try {
    read = decodeURIComponent(segment);
  } catch {
    read = segment;
  }

  return segment !== "" && read !== "." && read !== "..";
}

// Whether a method and a path are a share read the manifest names: a `GET` or a `HEAD`, in any letter case, whose
// path a pattern under `shareReads` matches segment by segment, a placeholder matching any one segment
// `placeholderMatches` lets through. The path is taken as the call writes it, each segment still escaped.
export function shareRead(manifest: ConsoleManifest, method: string, path: string): boolean {
  const asked = method.toUpperCase();

  if (asked !== "GET" && asked !== "HEAD") return false;

  const segments = segmentsOf(path);

  return manifest.shareReads.some((pattern) => {
    const wanted = segmentsOf(pattern);

    return (
      wanted.length === segments.length &&
      wanted.every((segment, at) => (segment.startsWith("{") ? placeholderMatches(segments[at]!) : segment === segments[at]))
    );
  });
}

// The query naming the language a console asks a share head in: the primary language subtag of the language it shows
// its pages in.
export const SHARE_HEAD_LANGUAGE_QUERY = "language";

// The path a console asks a manifest's share head at for a token, the token taken as the share address writes it, one
// segment still escaped; null where the manifest names no share head, or the token is no segment a placeholder
// matches.
export function shareHeadPath(manifest: ConsoleManifest, token: string): string | null {
  if (manifest.shareHead === undefined || /[/?#]/.test(token) || !placeholderMatches(token)) return null;

  return segmentsOf(manifest.shareHead)
    .map((segment) => `/${segment === TOKEN_SEGMENT ? token : segment}`)
    .join("");
}

// An address a page is reached at from anywhere: an absolute http or https address.
function publicAddress(value: string): boolean {
  try {
    const read = new URL(value);

    return read.protocol === "https:" || read.protocol === "http:";
  } catch {
    return false;
  }
}

// What a share address reads as before it is opened, as a service answers its share head: data a console writes
// into the head of the page it serves there, never markup. Fields the shape does not name are let go.
const head = z.object({
  title: z.string().min(1).describe("What the page names its resource by."),
  description: z.string().min(1).optional().describe("What a card says of the resource."),
  image: z
    .string()
    .regex(API_PATH, "a path of the service's API from its root")
    .optional()
    .describe("The resource's picture, as the path of a share read the manifest names, carrying the token."),
  url: z.string().refine(publicAddress, "an absolute http or https address").describe("The share address's whole public address."),
  locale: z
    .string()
    .regex(/^[a-z]{2,3}_[A-Z]{2}$/, "a locale as Open Graph writes one: a language and a region joined by an underscore")
    .describe("The locale of the language the page is shown in."),
  siteName: z.string().min(1).describe("The name the card stands under."),
  type: z
    .string()
    .regex(/^[a-z][a-z0-9_.:-]*$/, "an Open Graph type")
    .describe("The Open Graph type of the resource."),
  kind: z.string().min(1).optional().describe("The word the page names the resource's kind by.")
});

// A share head as a console reads it.
export type ShareHead = z.output<typeof head>;

// A share head's answer read, or refused with each field at fault named.
export function shareHead(value: unknown): ShareHead {
  const read = head.safeParse(value);

  if (read.success) return read.data;

  const faults = read.error.issues.map((issue) => `${issue.path.join(".") || "the head"}: ${issue.message}`);

  throw new Error(`The share head does not keep the contract: ${faults.join("; ")}`);
}

// A member's field as a place carries it: text that holds more than blanks and is no dot or two standing for a folder,
// or a finite number; null for anything else.
function placeField(member: Readonly<Record<string, unknown>>, name: string): string | null {
  const value = Object.hasOwn(member, name) ? member[name] : undefined;

  if (typeof value === "string") return value.trim() === "" || value === "." || value === ".." ? null : value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);

  return null;
}

// The place a notice of a kind opens, read as a console's own path from the app's base path: the manifest's place
// pattern for the kind with each placeholder replaced by the member's field of its name, escaped as one segment, or the
// screen path where the manifest names no place for the kind or a placeholder's field is absent, empty or neither text
// nor a number.
export function noticePlace(manifest: ConsoleManifest, kind: string, member: Readonly<Record<string, unknown>>): string {
  const pattern = Object.hasOwn(manifest.pushPlaces, kind) ? manifest.pushPlaces[kind] : undefined;

  if (pattern === undefined) return manifest.screenPath;

  const segments: string[] = [];

  for (const segment of segmentsOf(pattern)) {
    const name = PLACEHOLDER_SEGMENT.exec(segment)?.[1];
    const field = name === undefined ? segment : placeField(member, name);

    if (field === null) return manifest.screenPath;

    segments.push(name === undefined ? field : encodeURIComponent(field));
  }

  return `/${segments.join("/")}`;
}

// The readers a notice of a kind rings: those holding a role, the one account a field of the member names, or every
// reader the manifest's role allows. A field that holds no account key, absent, empty or neither text nor a whole
// number, rings nobody.
export type NoticeReaders = { role: ConsoleRole } | { account: string | null } | { allowed: ConsoleRole };

export function noticeReaders(manifest: ConsoleManifest, kind: string, member: Readonly<Record<string, unknown>>): NoticeReaders {
  const named = Object.hasOwn(manifest.pushReaders, kind) ? manifest.pushReaders[kind] : undefined;

  if (named === undefined) return { allowed: manifest.role };
  if ("role" in named) return { role: named.role };

  const value = Object.hasOwn(member, named.field) ? member[named.field] : undefined;

  if (typeof value === "string" && /^[0-9]+$/.test(value)) return { account: value };
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return { account: String(value) };

  return { account: null };
}

// The address a path under one of the manifest's former screen paths moved to: the same path with that former screen
// path replaced by the screen path, the query kept as it stands; null where the path stands under none of them. The
// path is read as a console's own, from the app's base path, its query after a `?` where it carries one.
export function movedScreenAddress(manifest: ConsoleManifest, address: string): string | null {
  const split = address.indexOf("?");
  const path = split === -1 ? address : address.slice(0, split);
  const query = split === -1 ? "" : address.slice(split);
  const former = manifest.formerScreenPaths.find((one) => atOrBelow(one, path));

  return former === undefined ? null : `${manifest.screenPath}${path.slice(former.length)}${query}`;
}

// The bundle's words as the service answers them: each locale's tree under the locale's code, every
// key under the bundle's namespace.
export type ConsoleWords = Record<string, Record<string, unknown>>;

// What the bundle's module exports as its default: the routes of its screens, each under the
// manifest's screen path.
export interface ConsoleBundleModule {
  routes: RouteRecordRaw[];
}
