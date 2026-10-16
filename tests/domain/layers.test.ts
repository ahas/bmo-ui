import { afterEach, describe, expect, test } from "bun:test";

import { closeLayer, handlePop, holdHistory, layerCount, openLayer, stepsLanded } from "~/domain/layers";

import type { LayerHistory } from "~/domain/layers";

// The back gesture is read against a history of this test's own: the entries it holds, where it
// stands among them, and what arrives when a press takes it back one. A press in a browser lands
// in the same handler, so what is exercised here is the whole of the rule.

interface Browser extends LayerHistory {
  entries: { state: unknown; href: string }[];
  at: number;
  // A press of the back button, as the browser answers it.
  press: () => void;
  // A link followed, which is the router pushing an address of its own.
  follow: (href: string) => void;
  // A press of the forward button, for what is left standing in front after a close.
  forward: () => void;
}

function browser(start = "https://example.test/page/1"): Browser {
  const stand: Browser = {
    entries: [{ state: { position: 0 }, href: start }],
    at: 0,
    pushState(state) {
      stand.entries.splice(stand.at + 1);
      stand.entries.push({ state, href: stand.href });
      stand.at += 1;
    },
    back() {
      stand.press();
    },
    press() {
      if (stand.at === 0) {
        return;
      }

      stand.at -= 1;
      handlePop(stand.entries[stand.at]?.state);
    },
    forward() {
      if (stand.at >= stand.entries.length - 1) {
        return;
      }

      stand.at += 1;
      handlePop(stand.entries[stand.at]?.state);
    },
    follow(href) {
      stand.entries.splice(stand.at + 1);
      stand.entries.push({ state: { position: stand.at + 1 }, href });
      stand.at += 1;
    },
    get state() {
      return stand.entries[stand.at]?.state;
    },
    get href() {
      return stand.entries[stand.at]?.href as string;
    }
  };

  holdHistory(stand);

  return stand;
}

afterEach(() => holdHistory(null));

describe("a layer standing over the screen", () => {
  test("puts an entry of the app's own in front of the page", () => {
    const now = browser();

    openLayer(() => undefined);

    expect(now.entries).toHaveLength(2);
    expect(now.href).toBe("https://example.test/page/1");
    expect(layerCount()).toBe(1);
  });

  test("is closed by the back gesture, and the page is not left", () => {
    const now = browser();
    let open = true;

    openLayer(() => (open = false));
    now.press();

    expect(open).toBe(false);
    expect(layerCount()).toBe(0);
    // Back at the page's own entry: the press closed the layer and moved nothing else.
    expect(now.at).toBe(0);
    expect(now.href).toBe("https://example.test/page/1");
  });

  test("takes its entry back when it is closed some other way, so nothing is left to press through", () => {
    const now = browser();
    const id = openLayer(() => undefined);

    closeLayer(id);

    expect(layerCount()).toBe(0);
    // Back at the page's own entry. The entry itself stands on as the one in front, which is
    // what a browser does with anything gone back from.
    expect(now.at).toBe(0);
  });

  test("and going forward onto that entry lands back on the page rather than on nothing", () => {
    const now = browser();
    const id = openLayer(() => undefined);

    closeLayer(id);
    now.forward();

    expect(now.at).toBe(0);
    expect(now.href).toBe("https://example.test/page/1");
    expect(layerCount()).toBe(0);
  });

  test("and a press after that is the reader's own, which this rule does not touch", () => {
    const now = browser();
    const id = openLayer(() => undefined);

    closeLayer(id);
    now.press();

    // Nothing of this app's stands in the way; the browser leaves the page on its own.
    expect(layerCount()).toBe(0);
    expect(now.at).toBe(0);
  });
});

describe("two layers standing at once", () => {
  test("come off one press apiece, the top one first", () => {
    const now = browser();
    const closed: string[] = [];

    openLayer(() => closed.push("sheet"));
    openLayer(() => closed.push("dialog"));

    expect(now.entries).toHaveLength(3);

    now.press();
    expect(closed).toEqual(["dialog"]);
    expect(layerCount()).toBe(1);

    now.press();
    expect(closed).toEqual(["dialog", "sheet"]);
    expect(layerCount()).toBe(0);
    expect(now.at).toBe(0);
  });
});

describe("a layer left behind by a navigation", () => {
  test("does not drag the reader back off the page they asked for", () => {
    const now = browser();
    const id = openLayer(() => undefined);

    // A link inside the drawer: the router pushes the new address, and the drawer goes with the
    // screen it was standing on.
    now.follow("https://example.test/page/2");
    closeLayer(id);

    expect(now.href).toBe("https://example.test/page/2");
    expect(now.at).toBe(2);
  });

  test("and its entry is stepped over on the way back rather than standing as a place", () => {
    const now = browser();
    const id = openLayer(() => undefined);

    now.follow("https://example.test/page/2");
    closeLayer(id);

    // One press from the page that was navigated to: the entry left behind holds the first
    // page's address, and the press goes on past it to that page's own entry.
    now.press();

    expect(now.at).toBe(0);
    expect(now.href).toBe("https://example.test/page/1");
  });
});

describe("a jump that is a step of its own", () => {
  // Going to where a name is declared is not something standing over the screen: it is another
  // place, so its entry carries no mark of this module's and a press goes back to where the reader
  // was rather than over it.
  test("is a place of the reader's own, and a press goes back to what they were reading", () => {
    const now = browser("https://example.test/code?path=a.ts&line=10");

    now.follow("https://example.test/code?path=b.ts&line=42");
    now.press();

    expect(layerCount()).toBe(0);
    expect(now.at).toBe(0);
    expect(now.href).toBe("https://example.test/code?path=a.ts&line=10");
  });

  test("and one made from a list standing over the screen leaves that list's step behind, not in the way", () => {
    const now = browser("https://example.test/code?path=a.ts&line=10");
    const id = openLayer(() => undefined);

    // The list is let go only once the router is done, so its entry stays where the navigation
    // left it; the press steps over it to the place the reader jumped from.
    now.follow("https://example.test/code?path=b.ts&line=42");
    closeLayer(id);
    now.press();

    expect(layerCount()).toBe(0);
    expect(now.href).toBe("https://example.test/code?path=a.ts&line=10");
  });
});

describe("a step back taken by a close", () => {
  // A browser lands a step back a moment after it is asked for. This one holds each step until
  // the test lands it, which is the moment a navigation begun just after the close falls into.
  function lagging(): Browser & { land: () => void } {
    const now = browser() as Browser & { land: () => void };
    let asked = 0;

    now.back = () => {
      asked += 1;
    };
    now.land = () => {
      for (; asked > 0; asked -= 1) {
        now.at -= 1;
        handlePop(now.entries[now.at]?.state);
      }
    };

    return now;
  }

  test("holds a navigation until it has landed, so the move is not cancelled by it", async () => {
    const now = lagging();
    let went = false;

    closeLayer(openLayer(() => undefined));

    const waiting = stepsLanded().then(() => {
      went = true;
    });

    await Promise.resolve();
    expect(went).toBe(false);

    now.land();
    await waiting;

    expect(went).toBe(true);
  });

  test("and holds nothing when no step is on its way", async () => {
    browser();

    let went = false;

    await stepsLanded().then(() => {
      went = true;
    });

    expect(went).toBe(true);
  });
});

describe("a layer opened in the press that closed another", () => {
  // A menu's choice that opens a dialog: the menu's step back is still on its way when the dialog
  // opens, and the dialog's entry must not be the one that step takes away.
  test("waits for the step back to land before its entry goes in", () => {
    const now = browser();
    let asked = 0;

    now.back = () => {
      asked += 1;
    };

    closeLayer(openLayer(() => undefined));
    openLayer(() => undefined);

    // The step is asked for; nothing is pushed over the entry it is about to take.
    expect(asked).toBe(1);
    expect(now.entries).toHaveLength(2);

    now.at -= 1;
    handlePop(now.entries[now.at]?.state);

    expect(now.at).toBe(1);
    expect(now.entries).toHaveLength(2);
    expect(layerCount()).toBe(1);
  });

  test("and one press then closes the dialog and leaves the page standing", () => {
    const now = browser();
    let asked = 0;
    let open = true;

    now.back = () => {
      asked += 1;
    };

    closeLayer(openLayer(() => undefined));
    openLayer(() => (open = false));
    now.at -= 1;
    handlePop(now.entries[now.at]?.state);
    now.back = () => now.press();
    now.press();

    expect(open).toBe(false);
    expect(now.at).toBe(0);
    expect(now.href).toBe("https://example.test/page/1");
  });
});

describe("an entry whose layer no longer stands", () => {
  test("is stepped over when a press reaches it under a layer closed above it", () => {
    const now = browser();
    const closed: string[] = [];
    const menu = openLayer(() => closed.push("menu"));

    openLayer(() => closed.push("dialog"));
    // The menu goes while the dialog stands over it, so its entry is buried rather than taken back.
    closeLayer(menu);
    now.press();

    // One press closes the dialog and goes on past the menu's entry to the page's own.
    expect(closed).toEqual(["dialog"]);
    expect(now.at).toBe(0);
    expect(layerCount()).toBe(0);
  });

  test("is stepped over when it is one written before the page was loaded again", () => {
    const now = browser();

    now.entries.push({ state: { bmoLayer: "earlier:1" }, href: now.href });
    now.at = 1;
    openLayer(() => undefined);
    now.press();
    now.press();

    // The second press lands on the old entry, whose number belongs to another load, and goes past it.
    expect(now.at).toBe(0);
  });
});

describe("a press with nothing standing", () => {
  test("closes nothing and is left to the browser", () => {
    const now = browser();

    now.press();

    expect(layerCount()).toBe(0);
    expect(now.at).toBe(0);
  });
});
