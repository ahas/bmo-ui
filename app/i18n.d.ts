// The translator a template asks with is the host's i18n module's (`docs/wording.md`, "The
// mechanism"). The layer installs no module, so its components are typed by the module's own
// declarations, read from the peer the host installs.
import type {} from "@nuxtjs/i18n";
