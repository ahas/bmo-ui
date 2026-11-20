import type { Ref } from "vue";

// What the back gesture does while something stands over the screen. On a phone, back is how a
// person closes what is on top of what they were reading — a dialog, a sheet, a menu, a list
// dropped from a control, the mode a screen went into — and a page that answers it by leaving
// the page instead loses their place for a press that was never about the page.
//
// So every such thing registers here while it stands, and the back gesture takes the top one
// off. What is registered is the layer's own way of closing itself: nothing here reaches into a
// screen. Everything the component library floats over the page registers itself through the
// watch in the overlays module, and a screen registers here only what the library does not draw —
// a mode like picking messages, which is a place the screen has gone into rather than a thing
// drawn on top of it, or a view taken over the whole window.
//
// A tooltip is not a layer: it answers the pointer and the keyboard's focus rather than a press,
// and it is gone the moment either moves on.
//
// The gesture reaches a layer by one of two roads, chosen for the page. Where the system's back is
// a close request the page can hear, each layer stands with a close watcher of its own and the
// history is never touched, so opening and closing a layer leaves it exactly as it was. Everywhere
// else back is only a step through the history, so the gesture is trapped with an entry of this
// app's own, pushed when a layer opens and taken back when it closes, and the press that would have
// left the page lands on that entry instead; the entry stepped back from stays ahead of the page,
// since a browser removes a forward entry only by pushing over it. Either way the address never
// changes: what is open is not a place, and a reload or a shared link should not try to open one.

// What a layer holds of the road that hears it, let go of once the layer no longer stands.
interface Hold {
  // Whether the layer stood at the top of the stack when it was let go of.
  letGo: (top: boolean) => void;
}

interface Layer {
  id: number;
  close: () => void;
  hold: Hold;
}

// The road the gesture takes to the layers: it sets a standing layer up to be heard.
interface BackRoad {
  hold: (layer: Layer) => Hold;
}

// The mark this app writes on the entries it pushes, so an entry of its own is known again when
// the reader arrives back at one. Its value names the layer, prefixed with this page load's own
// token, since the entries of a load before a reload are still in the history and their numbers
// would otherwise be taken for the new load's.
const MARK = "bmoLayer";
const LOAD = Math.random().toString(36).slice(2, 10);

function markOf(id: number): string {
  return `${LOAD}:${id}`;
}

const stack: Layer[] = [];

// Whether a pop this module caused itself by taking an entry back is still on its way: one when it
// is, nought otherwise. Such a pop is not the reader's press and closes nothing.
let ignoring = 0;

// Steps back asked for while one was still on its way. A browser is asked for one step at a time: a
// second asked for before the first has landed is dropped by some, and where it does land the
// router, told to let one pop pass, reads the other as the reader's own. So each waits its turn.
let owed = 0;

// Takes one step back, or leaves it owed while another is on its way.
function step(): void {
  if (ignoring > 0) {
    owed += 1;

    return;
  }

  ignoring = 1;
  history().back();
}

// What waits for those pops to land. The browser lands a step back a moment after it is asked
// for, and a navigation begun in that moment would be cancelled by it; so a navigation waits here
// until every step this module asked for has landed.
let landing: Array<() => void> = [];

// How long a navigation waits for a step back before it goes anyway. A step lands within a frame
// or two; one that never arrives must not hold the screen still for ever.
const LANDING_WAIT_MS = 1000;

function landed(): void {
  const waiting = landing;

  landing = [];

  for (const resolve of waiting) {
    resolve();
  }
}

// Resolves once no step back of this module's is still on its way.
export function stepsLanded(): Promise<void> {
  if (ignoring === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timer = setTimeout(resolve, LANDING_WAIT_MS);

    landing.push(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

// Whether a close is being run by the gesture itself, in which case the entry is already gone
// and must not be taken back a second time.
let closing = false;

let listening = false;
let counted = 0;

// How a step back is taken: through the router once it is at hand, told to let the pop pass
// unread; before that there is no navigation for the pop to cancel.
let stepBack: () => void = () => window.history.back();

export function layerCount(): number {
  return stack.length;
}

// The history a layer works against. The real one in a browser; a stand-in in a test, which is
// how the whole of this can be exercised without one.
export interface LayerHistory {
  pushState: (state: unknown, title: string) => void;
  // A step back of this module's own, which the router is to let pass.
  back: () => void;
  readonly state: unknown;
  readonly href: string;
}

let held: LayerHistory | null = null;

function history(): LayerHistory {
  if (held !== null) {
    return held;
  }

  return {
    pushState: (state, title) => window.history.pushState(state, title),
    back: () => stepBack(),
    get state() {
      return window.history.state;
    },
    get href() {
      return window.location.href;
    }
  };
}

// For a test to stand in its own history and listen for itself.
export function holdHistory(stand: LayerHistory | null): void {
  held = stand;
  stack.length = 0;
  ignoring = 0;
  owed = 0;
  closing = false;
  landed();
}

// The road through the history: an entry pushed for each layer, and taken back when it goes.
const entryRoad: BackRoad = {
  hold(layer) {
    const now = history();
    // Where the page stood when the entry was pushed. A layer left behind by a navigation — a link
    // inside a drawer, the button on a dialog that opens the whole screen — must not take its
    // entry back, since that entry is now behind the page the reader asked for.
    const href = now.href;
    // Whether its entry is in the history yet; it waits while a step back is still on its way.
    let pushed = false;

    const push = (): void => {
      if (!stack.includes(layer)) {
        return;
      }

      const state = now.state;
      const carried = typeof state === "object" && state !== null ? state : {};

      now.pushState({ ...carried, [MARK]: markOf(layer.id) }, "");
      pushed = true;
    };

    // A layer opened in the same press that closed another — a menu's choice that opens a dialog —
    // waits for that layer's step back to land. Pushed before it, the entry would be the one the
    // step takes away.
    if (ignoring === 0) {
      push();
    } else {
      landing.push(push);
    }

    return {
      letGo(top) {
        if (closing || !pushed || !top || history().href !== href) {
          return;
        }

        step();
      }
    };
  }
};

// The part of a close watcher this module uses. The platform's own type library does not name it yet.
interface CloseWatcherLike {
  onclose: ((event: Event) => void) | null;
  destroy: () => void;
}

type CloseWatcherMaker = new () => CloseWatcherLike;

function closeWatcherMaker(): CloseWatcherMaker | undefined {
  return (globalThis as { CloseWatcher?: CloseWatcherMaker }).CloseWatcher;
}

// The road through close watchers: one for each layer, closed by the system's back and destroyed
// when the layer goes any other way. The browser hands a press to the watcher made last, which is
// the layer opened last.
const watcherRoad: BackRoad = {
  hold(layer) {
    const Watcher = closeWatcherMaker() as CloseWatcherMaker;
    const watcher = new Watcher();

    watcher.onclose = () => heard(layer);

    return { letGo: () => watcher.destroy() };
  }
};

// Whether the system's back reaches the page as a close request. Every browser on Android that has
// close watchers sends its back to them; elsewhere a close watcher hears only Esc, and the back
// button still steps through the history.
function backIsCloseRequest(): boolean {
  return closeWatcherMaker() !== undefined && typeof navigator !== "undefined" && navigator.userAgent.includes("Android");
}

// The road this page's gesture takes. A history a test stands in is always heard through entries.
function road(): BackRoad {
  return held === null && backIsCloseRequest() ? watcherRoad : entryRoad;
}

// A press of back that reached a layer: it no longer stands, and it is closed its own way.
function heard(layer: Layer): void {
  const at = stack.indexOf(layer);

  if (at === -1) {
    return;
  }

  stack.splice(at, 1);
  closing = true;

  try {
    layer.close();
  } finally {
    closing = false;
  }
}

// Registers a layer as standing, and returns what to hand back when it is gone.
export function openLayer(close: () => void): number {
  counted += 1;

  const layer: Layer = { id: counted, close, hold: { letGo: () => undefined } };

  stack.push(layer);
  layer.hold = road().hold(layer);

  return layer.id;
}

// Says a layer is no longer standing, whatever closed it. What its road holds for it goes with it,
// so a layer opened and closed by its own controls leaves the history where it found it.
export function closeLayer(id: number): void {
  const at = stack.findIndex((layer) => layer.id === id);

  if (at === -1) {
    return;
  }

  const [layer] = stack.splice(at, 1);

  layer?.hold.letGo(at === stack.length);
}

// Whether the entry arrived at is one of this app's own whose layer no longer stands: one a
// navigation left behind, one buried under a layer opened after it, or one from before a reload.
// Such an entry holds the address the reader already stands at, so it is stepped over rather than
// stood on, and one press of the reader's never lands on nothing.
function stale(state: unknown): boolean {
  if (typeof state !== "object" || state === null || !(MARK in state)) {
    return false;
  }

  const mark = (state as Record<string, unknown>)[MARK];

  return !stack.some((layer) => markOf(layer.id) === mark);
}

function stepOver(): void {
  step();
}

// What the back gesture means here: the top layer if one stands, and nothing at all otherwise —
// in which case the press is the reader's own and the page it leads to is where they go. Where the
// gesture reaches the layers through close watchers, a pop is a move of the page's and never a press
// meant for a layer.
export function handlePop(state: unknown): void {
  if (road() === watcherRoad) {
    return;
  }

  if (ignoring > 0) {
    ignoring = 0;

    // The next step owed is taken now that this one has landed.
    if (owed > 0) {
      owed -= 1;
      step();

      return;
    }

    if (stale(state)) {
      stepOver();

      return;
    }

    landed();

    return;
  }

  const top = stack.at(-1);

  if (top !== undefined) {
    heard(top);
  }

  if (stale(state)) {
    stepOver();
  }
}

// Esc stays the library's: the layer it closes is the one the library answers it for. A key nobody
// refused also goes on to the close watcher on top, which would close a second layer under the
// first; so once everything on the page has had the key, it is refused, and no close request
// follows it. The refusal is set on the way down and runs after every other listener on the way up.
function keepEscapeOffWatchers(event: KeyboardEvent): void {
  if (event.key !== "Escape" || !event.isTrusted || stack.length === 0 || road() !== watcherRoad) {
    return;
  }

  const refuse = (later: Event): void => {
    if (later === event) {
      later.preventDefault();
    }
  };

  window.addEventListener("keydown", refuse);
  setTimeout(() => window.removeEventListener("keydown", refuse), 0);
}

// Starts listening for the gesture, once, for whatever registers first.
export function listenForBack(): void {
  if (listening || import.meta.server) {
    return;
  }

  listening = true;
  window.addEventListener("popstate", (event) => handlePop(event.state));
  window.addEventListener("keydown", keepEscapeOffWatchers, true);

  // A step of this module's is taken through the router's history, told not to read the pop it
  // makes: read as a move, it would cancel whatever navigation was begun while it was on its way.
  // A host with no pages stands on the framework's own small router, which keeps no history of its
  // own and so has no navigation for the pop to cancel; there the step is the browser's.
  const router = useRouter();
  const routerHistory = (router.options as { history?: typeof router.options.history }).history;

  if (routerHistory !== undefined) {
    stepBack = () => routerHistory.go(-1, false);
  }

  // A navigation waits for a step back still on its way, which would otherwise land on top of it.
  // The wait begins with a turn of the screen's own updates, since the close that asks for the step
  // may be written just after the navigation.
  router.beforeEach(async () => {
    await nextTick();
    await stepsLanded();
  });
}

// One thing that stands over a screen, for as long as it stands. The screen says what it has
// open and how it closes; everything about the gesture is here.
export function useBackClose(open: Ref<boolean>, close?: () => void): void {
  if (import.meta.server) {
    return;
  }

  listenForBack();

  let id: number | null = null;

  const drop = (): void => {
    if (id !== null) {
      closeLayer(id);
      id = null;
    }
  };

  watch(open, (standing) => {
    if (standing && id === null) {
      id = openLayer(() => (close === undefined ? (open.value = false) : close()));
    } else if (!standing) {
      drop();
    }
  });

  onScopeDispose(drop);
}
