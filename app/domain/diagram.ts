// A diagram written into a text as a fenced block in Mermaid, drawn as the picture it describes.
//
// The host's renderer stands such a block as a place holding its source (`docs/boundary.md`,
// "Classes and keyframes"): the source stays inside it as a code block, so a text whose diagram
// cannot be drawn — Mermaid not loaded yet, a source Mermaid refuses — still says what it meant.
// Once the text is on the screen, the component that put it there hands its element here, and every
// place under it is drawn in the theme the page stands in; the place is marked with that theme, so
// a theme switch draws it again and a second call in the same theme does nothing.
//
// Mermaid is several megabytes and most texts carry no diagram, so it is fetched the first time a
// place is drawn and never before.
//
// A diagram stands at the size it was laid out at, and gives up at most a fifth of it to fit the
// column: a flow a little wider than a phone fits, and one laid out much wider keeps words a reader
// can read and scrolls sideways inside its own box, the way a wide table does. The page itself never
// moves sideways.

import type { Mermaid } from "mermaid";

// The language a fenced block names to be a diagram.
const LANGUAGE = "mermaid";

// Whether a fenced block's language names a diagram. The first word of the info string is the
// language, as markdown reads it.
export function isDiagram(language: string | undefined): boolean {
  return (language ?? "").trim().split(/\s+/)[0]?.toLowerCase() === LANGUAGE;
}

// The theme a diagram is drawn in, one for each screen mode.
function theme(dark: boolean): "neo" | "neo-dark" {
  return dark ? "neo-dark" : "neo";
}

// The colours of one screen mode, as a diagram needs them: its surface, its text, the hues its
// series are told apart by, and how much of its hue a box or a section that holds words keeps over
// the surface, so the words on it keep their contrast in the text colour.
interface Colours {
  surface: string;
  ink: string;
  series: readonly string[];
  wash: number;
}

// The neo themes draw every series in near-greys, so a diagram's series take the categorical hues
// instead: eight, in a fixed order, each stepped for its theme and checked for colour-blind
// separation and contrast against that theme's surface. A ninth series has no hue of its own.
const LIGHT: Colours = {
  surface: "#ffffff",
  ink: "#3f3f46",
  series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
  wash: 0.22
};

const DARK: Colours = {
  surface: "#18181b",
  ink: "#e4e4e7",
  series: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
  wash: 0.4
};

// A hue laid over the surface at the share given, as a colour Mermaid can compute further from.
function tint(hue: string, surface: string, share: number): string {
  const channels = (colour: string) => [1, 3, 5].map((at) => Number.parseInt(colour.slice(at, at + 2), 16));
  const over = channels(hue);
  const under = channels(surface);

  return `#${over.map((value, at) => Math.round(value * share + under[at]! * (1 - share)).toString(16).padStart(2, "0")).join("")}`;
}

// The theme variables that put the series in their hues: pie slices, a chart's bars and lines, the
// sections of a timeline or a mind map. Every word keeps the page's text colour.
function seriesVariables(colours: Colours): Record<string, unknown> {
  const { surface, ink, series, wash } = colours;
  const variables: Record<string, unknown> = {
    pieOpacity: "1",
    pieStrokeColor: surface,
    pieStrokeWidth: "2px",
    pieOuterStrokeColor: surface,
    pieTitleTextColor: ink,
    pieSectionTextColor: ink,
    pieLegendTextColor: ink,
    xyChart: {
      backgroundColor: "transparent",
      titleColor: ink,
      legendTextColor: ink,
      xAxisTitleColor: ink,
      xAxisLabelColor: ink,
      xAxisTickColor: ink,
      xAxisLineColor: ink,
      yAxisTitleColor: ink,
      yAxisLabelColor: ink,
      yAxisTickColor: ink,
      yAxisLineColor: ink,
      plotColorPalette: series.join(",")
    }
  };

  series.forEach((hue, at) => {
    variables[`pie${at + 1}`] = hue;
    variables[`cScale${at}`] = tint(hue, surface, wash);
    variables[`cScaleLabel${at}`] = ink;
  });

  return variables;
}

// What the theme variables cannot reach. A share printed on a slice stands on a ring of the surface
// so it reads on any hue. A flow's box marked `c1` to `c8` wears its series' tint and hue. The neo
// look paints every section of a timeline or a mind map alike, over the section colours; there the
// sections take the series again, first section first — a timeline numbers its first period `-1`,
// a mind map its first branch `0` and its root `-1` — and a mind map's root stays the neutral box it
// is.
function seriesStyles(colours: Colours): string {
  const { surface, series, wash } = colours;
  const shapes = (scope: string) => ["rect", "path", "polygon", "circle", "ellipse"].map((shape) => `${scope} ${shape}`).join(", ");
  const slices = `.slice { paint-order: stroke; stroke: ${surface}; stroke-width: 3px; stroke-linejoin: round; }`;
  const rules = series.map((hue, at) => {
    const fill = `fill: ${tint(hue, surface, wash)}`;
    const period = `.timeline-node.section-${at - 1}[data-look="neo"]`;
    const branch = `.mindmap-node.section-${at}[data-look="neo"]`;

    return [
      `${shapes(`.node.c${at + 1}`)} { ${fill} !important; stroke: ${hue} !important; }`,
      `${shapes(period)}, ${shapes(branch)} { ${fill}; stroke: ${hue}; }`,
      `${period} line, .section-edge-${at} { stroke: ${hue}; }`
    ].join(" ");
  });

  return [slices, ...rules].join(" ");
}

let loading: Promise<Mermaid | null> | null = null;

// Mermaid, fetched once. A failed fetch is forgotten so the next diagram asks again.
async function loadMermaid(): Promise<Mermaid | null> {
  loading ??= import("mermaid").then(
    (module) => module.default,
    async () => {
      loading = null;

      return null;
    }
  );

  return loading;
}

// Mermaid keeps one configuration for the whole page, and drawing is asynchronous, so the draws
// are put in one line: a draw never runs under the theme another one set.
// A draw that fails in a way nobody caught leaves its places as their source and never holds up
// the ones queued after it.
let queue: Promise<void> = Promise.resolve();
let drawings = 0;

// A label breaks between words, never inside one: Korean may otherwise break between any two
// syllables. Mermaid measures a label under the diagram's own stylesheet, so the boxes are sized
// for the lines as they break here.
const LABELS = ".nodeLabel, .edgeLabel, .label, .messageText, .noteText, .actor, .loopText { word-break: keep-all; overflow-wrap: anywhere; }";

// How far a diagram shrinks to fit its column before it scrolls instead.
const SMALLEST = 0.8;

// The size Mermaid measured the diagram at, taken off its view box.
function naturalWidth(svg: SVGSVGElement): number | null {
  const width = svg.viewBox.baseVal?.width ?? 0;

  return width > 0 ? width : null;
}

async function drawOne(mermaid: Mermaid, place: HTMLElement, dark: boolean): Promise<void> {
  const mark = theme(dark);

  if (place.dataset.drawn === mark || !place.isConnected) return;

  const source = place.querySelector("pre")?.textContent ?? "";
  const colours = dark ? DARK : LIGHT;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    suppressErrorRendering: true,
    theme: mark,
    look: "neo",
    themeVariables: seriesVariables(colours),
    themeCSS: `${LABELS} ${seriesStyles(colours)}`,
    fontFamily: getComputedStyle(place).fontFamily
  });

  try {
    const { svg } = await mermaid.render(`markdown-diagram-${++drawings}`, source);
    let figure = place.querySelector<HTMLElement>(":scope > .markdown-diagram-figure");

    if (figure === null) {
      figure = document.createElement("div");
      figure.className = "markdown-diagram-figure";
      place.append(figure);
    }

    figure.innerHTML = svg;

    const picture = figure.querySelector("svg");
    const width = picture === null ? null : naturalWidth(picture);

    if (picture !== null && width !== null) {
      picture.style.maxWidth = "";
      picture.style.minWidth = `${Math.ceil(width * SMALLEST)}px`;
      picture.style.height = "auto";
      picture.setAttribute("width", String(Math.ceil(width)));
    }

    place.dataset.drawn = mark;
    delete place.dataset.failed;
  } catch {
    // A source Mermaid refuses stays the code it was written as.
    place.querySelector(":scope > .markdown-diagram-figure")?.remove();
    delete place.dataset.drawn;
    place.dataset.failed = "";
  }
}

// Draws every diagram place under the element in the theme given. Resolves once all of them are
// drawn or refused; a page with no Mermaid to be had leaves every place as its source.
export function drawDiagrams(root: HTMLElement, dark: boolean): Promise<void> {
  const places = [...root.querySelectorAll<HTMLElement>("div[data-diagram]")].filter((place) => place.dataset.drawn !== theme(dark));

  if (places.length === 0) return queue;

  queue = queue.then(async () => {
    const mermaid = await loadMermaid();

    if (mermaid === null) return;

    // Mermaid measures every word as it lays the diagram out, so the page's own typeface has to be
    // there first or the boxes are sized for a fallback.
    await document.fonts?.ready;

    for (const place of places) {
      await drawOne(mermaid, place, dark);
    }
  }).catch(async () => undefined);

  return queue;
}
