import { FOREVER_LABEL, formatShortDay } from "./time";

import type { Translate } from "../../shared/wording";

// A share link as the one dialog that makes and ends links reads it, whatever it hands out
// (`docs/components.md`, "Share links"). The dialog keeps the mechanism — the form, the address,
// the link's end, the copy — and the host hands it the road its links are read, made and ended by,
// with the spans it offers.

export interface ShareLink {
  token: string;
  // When the link stops opening, in unix seconds, and null where it never does.
  expiresAt: number | null;
}

// One span a link can be made to live for: the host's own value, and the words it is chosen by.
export interface ShareSpan {
  value: string;
  label: string;
}

export interface ShareRoad {
  // The page the link opens, as a path read against the page the dialog stands on or as a whole
  // address.
  page: (link: ShareLink) => string;
  // The link that stands, or null where there is none.
  read: () => Promise<ShareLink | null>;
  // A link made to live as long as the span's value says.
  make: (span: string) => Promise<ShareLink>;
  remove: (link: ShareLink) => Promise<void>;
}

// What the screen behind the dialog is told of a link, which it may show without holding the link.
export interface ShareMark {
  expiresAt: number | null;
}

// Whether a link has passed its end. A link with no end never has.
export function shareEnded(expiresAt: number | null, nowUnixSeconds: number): boolean {
  return expiresAt !== null && expiresAt <= nowUnixSeconds;
}

// A link's end as every screen names it: the day it stands until, never the time left, which reads
// a day short or long as the hours turn. A link with no end says so, and one past its end says it
// has ended rather than naming a day gone by.
export function shareUntilText(t: Translate, expiresAt: number | null, nowUnixSeconds: number): string {
  if (expiresAt === null) {
    return t(FOREVER_LABEL);
  }

  if (shareEnded(expiresAt, nowUnixSeconds)) {
    return t("common.label.expired");
  }

  return t("common.label.share_until", { date: formatShortDay(t, expiresAt) });
}
