import { describe, expect, test } from "bun:test";

// The error page, read from the files that ship (`docs/components.md`, "The error page").

const screen = await Bun.file(new URL("../../app/components/ErrorScreen.vue", import.meta.url)).text();
const page = await Bun.file(new URL("../../app/error.vue", import.meta.url)).text();

describe("the layer's error page", () => {
  test("stands in the framework's place with an app root of its own, drawing the screen", () => {
    expect(page).toContain('<UApp :tooltip="TOOLTIP_PROVIDER" :toaster="null">');
    expect(page).toContain('<ErrorScreen :status="error.statusCode"');
  });
});

describe("the error screen", () => {
  test("draws the error's own message and stack in development alone", () => {
    expect(screen).toContain("const development = import.meta.dev;");
    expect(screen).toContain('<details v-if="development && (message || stack)"');
    // Neither stands anywhere else in the template.
    const template = screen.slice(0, screen.indexOf("</template>\n\n<script"));
    const outside = template.replace(/<details[\s\S]*<\/details>/, "");

    expect(outside).not.toContain("{{ message }}");
    expect(outside).not.toContain("{{ stack }}");
  });

  test("puts the second action first and the way to the app's start last, at the row's right end", () => {
    const row = screen.slice(screen.indexOf('<div class="flex flex-wrap justify-end gap-2">'));

    expect(row.indexOf('data-error-action="back"')).toBeLessThan(row.indexOf('data-error-action="home"'));
    expect(row.indexOf('data-error-action="retry"')).toBeLessThan(row.indexOf('data-error-action="home"'));
  });

  test("leaves the error as it goes to the app's start", () => {
    expect(screen).toContain("await clearError({ redirect: props.home });");
  });

  test("leaves the error once the router has gone back", () => {
    expect(screen).toContain('@click="goBack"');
    expect(screen).toMatch(/const moved = router\.afterEach\(\(\) => \{\n    moved\(\);\n    void clearError\(\);\n  \}\);\n\n  router\.back\(\);/);
  });

  test("names everything it uses, so a host that does not extend the layer can draw it", () => {
    expect(screen).toContain('import { computed, onBeforeUnmount, onMounted, ref } from "vue";');
    expect(screen).toContain('import { clearError, useHead } from "#imports";');
  });

  test("offers going back only where the router holds the page before", () => {
    expect(screen).toContain('v-if="shown.second === \'back\' && canGoBack"');
    expect(screen).toContain("(window.history.state as { back?: unknown } | null)?.back === \"string\"");
  });
});
