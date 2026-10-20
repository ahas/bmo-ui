// The address a console bundle's screen calls a service at (`docs/console-bundles.md`, "How a bundle
// mounts"): the host's relay base, the service's name, then the path as the service's own API writes
// it. The base is the host's to state; where it states none, a service is called at its name from the
// root. The setting is read each time an address is made, so nothing is read before the app stands.
export function relayAddress(serviceName: string, path = ""): string {
  const base = (useAppConfig().bmoUi.relayBase ?? "").replace(/\/+$/, "");
  const rest = path === "" || path.startsWith("/") || path.startsWith("?") ? path : `/${path}`;

  return `${base}/${serviceName}${rest}`;
}
