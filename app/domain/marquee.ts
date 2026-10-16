import type { ComputedRef, Ref, ShallowRef } from "vue";

// A line that is wider than the box it stands in and has to be read to its end is read by moving
// it rather than by being cut off at the edge. Two things have to hold of such a line, and a line
// that misses either is cut at its width instead: the value has a settled form — a name, a path, an
// identifier, a figure, a fixed vocabulary — so that travelling to its end shows the whole of it,
// where a sentence somebody wrote has no settled end and is no better read for moving; and this
// line is the last place that value stands, where a row that opens a detail carrying the same value
// sends the reader there instead. What is decided here is the arithmetic of the move alone —
// whether a width is genuinely over its box, and what a distance is worth in time at the one
// speed every line travels at. The measuring itself is the browser's and is wired in below.

// How far a line may stand out of its box before the box counts as too small for it. Both widths
// are read as whole pixels, so a single one of them is the rounding of the measurement and nothing
// a reader is missing. It is no wider than that on purpose: an ellipsis costs about a character to
// draw, so a line held back from moving because it only just overflows loses a whole word to the
// three dots, which is the very thing this is here to stop.
export const MARQUEE_SLACK_PX = 1;

// How fast a line travels, in pixels a second. A speed rather than a duration: with one duration
// for every line a long line would crawl and a short one would dart, and the point of the move is
// that it is read while it happens.
export const MARQUEE_SPEED_PX_PER_SECOND = 48;

// What share of one there-and-back cycle is spent moving. The rest of the cycle is the pause at
// each end, which is what makes the beginning and the end of a line something to read rather than
// points the text merely turns around at. A share rather than a count of seconds, because a pause
// is a stop of the keyframes and a keyframe stop is a percentage of the cycle.
export const MARQUEE_TRAVEL_SHARE = 0.76;

// The shortest cycle a line gets. A line standing out by a few pixels would otherwise cross its
// whole distance in a blink and spend the rest of the cycle turning around.
export const MARQUEE_MIN_SECONDS = 6;

// The two figures the moving line is driven by. They go over as custom properties rather than as
// an animation of their own, because a row that redraws its words once a second would otherwise
// start the movement over on every redraw and never reach the end of the line.
export interface MarqueeVars {
  "--marquee-distance": string;
  "--marquee-duration": string;
  // What makes the pair a style a line can be handed: a style object takes custom properties
  // only from a type that says it carries them.
  [name: `--${string}`]: string;
}

// What one line was measured to be worth: how far it has to travel and whether it travels at all.
export interface MarqueeMotion {
  moving: ComputedRef<boolean>;
  vars: ComputedRef<MarqueeVars>;
}

// How far a line has to travel to show its end: the width of the words less the width of the box
// they stand in. A line that fits answers zero, and zero is what never moves.
export function marqueeDistance(lineWidth: number, boxWidth: number): number {
  const over = Math.round(lineWidth - boxWidth);

  return over <= MARQUEE_SLACK_PX ? 0 : over;
}

// How long one there-and-back cycle takes for a line with that far to go, the two pauses included.
export function marqueeSeconds(distance: number): number {
  if (distance <= 0) {
    return 0;
  }

  const travel = (2 * distance) / MARQUEE_SPEED_PX_PER_SECOND;

  return Math.max(MARQUEE_MIN_SECONDS, travel / MARQUEE_TRAVEL_SHARE);
}

// The same two figures as CSS says them. The duration is cut to a tenth of a second so that a
// line whose words change once a second is not handed a new duration on every one of them.
export function marqueeVars(distance: number): MarqueeVars {
  return {
    "--marquee-distance": `${distance}px`,
    "--marquee-duration": `${marqueeSeconds(distance).toFixed(1)}s`
  };
}

// What is watched to keep the measurement true: the box, which changes width with the window and
// whatever stands beside it, and the words, which a screen may rewrite once a second.
type MarqueeTarget = Readonly<ShallowRef<HTMLElement | null>> | Ref<HTMLElement | null>;

export function useMarquee(box: MarqueeTarget, line: MarqueeTarget): MarqueeMotion {
  const distance = ref(0);

  const moving = computed<boolean>(() => distance.value > 0);
  const vars = computed<MarqueeVars>(() => marqueeVars(distance.value));

  function measure(): void {
    const boxElement = box.value;
    const lineElement = line.value;

    if (boxElement === null || lineElement === null) {
      distance.value = 0;

      return;
    }

    // The line carries its whole text either way — clipped it is still laid out in full — so the
    // same two reads answer whether it fits and how far it would go.
    distance.value = marqueeDistance(lineElement.scrollWidth, boxElement.clientWidth);
  }

  if (import.meta.client) {
    let boxWatch: ResizeObserver | null = null;
    let wordWatch: MutationObserver | null = null;

    onMounted(() => {
      boxWatch = new ResizeObserver(() => measure());
      wordWatch = new MutationObserver(() => measure());

      if (box.value !== null) {
        boxWatch.observe(box.value);
      }

      if (line.value !== null) {
        wordWatch.observe(line.value, { characterData: true, childList: true, subtree: true });
      }

      measure();

      // The interface font arrives after the first paint and is wider than the fallback, so a
      // line measured before it lands was measured against the wrong words.
      void document.fonts.ready.then(measure);
    });

    onScopeDispose(() => {
      boxWatch?.disconnect();
      wordWatch?.disconnect();
    });
  }

  return { moving, vars };
}
