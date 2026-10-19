import { beforeEach, describe, expect, test } from "bun:test";

import { shareEnded, shareUntilText } from "~/domain/share-links";

import type { Translate } from "#shared/wording";

// A link's end as every screen names it (`docs/components.md`, "Share links"): the day it stands
// until, never the time left; a link with no end says so, and one past its end says it has ended.

// A stand-in for the host's pack: the short day's format answers as a format, every other key as
// itself with what fills it.
const wording: Translate = (key, params) => {
  if (key === "common.label.short_day_format") return "YY/MM/DD";

  return params === undefined ? key : `${key} ${JSON.stringify(params)}`;
};

beforeEach(() => {
  Object.assign(globalThis, { useAppConfig: () => ({ bmoUi: { zone: "UTC" } }) });
});

// 2026-10-19 09:10 in UTC.
const ENDS = 1_792_401_000;
const HOUR = 60 * 60;

describe("a link's end", () => {
  test("is the day it stands until, however many hours are left", () => {
    const until = wording("common.label.share_until", { date: "26/10/19" });

    expect(shareUntilText(wording, ENDS, ENDS - 30 * 24 * HOUR)).toBe(until);
    expect(shareUntilText(wording, ENDS, ENDS - 24 * HOUR)).toBe(until);
    expect(shareUntilText(wording, ENDS, ENDS - 1)).toBe(until);
  });

  // A link made for a day reads the day it ends on from its first second, never "23 hours".
  test("does not shift as the link is made a second before it is read", () => {
    const made = ENDS - 24 * HOUR;

    expect(shareUntilText(wording, ENDS, made + 1)).toBe(shareUntilText(wording, ENDS, made));
  });

  test("is the day in the host's zone", () => {
    Object.assign(globalThis, { useAppConfig: () => ({ bmoUi: { zone: "Pacific/Kiritimati" } }) });

    expect(shareUntilText(wording, ENDS, ENDS - HOUR)).toBe(wording("common.label.share_until", { date: "26/10/19" }));

    Object.assign(globalThis, { useAppConfig: () => ({ bmoUi: { zone: "Pacific/Pago_Pago" } }) });

    expect(shareUntilText(wording, ENDS, ENDS - HOUR)).toBe(wording("common.label.share_until", { date: "26/10/18" }));
  });

  test("says the link has ended once its moment has come, and never names a day gone by", () => {
    expect(shareUntilText(wording, ENDS, ENDS)).toBe(wording("common.label.expired"));
    expect(shareUntilText(wording, ENDS, ENDS + 30 * 24 * HOUR)).toBe(wording("common.label.expired"));
  });

  test("is the word for having no end where the link has none", () => {
    expect(shareUntilText(wording, null, ENDS)).toBe(wording("common.label.forever"));
  });
});

describe("whether a link has ended", () => {
  test("is only ever true of a link that had a moment to end at, from that moment on", () => {
    expect(shareEnded(ENDS, ENDS - 1)).toBe(false);
    expect(shareEnded(ENDS, ENDS)).toBe(true);
    expect(shareEnded(null, ENDS * 2)).toBe(false);
  });
});
