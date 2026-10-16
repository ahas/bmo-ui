// How figures and times are written, the host's to state (`docs/boundary.md`, "What the host owes").
// Nothing is set here, so each default stands until the host states a value: the runtime's own zone
// and locale, and dayjs's built-in locale for the words of a date.
export default defineAppConfig({
  bmoUi: {} as {
    // An IANA zone name every time is shown in.
    zone?: string;
    // A BCP 47 tag figures are written in and letter case is folded in.
    locale?: string;
    // The name of a dayjs locale the host has loaded.
    dateLocale?: string;
  }
});
