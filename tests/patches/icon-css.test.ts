import { plugin } from "bun";
import { describe, expect, mock, test } from "bun:test";
import { effectScope, nextTick, reactive } from "vue";

// The `@nuxt/icon` patch (`docs/boundary.md`, "The patches"), held on the icon module as it is
// installed: an icon drawn as a stylesheet rule is written under the name it was loaded for, however
// the name has moved on by the time its drawing arrives.

const components = new URL("../../node_modules/@nuxt/icon/dist/runtime/components/", import.meta.url);

// The module reads which side it runs on from what Nuxt's build stands in its place; here it runs in
// the browser.
plugin({
  name: "icon-css-in-the-browser",
  setup(build) {
    build.onLoad({ filter: /@nuxt\/icon\/dist\/runtime\/components\/css\.js$/ }, async ({ path }) => ({
      contents: (await Bun.file(path).text())
        .replaceAll("import.meta.client", "true")
        .replaceAll("import.meta.server", "false")
        .replaceAll("import.meta.dev", "false"),
      loader: "js"
    }));
  }
});

void mock.module("#imports", () => ({
  useAppConfig: () => ({ icon: { cssSelectorPrefix: "i-", cssWherePseudo: true, cssLayer: "base" } }),
  useNuxtApp: () => ({ payload: { data: {} } }),
  useHead: () => undefined,
  useRuntimeConfig: () => ({}),
  onServerPrefetch: () => undefined
}));

// Each drawing is fetched when asked for and arrives when the test lets it.
const arriving = new Map<string, (body: string) => void>();

void mock.module(new URL("shared.js", components).pathname, () => ({
  loadIcon: (name: string) =>
    new Promise((resolve) => {
      arriving.set(name, (body) => resolve({ body, width: 24, height: 24 }));
    }),
  resolveCustomizeFn: () => undefined
}));

const { NuxtIconCss } = (await import(new URL("css.js", components).href)) as {
  NuxtIconCss: { setup: (props: { name: string; customize: null }) => unknown };
};

// The rule written for an icon's name, as the page's head holds it.
function ruleFor(name: string): string | undefined {
  const selector = `.i-test\\:${name}`;

  return Array.from(document.head.querySelectorAll("style"))
    .map((style) => style.textContent ?? "")
    .find((text) => text.includes(selector));
}

describe("an icon drawn as a stylesheet rule", () => {
  test("is written under the name it was loaded for when the name moves on before it arrives", async () => {
    const props = reactive({ name: "test:spinner", customize: null });
    const scope = effectScope();

    scope.run(() => NuxtIconCss.setup(props));
    props.name = "test:pause";
    await nextTick();

    arriving.get("test:spinner")?.("<path d='M1 1'/>");
    await Promise.resolve();
    arriving.get("test:pause")?.("<path d='M2 2'/>");
    await Promise.resolve();
    scope.stop();

    expect(ruleFor("spinner")).toContain("M1 1");
    expect(ruleFor("pause")).toContain("M2 2");
    expect(ruleFor("pause")).not.toContain("M1 1");
  });
});
