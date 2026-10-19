import { beforeEach, describe, expect, test } from "bun:test";

import dayjs from "dayjs";

import { clockUnder, formatDay, formatShortDay, remainingText, timerClock } from "~/domain/time";

import type { Translate } from "#shared/wording";

// A stand-in for the host's pack: a key answers as itself with what fills it, so a test reads which
// sentence was asked for and with what.
const wording: Translate = (key, params) => (params === undefined ? key : `${key} ${JSON.stringify(params)}`);

// The host's setting, read through its app configuration, which stands in here.
function hostSays(setting: { zone?: string; locale?: string; dateLocale?: string }): void {
  Object.assign(globalThis, { useAppConfig: () => ({ bmoUi: setting }) });
}

beforeEach(() => hostSays({ zone: "UTC", locale: "en-US" }));

// How much of a wait is left, as a line counting it down reads. It is said in one unit, always
// floored, and a wait with nothing left says so rather than counting into the negative.

const HOUR = 60 * 60;
const DAY = 24 * HOUR;
const NOW = 1_800_000_000;

describe("what is left of a wait", () => {
  test("is said in the one unit a person would say it in", () => {
    expect(remainingText(wording, NOW + 3 * HOUR, NOW)).toBe(wording("common.label.left_hours", { n: "3" }));
    expect(remainingText(wording, NOW + 45 * 60, NOW)).toBe(wording("common.label.left_minutes", { n: "45" }));
    expect(remainingText(wording, NOW + 7 * DAY, NOW)).toBe(wording("common.label.left_days", { n: "7" }));
    expect(remainingText(wording, NOW + 30 * DAY, NOW)).toBe(wording("common.label.left_days", { n: "30" }));
  });

  test("is floored, so it never promises more time than there is", () => {
    expect(remainingText(wording, NOW + HOUR - 1, NOW)).toBe(wording("common.label.left_minutes", { n: "59" }));
    expect(remainingText(wording, NOW + 3 * HOUR + 59 * 60, NOW)).toBe(wording("common.label.left_hours", { n: "3" }));
    expect(remainingText(wording, NOW + DAY - 1, NOW)).toBe(wording("common.label.left_hours", { n: "23" }));
    expect(remainingText(wording, NOW + 2 * DAY - 1, NOW)).toBe(wording("common.label.left_days", { n: "1" }));
  });

  test("the last minute says only that it is the last", () => {
    expect(remainingText(wording, NOW + 59, NOW)).toBe(wording("common.label.left_under_minute"));
    expect(remainingText(wording, NOW + 1, NOW)).toBe(wording("common.label.left_under_minute"));
    expect(remainingText(wording, NOW + 60, NOW)).toBe(wording("common.label.left_minutes", { n: "1" }));
  });

  test("a wait whose time has passed says so and never counts backwards", () => {
    expect(remainingText(wording, NOW, NOW)).toBe(wording("common.label.expired"));
    expect(remainingText(wording, NOW - 1, NOW)).toBe(wording("common.label.expired"));
    expect(remainingText(wording, NOW - 30 * DAY, NOW)).toBe(wording("common.label.expired"));
  });

  test("the unit boundaries are where they read as changing", () => {
    expect(remainingText(wording, NOW + 3600, NOW)).toBe(wording("common.label.left_hours", { n: "1" }));
    expect(remainingText(wording, NOW + 3599, NOW)).toBe(wording("common.label.left_minutes", { n: "59" }));
    expect(remainingText(wording, NOW + DAY, NOW)).toBe(wording("common.label.left_days", { n: "1" }));
    expect(remainingText(wording, NOW + DAY - 1, NOW)).toBe(wording("common.label.left_hours", { n: "23" }));
  });
});


// A short wait ticking down reads as a timer face: minutes and two-digit seconds, hours only past an hour.
describe("a timer face", () => {
  test("pads the seconds, puts hours in front only past an hour, and never goes below nought", () => {
    expect(timerClock(161)).toBe("2:41");
    expect(timerClock(5)).toBe("0:05");
    expect(timerClock(3725)).toBe("1:02:05");
    expect(timerClock(-3)).toBe("0:00");
  });
});

describe("a row's time under the day it stands in", () => {
  // 2026-10-12 02:01 in UTC.
  const sent = 1_791_770_460;

  test("is the clock alone under its own day, or under no day", () => {
    expect(clockUnder(sent, "2026-10-12")).toBe("02:01");
    expect(clockUnder(sent, undefined)).toBe("02:01");
  });

  test("carries its date under a later day it stands at the foot of", () => {
    expect(clockUnder(sent, "2026-10-13")).toBe("10-12 02:01");
  });
});

describe("the zone and the words a time is shown in", () => {
  const sent = 1_791_770_460;

  test("are the host's zone, which moves the clock and the day with it", () => {
    hostSays({ zone: "America/New_York" });

    expect(clockUnder(sent, "2026-10-11")).toBe("22:01");
    expect(clockUnder(sent, "2026-10-12")).toBe("10-11 22:01");
  });

  test("are the runtime's own zone where the host states none", () => {
    hostSays({});

    expect(clockUnder(sent, undefined)).toBe(dayjs.unix(sent).format("HH:mm"));
  });

  test("are dayjs's built-in words where the host names no locale", () => {
    expect(formatDay(() => "dddd", sent)).toBe("Monday");
  });
});

describe("a short day", () => {
  const sent = 1_791_770_460;

  test("is written in the format the pack gives it, in the host's zone", () => {
    expect(formatShortDay(() => "YY/MM/DD", sent)).toBe("26/10/12");

    hostSays({ zone: "America/New_York" });

    expect(formatShortDay(() => "YY/MM/DD", sent)).toBe("26/10/11");
  });
});
