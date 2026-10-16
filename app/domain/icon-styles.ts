// The style the icon library writes for one icon the first time it is drawn: the icon's rule, held
// in the library's cascade layer where one is named, matched with no weight of its own where the
// library is told so (`docs/design.md`, "Fonts").
export interface IconStyleOptions {
  cssSelectorPrefix: string;
  cssLayer?: string | false | null;
}

// Whether a style element is one of those, read off the rule it opens with.
export function isIconStyle(node: Pick<Node, "nodeName" | "textContent">, options: IconStyleOptions): boolean {
  if (node.nodeName !== "STYLE") {
    return false;
  }

  const layer = options.cssLayer ? `@layer ${options.cssLayer} { ` : "";
  const text = node.textContent ?? "";

  if (!text.startsWith(layer)) {
    return false;
  }

  const rule = text.slice(layer.length);

  return rule.startsWith(`:where(.${options.cssSelectorPrefix}`) || rule.startsWith(`.${options.cssSelectorPrefix}`);
}
