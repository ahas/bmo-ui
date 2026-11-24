import { describe, expect, test } from "bun:test";

import { ERROR_CASES, errorKind } from "../../app/domain/error-page";
import { WORDING_KEYS } from "../../shared/wording-keys";

// The case a page's error is said as (`docs/components.md`, "The error page").

describe("the case of a page's error", () => {
  test("is not found for a path no page answers or one that is gone", () => {
    expect(errorKind(404)).toBe("not_found");
    expect(errorKind(410)).toBe("not_found");
  });

  test("is no permission for a refusal, signed in or not", () => {
    expect(errorKind(401)).toBe("forbidden");
    expect(errorKind(403)).toBe("forbidden");
  });

  test("is unreachable for a gateway that reached nothing, and for any error while the browser is offline", () => {
    expect(errorKind(502)).toBe("unreachable");
    expect(errorKind(503)).toBe("unreachable");
    expect(errorKind(504)).toBe("unreachable");
    expect(errorKind(404, true)).toBe("unreachable");
    expect(errorKind(500, true)).toBe("unreachable");
  });

  test("is a failure for every other status and for none", () => {
    expect(errorKind(500)).toBe("failed");
    expect(errorKind(400)).toBe("failed");
    expect(errorKind(418)).toBe("failed");
    expect(errorKind(undefined)).toBe("failed");
  });
});

describe("what each case draws", () => {
  test("names keys the layer's list holds, a title and a line of its own", () => {
    const keys = new Set<string>(WORDING_KEYS);

    for (const shown of Object.values(ERROR_CASES)) {
      expect(keys.has(shown.title)).toBe(true);
      expect(keys.has(shown.line)).toBe(true);
    }

    expect(new Set(Object.values(ERROR_CASES).map((one) => one.title)).size).toBe(4);
    expect(new Set(Object.values(ERROR_CASES).map((one) => one.line)).size).toBe(4);
  });

  test("goes back where nothing is to be asked again, and loads again where it may come", () => {
    expect(ERROR_CASES.not_found.second).toBe("back");
    expect(ERROR_CASES.forbidden.second).toBe("back");
    expect(ERROR_CASES.unreachable.second).toBe("retry");
    expect(ERROR_CASES.failed.second).toBe("retry");
  });

  test("draws a Material Symbols icon of its own", () => {
    const icons = Object.values(ERROR_CASES).map((one) => one.icon);

    expect(icons.every((one) => one.startsWith("i-material-symbols-"))).toBe(true);
    expect(new Set(icons).size).toBe(4);
  });
});
