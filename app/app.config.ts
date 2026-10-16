// The layer's own module, named by its path: the `#shared` alias is read against the host that
// extends the layer.
import { DEFAULT_THEME } from "../shared/themes";

export default defineAppConfig({
  ui: {
    // The library's own colours are the default theme's; a host states its reader's theme over them
    // in the page's head (`docs/design.md`, "Both on the page").
    colors: {
      primary: DEFAULT_THEME.accent,
      neutral: DEFAULT_THEME.neutral
    },
    // Every badge carries the class that darkens its colours in the light mode (the layer's
    // stylesheet), so its words read at 4.5:1 whatever shape and colour it is given. Nothing is drawn
    // under 14px, so the two small sizes keep their tight boxes and take the caption size.
    badge: {
      slots: {
        base: "badge-ink"
      },
      variants: {
        size: {
          xs: { base: "text-sm/4 px-1 py-0 gap-1 rounded-sm" },
          sm: { base: "text-sm/4 px-1.5 py-0.5 gap-1 rounded-sm" }
        }
      }
    }
  },
  // How figures and times are written, the host's to state (`docs/boundary.md`, "What the host
  // owes"). Nothing is set here, so each default stands until the host states a value: the runtime's
  // own zone and locale, and dayjs's built-in locale for the words of a date.
  bmoUi: {} as {
    // An IANA zone name every time is shown in.
    zone?: string;
    // A BCP 47 tag figures are written in and letter case is folded in.
    locale?: string;
    // The name of a dayjs locale the host has loaded.
    dateLocale?: string;
  }
});
