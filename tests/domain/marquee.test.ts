import { describe, expect, test } from "bun:test";

import {
  MARQUEE_MIN_SECONDS,
  MARQUEE_SLACK_PX,
  MARQUEE_SPEED_PX_PER_SECOND,
  MARQUEE_TRAVEL_SHARE,
  marqueeDistance,
  marqueeSeconds,
  marqueeVars
} from "~/domain/marquee";

describe("whether a line has anywhere to go", () => {
  test("a line inside its box stands still", () => {
    expect(marqueeDistance(200, 320)).toBe(0);
    expect(marqueeDistance(320, 320)).toBe(0);
  });

  test("a line wider than its box travels by what is hidden", () => {
    expect(marqueeDistance(520, 320)).toBe(200);
  });

  test("a hair over the box is a measurement, not words the reader is missing", () => {
    expect(marqueeDistance(320 + MARQUEE_SLACK_PX, 320)).toBe(0);
    expect(marqueeDistance(320 + MARQUEE_SLACK_PX + 1, 320)).toBe(MARQUEE_SLACK_PX + 1);
  });

  test("a fraction of a pixel is settled before it is judged", () => {
    expect(marqueeDistance(320.4, 320)).toBe(0);
    expect(marqueeDistance(420.6, 320)).toBe(101);
  });
});

describe("how long the line is given", () => {
  test("nothing to cross takes no time", () => {
    expect(marqueeSeconds(0)).toBe(0);
    expect(marqueeSeconds(-40)).toBe(0);
  });

  test("twice the distance takes twice as long, at the one speed", () => {
    expect(marqueeSeconds(600)).toBeCloseTo(marqueeSeconds(300) * 2, 6);
  });

  test("the time is there and back at the one speed, with the pauses around it", () => {
    const travel = (2 * 300) / MARQUEE_SPEED_PX_PER_SECOND;

    expect(marqueeSeconds(300)).toBeCloseTo(travel / MARQUEE_TRAVEL_SHARE, 6);
  });

  test("a short overhang still gets a cycle that can be read", () => {
    expect(marqueeSeconds(20)).toBe(MARQUEE_MIN_SECONDS);
  });
});

describe("what the line is handed", () => {
  test("the distance and the duration go over as custom properties", () => {
    expect(marqueeVars(200)).toEqual({
      "--marquee-distance": "200px",
      "--marquee-duration": "11.0s"
    });
  });

  test("a line that fits is handed a standstill", () => {
    expect(marqueeVars(0)).toEqual({
      "--marquee-distance": "0px",
      "--marquee-duration": "0.0s"
    });
  });
});
