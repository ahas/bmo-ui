// A fenced block coloured in the language its fence names, as a code view colours a file.
//
// The host's renderer stands such a block with the fence's word on it (`docs/boundary.md`, "Classes
// and keyframes"); once the text is on the screen, the component that put it there hands its
// element here, and every block under it whose word names a language the editor can colour is
// coloured in the theme the page stands in. A block is marked with the theme it was coloured in, so
// a second call in the same theme does nothing and a theme switch colours it again, its text read
// back off the block itself, which the colouring leaves as written. A word the editor knows nothing
// of leaves its block as it stands.
//
// The colouring is the code view's own editor, which is several megabytes, so it is fetched the
// first time a block with a language comes near the screen and never before. A block is coloured
// only once it comes near the screen, so a long text full of code colours what is read rather than
// all of it, and the blocks waiting are coloured one to a frame, so a text carrying many of them
// never holds a frame a scroll or an entrance is drawing.

// The blocks the renderer marked with their fence's word.
const NAMED_BLOCKS = ".markdown-code[data-language]";

// How far off the screen a block is coloured ahead of being scrolled to, so it is coloured by the
// time it is read.
const AHEAD = "400px 0px";

// The editor's class for the text's default colour, which a run in it is left without, so it keeps
// the page's own text colour.
const DEFAULT_COLOUR = "mtk1";

function theme(dark: boolean): "dark" | "light" {
  return dark ? "dark" : "light";
}

// A code text as the nodes to stand inside its block, coloured as the editor drew it: a plain run
// where the editor left the default colour, and a span carrying the editor's colour class around
// each run it marked. The text across them is the text as written, character for character.
//
// The editor draws its lines for its own view — a space as a no-break space, a line closed by a
// break — so what is taken from what it drew is each run's class and length alone, and the
// characters are the text's own. Where the lines or their lengths do not add up to the text, the
// reading is refused and the text stays uncoloured rather than changed.
export function colouredRuns(text: string, drawn: string): Node[] | null {
  const lines = [...new DOMParser().parseFromString(drawn, "text/html").body.children].filter((element) => element.tagName === "SPAN");
  const written = text.split(/(\r\n|\r|\n)/);
  const nodes: Node[] = [];

  if (lines.length !== (written.length + 1) / 2) {
    return null;
  }

  for (let at = 0; at < written.length; at += 2) {
    const line = written[at] ?? "";
    let taken = 0;

    for (const run of lines[at / 2]?.children ?? []) {
      const length = (run.textContent ?? "").length;
      const piece = line.slice(taken, taken + length);

      taken += length;

      if (run.className === DEFAULT_COLOUR) {
        nodes.push(document.createTextNode(piece));
      } else {
        const span = document.createElement("span");

        span.className = run.className;
        span.textContent = piece;
        nodes.push(span);
      }
    }

    if (taken !== line.length) {
      return null;
    }

    nodes.push(document.createTextNode(written[at + 1] ?? ""));
  }

  return nodes;
}

// The theme each block handed here is to be coloured in, the one asked last.
const wanted = new WeakMap<HTMLElement, boolean>();

// The blocks near the screen, waiting their turn, coloured one to a frame.
const due: HTMLElement[] = [];
let draining = false;

// The one watch over every block not yet near the screen.
let near: IntersectionObserver | null = null;

function watch(): IntersectionObserver {
  near ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          near?.unobserve(entry.target);
          queue(entry.target as HTMLElement);
        }
      }
    },
    { rootMargin: AHEAD }
  );

  return near;
}

function queue(code: HTMLElement): void {
  if (!due.includes(code)) {
    due.push(code);
  }

  void drain();
}

async function drain(): Promise<void> {
  if (draining) {
    return;
  }

  draining = true;

  try {
    const { colourised, fenceLanguage } = await import("./monaco");

    for (let code = due.shift(); code !== undefined; code = due.shift()) {
      const dark = wanted.get(code);
      const language = fenceLanguage(code.closest<HTMLElement>(NAMED_BLOCKS)?.dataset.language ?? "");

      if (dark === undefined || language === null || !code.isConnected || code.dataset.coloured === theme(dark)) {
        continue;
      }

      const text = code.textContent ?? "";
      const nodes = colouredRuns(text, await colourised(text, language, dark));

      if (nodes !== null && code.isConnected) {
        code.replaceChildren(...nodes);
        code.dataset.coloured = theme(dark);
      }

      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  } finally {
    draining = false;
  }
}

// Every named block under an element coloured in a theme: a block already coloured once, in the
// other theme, at once, and any other once it comes near the screen.
export function colourCode(root: HTMLElement, dark: boolean): void {
  for (const code of root.querySelectorAll<HTMLElement>(`${NAMED_BLOCKS} > pre > code`)) {
    if (code.dataset.coloured === theme(dark)) {
      continue;
    }

    const seen = wanted.has(code);

    wanted.set(code, dark);

    if (code.dataset.coloured !== undefined) {
      queue(code);
    } else if (!seen) {
      watch().observe(code);
    }
  }
}

// The named blocks under an element let go of, as its text is replaced or it leaves the page, so
// the watch holds no block that is gone.
export function forgetCode(root: HTMLElement): void {
  for (const code of root.querySelectorAll<HTMLElement>(`${NAMED_BLOCKS} > pre > code`)) {
    near?.unobserve(code);
  }
}
