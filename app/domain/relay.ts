// The address a console bundle's screen calls a service at (`docs/console-bundles.md`, "How a bundle
// mounts"): the base path the app is served under, the host's relay base, the service's name, then the
// path as the service's own API writes it. The relay base is the host's to state; where it states none,
// a service is called at its name from the app's base path. The address is complete as given, so a
// screen hands the same one to the app's fetcher, to a picture's source, a link or a download. The
// settings are read each time an address is made, so nothing is read before the app stands.
export function relayAddress(serviceName: string, path = ""): string {
  const relayBase = (useAppConfig().bmoUi.relayBase ?? "").replace(/\/+$/, "");
  const rest = path === "" || path.startsWith("/") || path.startsWith("?") ? path : `/${path}`;

  return underAppBase(`${relayBase}/${serviceName}${rest}`);
}

// The address a screen opens a socket to its service at: the relay address over the page's own
// origin, in the socket scheme matching the page's. It reads the page's address, so it is made in the
// browser alone.
export function relaySocketAddress(serviceName: string, path = ""): string {
  const address = new URL(relayAddress(serviceName, path), location.href);

  address.protocol = address.protocol === "https:" ? "wss:" : "ws:";

  return address.href;
}

// An address from the root put under the app's base path, unless it already stands there: the base
// whole, or the base followed by a segment or a query. The app's fetcher reads the base by the same
// rule, so an address made here is not given it twice there.
function underAppBase(address: string): string {
  const base = useRuntimeConfig().app.baseURL.replace(/\/+$/, "");
  const after = address.charAt(base.length);
  const standing = address.startsWith(base) && (after === "" || after === "/" || after === "?");

  return base === "" || standing ? address : `${base}${address}`;
}
