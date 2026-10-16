import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import { onScopeDispose, ref } from "vue";

import { countText } from "./numbers";

import type { Ref } from "vue";
import type { Translate } from "../../shared/wording";

dayjs.extend(utc);
dayjs.extend(timezone);

// The word for a link that does not end, wherever one is named or its remaining life is read.
export const FOREVER_LABEL = "common.label.forever";

// Every stored time is unix seconds; every shown time is read in the host's zone and its dates'
// words in the host's dayjs locale (`docs/boundary.md`, "What the host owes"). Where the host states
// neither, the runtime's own zone stands and dayjs's built-in locale. The setting is read each time a
// time is written, so nothing is read before the app stands.
function shown(unixSeconds: number): dayjs.Dayjs {
  const { zone, dateLocale } = useAppConfig().bmoUi;
  const moment = dateLocale === undefined ? dayjs.unix(unixSeconds) : dayjs.unix(unixSeconds).locale(dateLocale);

  return zone === undefined ? moment : moment.tz(zone);
}

export function formatClock(unixSeconds: number): string {
  return shown(unixSeconds).format("HH:mm");
}

export function formatDay(t: Translate, unixSeconds: number): string {
  return shown(unixSeconds).format(t("common.label.day_format"));
}

// The date and the clock without the year or the seconds, for a point on a span of days.
export function formatDayClock(unixSeconds: number): string {
  return shown(unixSeconds).format("MM-DD HH:mm");
}

// A row's time as it reads under the day it stands in: the clock alone under its own day, and with its
// date under another, where a row standing at the foot of a later day puts it.
export function clockUnder(unixSeconds: number, day: string | undefined): string {
  return day === undefined || dayKey(unixSeconds) === day ? formatClock(unixSeconds) : formatDayClock(unixSeconds);
}

// The date and the clock without the seconds, as a file explorer writes when a file changed.
export function formatDateClock(unixSeconds: number): string {
  return shown(unixSeconds).format("YYYY-MM-DD HH:mm");
}

export function formatStamp(unixSeconds: number): string {
  return shown(unixSeconds).format("YYYY-MM-DD HH:mm:ss");
}

export function formatTime(unixSeconds: number): string {
  return shown(unixSeconds).format("HH:mm:ss");
}

export function dayKey(unixSeconds: number): string {
  return shown(unixSeconds).format("YYYY-MM-DD");
}

// A stretch that is over, as it is read out: seconds while a person still counts in seconds,
// minutes once they stop, and hours for something that ran all evening, where the seconds say
// nothing. Every screen that prints a finished length reads it from here — a wait beside an answer,
// a piece of work, a phase of it — because the same number of seconds said two ways on two screens
// is read as two different figures. How long ago something was is a different question, which
// `elapsedText` answers.
export function spanClock(t: Translate, seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));

  if (whole < 60) {
    return t("common.label.seconds", { n: whole });
  }

  if (whole < 3600) {
    return t("common.label.minutes_seconds", { m: Math.floor(whole / 60), s: whole % 60 });
  }

  if (whole < 86_400) {
    return t("common.label.hours_minutes", { h: Math.floor(whole / 3600), m: Math.floor(whole / 60) % 60 });
  }

  return t("common.label.days_hours", { d: countText(Math.floor(whole / 86_400)), h: Math.floor(whole / 3600) % 24 });
}

// How long ago something was, or how long it has stood, as a glance reads it: in the largest unit
// that fits and the one under it where that says something — 59 seconds, 4 minutes, 4 hours 54
// minutes, 2 days 3 hours. The seconds stop counting once a minute has passed, since nobody reading
// "since when" wants them.
export function elapsedText(t: Translate, seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));

  if (whole < 60) {
    return t("common.label.seconds", { n: whole });
  }

  if (whole < 3600) {
    return t("common.label.minutes", { m: Math.floor(whole / 60) });
  }

  if (whole < 86_400) {
    const minutes = Math.floor(whole / 60) % 60;
    const hours = Math.floor(whole / 3600);

    return minutes === 0 ? t("common.label.hours", { h: hours }) : t("common.label.hours_minutes", { h: hours, m: minutes });
  }

  const days = countText(Math.floor(whole / 86_400));
  const hours = Math.floor(whole / 3600) % 24;

  return hours === 0 ? t("common.label.days", { d: days }) : t("common.label.days_hours", { d: days, h: hours });
}

// What is left of a short wait as a timer face reads it while it ticks down: minutes and two-digit
// seconds, hours in front only past an hour — 2:41, 1:02:05. It is never below nought.
export function timerClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const ss = String(whole % 60).padStart(2, "0");

  return minutes < 60 ? `${minutes}:${ss}` : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${ss}`;
}

// How much of something's life is left, as a reader counts it down. A stretch that is over
// (`spanClock`) is said to the second because it is a measurement; what is left of a share link
// is not measured but glanced at, so it is said in the one unit a person would say it in and
// never in two. Always floored — a link with fifty-nine minutes left has "59 minutes left" and not an
// hour, because the one thing this must never do is promise more time than there is.
export function remainingText(t: Translate, untilUnixSeconds: number, nowUnixSeconds: number): string {
  const left = untilUnixSeconds - nowUnixSeconds;

  if (left <= 0) {
    return t("common.label.expired");
  }

  if (left < 60) {
    return t("common.label.left_under_minute");
  }

  if (left < 3600) {
    return t("common.label.left_minutes", { n: countText(Math.floor(left / 60)) });
  }

  if (left < 86_400) {
    return t("common.label.left_hours", { n: countText(Math.floor(left / 3600)) });
  }

  return t("common.label.left_days", { n: countText(Math.floor(left / 86_400)) });
}

// The same, for a life that may have no end. A link made to stand has no time to count down to,
// so what stands in that place is the word for what it is rather than a blank or a span of its
// own invention.
export function shareLeftText(t: Translate, expiresAt: number | null, nowUnixSeconds: number): string {
  return expiresAt === null ? t(FOREVER_LABEL) : remainingText(t, expiresAt, nowUnixSeconds);
}

// How often a line counting down is moved on unless it asks for finer. A countdown said in minutes
// at the finest is moved every half minute, close enough that no reader ever sees a figure that is
// wrong; one said to the second asks for a tick of a second.
const TICK_MS = 30_000;

// The moment, for a screen with a countdown on it, moved while the screen stands so the line does
// not go stale in front of whoever is reading it. `sync` puts it forward at once, which is what a
// screen wants the instant it makes the thing being counted down: the first figure drawn is then
// a full span rather than one up to half a minute short of it.
//
// Nothing ticks on the server, which draws a page once and has nobody standing in front of it.
export function useNowSeconds(everyMs: number = TICK_MS): { now: Ref<number>; sync: () => void } {
  const now = ref(Math.floor(Date.now() / 1000));
  const sync = (): void => {
    now.value = Math.floor(Date.now() / 1000);
  };

  if (import.meta.client) {
    const ticking = setInterval(sync, everyMs);

    onScopeDispose(() => clearInterval(ticking));
  }

  return { now, sync };
}

// A time is unix seconds wherever it is handed over; a value that could only be milliseconds is
// read as such rather than landing in the year 55000.
export function toUnixSeconds(value: number): number {
  return value > 1e11 ? Math.floor(value / 1000) : value;
}
