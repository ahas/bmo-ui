import postcss from "postcss";

// A fenced block as a host's renderer stands it, and the layer's own rules for it read out of the
// stylesheet as it ships (`docs/boundary.md`, "Classes and keyframes"). The markup is written here
// by hand, the shape the code-copy, code-colour and diagram modules read, so what they are checked
// against is the shape the layer states and not any one renderer's.

const css = await Bun.file(new URL("../../app/assets/css/main.css", import.meta.url)).text();

function namesRenderedText(selector: string): boolean {
  return selector.includes(".markdown");
}

// Every rule of the stylesheet whose selector names one of the rendered text's classes, and every
// media block holding one. A statement such as an import has no block to hold one.
export function fencedRules(): string {
  const picked: string[] = [];

  postcss.parse(css).each((node) => {
    if (node.type === "rule" && namesRenderedText(node.selector)) {
      picked.push(node.toString());
    } else if (node.type === "atrule" && node.nodes !== undefined && node.some((child) => child.type === "rule" && namesRenderedText(child.selector))) {
      picked.push(node.toString());
    }
  });

  return picked.join("\n");
}

// The copy button's two marks: the one it stands with and the one it shows once it has copied.
const MARKS =
  '<svg class="markdown-copy-idle" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" /></svg>' +
  '<svg class="markdown-copy-done" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" /></svg>';

// A fenced block's box: its language at its head and on the box where the fence names one, its
// text as written, and its copy button beside it named in the words given.
export function fencedBlock(code: string, language: string | null, copy: string): string {
  const named = language === null ? "" : ` data-language="${Bun.escapeHTML(language)}"`;
  const head = language === null ? "" : `<div class="markdown-code-head"><span class="markdown-code-language">${Bun.escapeHTML(language)}</span></div>`;
  const label = Bun.escapeHTML(copy);

  return `<div class="markdown-code"${named}>${head}<pre><code>${Bun.escapeHTML(code)}</code></pre><button type="button" class="markdown-copy" data-copy aria-label="${label}" data-tooltip="${label}">${MARKS}</button></div>`;
}

// A diagram's place, holding its source as the code block it was written as.
export function diagramPlace(source: string): string {
  return `<div class="markdown-diagram" data-diagram><pre><code>${Bun.escapeHTML(source)}</code></pre></div>`;
}
