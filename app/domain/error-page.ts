import type { WordingKey } from "../../shared/wording-keys";

// A page's error as one of the four cases the error page says (`docs/components.md`, "The error page").
export type ErrorKind = "not_found" | "forbidden" | "unreachable" | "failed";

// What the error page draws for a case: its icon, the keys of its title and its line, and its second action,
// going back to the page before or loading the page again.
export type ErrorCase = {
  icon: string;
  title: WordingKey;
  line: WordingKey;
  second: "back" | "retry";
};

export const ERROR_CASES: Record<ErrorKind, ErrorCase> = {
  not_found: {
    icon: "i-material-symbols-search-off",
    title: "common.title.page_not_found",
    line: "common.message.page_not_found",
    second: "back"
  },
  forbidden: {
    icon: "i-material-symbols-lock-outline",
    title: "common.title.no_permission",
    line: "common.message.no_permission",
    second: "back"
  },
  unreachable: {
    icon: "i-material-symbols-wifi-off",
    title: "common.title.unreachable",
    line: "common.message.unreachable",
    second: "retry"
  },
  failed: {
    icon: "i-material-symbols-error-outline",
    title: "common.title.page_failed",
    line: "common.message.page_failed",
    second: "retry"
  }
};

const NOT_FOUND = new Set([404, 410]);
const FORBIDDEN = new Set([401, 403]);
const UNREACHABLE = new Set([502, 503, 504]);

// The case an error stands for: by its status, unless the browser reports itself offline, when nothing it
// asks for can arrive whatever the status says. An error with no status is a failure.
export function errorKind(status: number | undefined, offline = false): ErrorKind {
  if (offline) return "unreachable";
  if (status === undefined) return "failed";
  if (NOT_FOUND.has(status)) return "not_found";
  if (FORBIDDEN.has(status)) return "forbidden";
  if (UNREACHABLE.has(status)) return "unreachable";

  return "failed";
}
