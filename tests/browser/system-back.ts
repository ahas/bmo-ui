import type { Page } from "playwright-core";

// The system's back, as the page's browser hands it on.
//
// A browser on Android sends its back to the close watcher made last while one stands, and steps
// back through the history only when none does; every other browser steps back through the history
// alone. The browser driven here has no system back of its own, and the only close request it sends
// is Esc, which the layers module keeps for the library; so a page stands in the watchers it makes
// with ones it keeps a list of, and a press is the close request handed to the one made last, as the
// browser on a phone hands it.

const PRESS = "pressSystemBack";

interface Watcher extends EventTarget {
  destroy(): void;
  requestClose(): void;
}

function standIn(press: string): void {
  const global = window as unknown as Record<string, unknown> & { CloseWatcher?: new () => Watcher };
  const Native = global.CloseWatcher;

  if (press in global) {
    return;
  }

  const live: Watcher[] = [];
  const drop = (watcher: Watcher): void => {
    const at = live.indexOf(watcher);

    if (at !== -1) live.splice(at, 1);
  };

  if (Native !== undefined) {
    global.CloseWatcher = class extends Native {
      constructor() {
        super();
        live.push(this);
        this.addEventListener("close", () => drop(this));
      }

      override destroy(): void {
        drop(this);
        super.destroy();
      }
    };
  }

  global[press] = () => {
    const top = live.at(-1);

    if (top !== undefined && navigator.userAgent.includes("Android")) {
      top.requestClose();
    } else {
      history.back();
    }
  };
}

// Stands the watchers in on the page as it is and on every page it loads after; called before
// anything on the page makes a watcher.
export async function standInSystemBack(page: Page): Promise<void> {
  await page.addInitScript(standIn, PRESS);
  await page.evaluate(standIn, PRESS);
}

// One press of the system's back.
export async function pressSystemBack(page: Page): Promise<void> {
  await page.evaluate((press) => (window as unknown as Record<string, () => void>)[press]!(), PRESS);
}
