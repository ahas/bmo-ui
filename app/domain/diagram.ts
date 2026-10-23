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
// A diagram stands whole in its column, at the size it was laid out at or smaller, never wider than
// the column, so neither the page nor the diagram's own box moves sideways. Its figure is a stage it
// is zoomed and moved on, as a picture opened whole is (the zoom module): the wheel over it zooms
// around the pointer, two fingers pinch it, a drag moves it once it is zoomed, a double click zooms
// in at a point or back out to fitting, and the zoom buttons the host's renderer stands beside it
// zoom out, zoom in and fit. A zoomed diagram is clipped to its figure.

import { FIT, MAX_SCALE, MIN_SCALE, moved, pinched, toggled, wheeled, zoomedTo } from "./zoom";

import type { Mermaid } from "mermaid";
import type { Point, Size, ZoomView } from "./zoom";

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
      // The figure stands where the source stood, ahead of the zoom buttons.
      const source = place.querySelector(":scope > pre");

      if (source === null) {
        place.append(figure);
      } else {
        source.after(figure);
      }
    }

    figure.innerHTML = svg;

    const picture = figure.querySelector("svg");
    const width = picture === null ? null : naturalWidth(picture);

    if (picture !== null && width !== null) {
      picture.style.maxWidth = "";
      picture.style.height = "auto";
      picture.setAttribute("width", String(Math.ceil(width)));
    }

    place.dataset.drawn = mark;
    zoomable(place);
    delete place.dataset.failed;
  } catch {
    // A source Mermaid refuses stays the code it was written as.
    place.querySelector(":scope > .markdown-diagram-figure")?.remove();
    delete place.dataset.drawn;
    place.dataset.failed = "";
  }
}

// How a drawn diagram is zoomed. The view is the zoom module's: the figure is the stage, and the
// diagram fitted in it is the picture, standing centred across and filling the figure's height.
interface Zoom {
  view: ZoomView;
  // The fingers or the pointer on the figure, and the view and points the present gesture began at.
  pointers: Map<number, Point>;
  gesture: { view: ZoomView; points: Map<number, Point> } | null;
}

const zooms = new WeakMap<HTMLElement, Zoom>();

// One notch of a wheel scrolling by lines, in pixels, so a wheel zooms as far whatever it counts in.
const LINE_PX = 16;
// How far a press of a zoom button zooms.
const STEP = 1.5;

function figureOf(place: HTMLElement): HTMLElement | null {
  return place.querySelector<HTMLElement>(":scope > .markdown-diagram-figure");
}

function stageOf(figure: HTMLElement): Size {
  return { width: figure.clientWidth, height: figure.clientHeight };
}

// The diagram's size as it stands fitted in the figure, read off its laid-out width and shape rather
// than its box, which a zoom has already transformed.
function fittedOf(figure: HTMLElement): Size {
  const picture = figure.querySelector("svg");
  const box = picture?.viewBox.baseVal;

  if (picture === null || box === undefined || box.width <= 0 || box.height <= 0) return { width: 0, height: 0 };

  const width = Math.min(Number(picture.getAttribute("width")) || box.width, figure.clientWidth);

  return { width, height: (width * box.height) / box.width };
}

// A point on the screen, as the figure's centre sees it.
function local(figure: HTMLElement, event: { clientX: number; clientY: number }): Point {
  const box = figure.getBoundingClientRect();

  return { x: event.clientX - box.left - box.width / 2, y: event.clientY - box.top - box.height / 2 };
}

function show(place: HTMLElement, zoom: Zoom, view: ZoomView): void {
  const figure = figureOf(place);
  const picture = figure?.querySelector("svg");

  zoom.view = view;

  if (picture !== null && picture !== undefined) {
    picture.style.transform = view.scale > MIN_SCALE || view.x !== 0 || view.y !== 0 ? `translate(${view.x}px, ${view.y}px) scale(${view.scale})` : "";
  }

  if (view.scale > MIN_SCALE) {
    place.dataset.zoomed = "";
  } else {
    delete place.dataset.zoomed;
  }

  for (const button of place.querySelectorAll<HTMLButtonElement>(":scope > .markdown-diagram-tools [data-diagram-zoom]")) {
    const towards = button.dataset.diagramZoom;

    button.disabled = towards === "in" ? view.scale >= MAX_SCALE : view.scale <= MIN_SCALE;
  }
}

// The view a change asks for, in the figure as it stands now.
function stepped(place: HTMLElement, change: (view: ZoomView, fitted: Size, stage: Size) => ZoomView): void {
  const zoom = zooms.get(place);
  const figure = figureOf(place);

  if (zoom === undefined || figure === null) return;

  show(place, zoom, change(zoom.view, fittedOf(figure), stageOf(figure)));
}

function onWheel(this: HTMLElement, event: WheelEvent): void {
  const zoom = zooms.get(this);
  const figure = figureOf(this);

  if (zoom === undefined || figure === null || !figure.contains(event.target as Node)) return;

  const lines = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? LINE_PX : 1;
  // A pinch on a trackpad arrives as a wheel with ctrl held and small steps; it zooms faster.
  const delta = event.deltaY * lines * (event.ctrlKey ? 4 : 1);
  const next = wheeled(zoom.view, delta, local(figure, event), fittedOf(figure), stageOf(figure));

  // A wheel that has nothing left to zoom — out at fitting, in at the most — scrolls the page on, so
  // reading past a diagram never sticks on it. A trackpad's pinch is always the diagram's, since the
  // browser would otherwise zoom the whole page.
  if (next.scale === zoom.view.scale && !event.ctrlKey) return;

  event.preventDefault();
  show(this, zoom, next);
}

function begin(zoom: Zoom): void {
  zoom.gesture = { view: zoom.view, points: new Map(zoom.pointers) };
}

function onPointerDown(this: HTMLElement, event: PointerEvent): void {
  const zoom = zooms.get(this);
  const figure = figureOf(this);

  if (zoom === undefined || figure === null || event.button > 0 || !figure.contains(event.target as Node)) return;

  // A fitted diagram under a mouse is left to select its words; a finger is followed, for a pinch.
  if (event.pointerType === "mouse" && zoom.view.scale <= MIN_SCALE) return;

  if (event.pointerType === "mouse") event.preventDefault();

  figure.setPointerCapture?.(event.pointerId);
  zoom.pointers.set(event.pointerId, local(figure, event));
  begin(zoom);
}

function onPointerMove(this: HTMLElement, event: PointerEvent): void {
  const zoom = zooms.get(this);
  const figure = figureOf(this);

  if (zoom === undefined || figure === null || zoom.gesture === null || !zoom.pointers.has(event.pointerId)) return;

  const now = local(figure, event);

  zoom.pointers.set(event.pointerId, now);

  const ids = [...zoom.pointers.keys()];
  const fitted = fittedOf(figure);
  const stage = stageOf(figure);

  if (ids.length >= 2) {
    const [a, b] = ids as [number, number];
    const from: [Point, Point] = [zoom.gesture.points.get(a)!, zoom.gesture.points.get(b)!];
    const to: [Point, Point] = [zoom.pointers.get(a)!, zoom.pointers.get(b)!];

    show(this, zoom, pinched(zoom.gesture.view, from, to, fitted, stage));

    return;
  }

  // One finger on a fitted diagram moves nothing: the page scrolls under it.
  if (zoom.gesture.view.scale <= MIN_SCALE) return;

  const start = zoom.gesture.points.get(event.pointerId)!;

  show(this, zoom, moved(zoom.gesture.view, { x: now.x - start.x, y: now.y - start.y }, fitted, stage));
}

function onPointerUp(this: HTMLElement, event: PointerEvent): void {
  const zoom = zooms.get(this);

  if (zoom === undefined || !zoom.pointers.delete(event.pointerId)) return;

  // One finger left of two carries on from where the pinch left the diagram.
  if (zoom.pointers.size > 0) {
    begin(zoom);
  } else {
    zoom.gesture = null;
  }
}

// Two fingers on the figure are the diagram's pinch, never the page's scroll.
function onTouchMove(this: HTMLElement, event: TouchEvent): void {
  const figure = figureOf(this);

  if (figure !== null && event.touches.length >= 2 && event.cancelable && figure.contains(event.target as Node)) {
    event.preventDefault();
  }
}

function onDoubleClick(this: HTMLElement, event: MouseEvent): void {
  const figure = figureOf(this);

  if (figure === null || !figure.contains(event.target as Node)) return;

  event.preventDefault();
  window.getSelection()?.removeAllRanges();
  stepped(this, (view, fitted, stage) => toggled(view, local(figure, event), fitted, stage));
}

function onClick(this: HTMLElement, event: MouseEvent): void {
  const button = (event.target as Element | null)?.closest<HTMLButtonElement>("[data-diagram-zoom]");

  if (button === null || button === undefined || !this.contains(button)) return;

  const towards = button.dataset.diagramZoom;
  const centre: Point = { x: 0, y: 0 };

  if (towards === "in") {
    stepped(this, (view, fitted, stage) => zoomedTo(view, view.scale * STEP, centre, fitted, stage));
  } else if (towards === "out") {
    stepped(this, (view, fitted, stage) => zoomedTo(view, view.scale / STEP, centre, fitted, stage));
  } else if (towards === "fit") {
    stepped(this, () => FIT);
  }
}

// A drawn place becomes zoomable once; a diagram drawn again — in the other theme — stands fitted.
function zoomable(place: HTMLElement): void {
  let zoom = zooms.get(place);

  if (zoom === undefined) {
    zoom = { view: FIT, pointers: new Map(), gesture: null };
    zooms.set(place, zoom);
    place.addEventListener("wheel", onWheel, { passive: false });
    place.addEventListener("pointerdown", onPointerDown);
    place.addEventListener("pointermove", onPointerMove);
    place.addEventListener("pointerup", onPointerUp);
    place.addEventListener("pointercancel", onPointerUp);
    place.addEventListener("touchmove", onTouchMove, { passive: false });
    place.addEventListener("dblclick", onDoubleClick);
    place.addEventListener("click", onClick);
  }

  zoom.pointers.clear();
  zoom.gesture = null;
  show(place, zoom, FIT);
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
