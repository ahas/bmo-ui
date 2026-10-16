import * as monaco from "monaco-editor/editor/editor.api";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";

import "monaco-editor/languages/definitions/register.all.js";

import { CODE_THEMES } from "./code-themes";
import { codeLanguage } from "../../shared/code-language";

// The editor a file is shown in, read-only and coloured. It is Monaco, and Monaco is a whole
// editor where the layer wants one corner of it, so what is taken is cut down twice. The editor's
// own api is imported rather than its main bundle: the main bundle carries every language it has
// and the css, html, json and typescript language services besides, each of which wants a worker of
// its own to tell a file what is wrong with it, and nothing here is ever going to be typed into.
// What is added back is every tokenizer the editor has, so any file a reader opens is coloured. A
// tokenizer's register file only puts a loader on the list — the tokenizer itself is fetched the
// first time a file of that language is opened — so the whole list costs nothing until a file asks
// for one.
//
// Every path above is a path into the package's ESM tree, which is what its exports map every
// subpath onto; the minified build beside it is an AMD loader that fetches its own bundle at run
// time, and the editor here fetches nothing the host was not built with.
//
// Nothing in here may be reached from the server: a page renders on the server and Monaco is a
// browser editor, so the module is asked for with a dynamic import once a view is actually on the
// screen. That is also what keeps it out of the page's entry and in a chunk of its own.

// The worker Monaco starts for itself, built by the host's bundler. Left unsaid, Monaco falls back
// to fetching a worker from a path it makes up, which is a path the host does not serve; a worker
// built in keeps the editor working on a page that has only what it was built with.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };

// The language a file is coloured in. The layer's own reading of the path comes first (the
// code-language module), since it settles the files the editor would read wrongly on its own;
// after that the editor's list of languages is asked by the file's whole name and then by its
// ending, and a file nobody claims stands as plain text.
export function languageOf(path: string): string {
  const own = codeLanguage(path);

  if (own !== "plaintext") {
    return own;
  }

  const name = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
  const languages = monaco.languages.getLanguages();
  const byName = languages.find((one) => one.filenames?.some((named) => named.toLowerCase() === name));

  if (byName !== undefined) {
    return byName.id;
  }

  const byEnd = languages.find((one) => one.extensions?.some((end) => name.endsWith(end.toLowerCase())));

  return byEnd?.id ?? "plaintext";
}

// The language a fenced block's word names — `shell`, `sh`, `ts` — or null where it names none the
// editor can colour. The word is read as a file ending first, by the layer's own reading, then
// against the editor's languages by their name and their other names, then by their file endings.
export function fenceLanguage(word: string): string | null {
  const named = word.toLowerCase();
  const own = codeLanguage(`fence.${named}`);

  if (own !== "plaintext") {
    return own;
  }

  const languages = monaco.languages.getLanguages();
  const found =
    languages.find((one) => one.id.toLowerCase() === named || one.aliases?.some((alias) => alias.toLowerCase() === named)) ??
    languages.find((one) => one.extensions?.some((end) => end.toLowerCase() === `.${named}`));

  return found === undefined || found.id === "plaintext" ? null : found.id;
}

// A code text coloured by the editor's tokenizer for a language, in the light or the dark theme, as
// the editor draws it: the HTML of its own lines, each run of the text in a span carrying its
// colour class (the code-colour module reads it back). The tab stop is one column, so every
// character of a line is drawn as exactly one.
//
// The colour classes are the editor's, and its stylesheet paints them for the theme set last, which
// is one for the whole page: a theme switch makes every coloured text stale, to be coloured again.
export async function colourised(text: string, language: string, dark: boolean): Promise<string> {
  monaco.editor.setTheme(themeName(dark));

  return await monaco.editor.colorize(text, language, { tabSize: 1 });
}

// The layer's own two themes (the code-themes module).
for (const { name, theme } of Object.values(CODE_THEMES)) {
  monaco.editor.defineTheme(name, theme);
}

// A diff, which the editor carries no tokenizer for, while a fenced block and a code view colour
// code with this one editor alone. It is the editor's own kind of tokenizer, and the reading is
// only the mark each line opens with: a file's head, a hunk's head, an added line, a removed line.
monaco.languages.register({ id: "diff", aliases: ["diff", "patch"], extensions: [".diff", ".patch"] });
monaco.languages.setMonarchTokensProvider("diff", {
  tokenizer: {
    root: [
      [/(?:diff|index|---|\+\+\+) .*/, "keyword"],
      [/@@.*/, "type"],
      [/\+.*/, "inserted.diff"],
      [/-.*/, "deleted.diff"],
      [/.+/, ""]
    ]
  }
});

function themeName(dark: boolean): string {
  return CODE_THEMES[dark ? "dark" : "light"].name;
}

// A text put into the editor as a model of its own, and the model it replaces thrown away once it
// no longer stands there. What comes back is the model now shown.
function replaceModel(
  editor: monaco.editor.IStandaloneCodeEditor,
  previous: monaco.editor.ITextModel | null,
  text: string,
  language: string
): monaco.editor.ITextModel {
  const made = monaco.editor.createModel(text, language);

  editor.setModel(made);
  previous?.dispose();

  return made;
}

// How the file stands. Read-only twice over — the model refuses an edit and the DOM itself is
// marked read-only, so a phone keyboard is never raised over it — and stripped of everything an
// editor does for somebody writing: no minimap, no suggestions, no menu on a right click.
//
// The face and its size are handed over rather than left to the cascade, because Monaco measures
// its own font out of these options and lays every line out on that measure. The face is the
// layer's fixed-width stack, named here as the variable the stylesheet defines it as so there is
// still one place that says what it is, at the size of the library's text-sm.
const VIEW: monaco.editor.IStandaloneEditorConstructionOptions = {
  readOnly: true,
  domReadOnly: true,
  // The view's box is a splitter's share of the screen at one moment and a tab's whole width at
  // the next, and behind a tab it has no size at all. Monaco watches its own box for all of that,
  // so there is nothing here for the host to measure or to listen for.
  automaticLayout: true,
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  lineHeight: 20,
  lineNumbers: "on",
  minimap: { enabled: false },
  contextmenu: false,
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  renderLineHighlight: "line",
  overviewRulerLanes: 0,
  overviewRulerBorder: false,
  scrollBeyondLastLine: false,
  scrollbar: { useShadows: false },
  padding: { top: 4, bottom: 4 }
};

// The line the file was opened at, marked across the whole of it — the numbers down the side as
// well as the code — in the token the library raises a row in, so the mark belongs to the page
// rather than being whatever an editor happens to call a highlight.
const OPEN_LINE: monaco.editor.IModelDecorationOptions = {
  isWholeLine: true,
  className: "bg-elevated",
  marginClassName: "bg-elevated"
};

// What a code view holds while it is open: one file at a time, the screen mode, and the end of it
// when its box goes away.
export interface CodeView {
  // A file's text, coloured in the language its path says, opened at a line.
  show: (text: string, path: string, line: number | null) => void;
  // Another line of the file standing now marked and brought to the middle, as the host asks.
  mark: (line: number) => void;
  paint: (dark: boolean) => void;
  close: () => void;
}

export function openCodeView(box: HTMLElement, dark: boolean): CodeView {
  const editor = monaco.editor.create(box, { ...VIEW, theme: themeName(dark) });
  const opened = editor.createDecorationsCollection();

  // The model belongs to the file rather than to the editor: a file is opened in the language its
  // path says, and a language is a property of a model. The one it replaces is let go by hand,
  // since a model made here is not the editor's to dispose of.
  let model: monaco.editor.ITextModel | null = null;

  // The line the view was opened at, and whether it has actually been brought into view. The middle
  // of a box is the middle of its height, so a view behind a tab has nowhere to bring a line to,
  // and one brought there anyway lands at the top and stays there. Whether there is a middle to aim
  // at is asked of the box itself rather than of the editor, which holds on to the last size it was
  // given and would answer with a height the box no longer has; and where there is none the editor
  // is left to say when it has been measured again — which is the moment a hidden tab is chosen —
  // and the line goes over then.
  let opening: number | null = null;
  let shown = false;

  function reveal(measure: boolean): void {
    if (opening === null || shown || box.clientHeight === 0) {
      return;
    }

    // A box that has just been put back on the screen is a size the editor has not read yet, and
    // the middle it would work out is the middle of the box it was showing before.
    if (measure) {
      editor.layout();
    }

    editor.revealLineInCenter(opening);
    shown = true;
  }

  editor.onDidLayoutChange(() => reveal(false));

  return {
    show(text: string, path: string, line: number | null): void {
      model = replaceModel(editor, model, text, languageOf(path));

      opening = line;
      shown = false;

      // The mark goes on after the model, since a decoration belongs to the model it was drawn on
      // and the one before this has just been let go.
      opened.set(line === null ? [] : [{ range: new monaco.Range(line, 1, line, 1), options: OPEN_LINE }]);

      reveal(true);
    },

    mark(line: number): void {
      opening = line;
      shown = false;
      opened.set([{ range: new monaco.Range(line, 1, line, 1), options: OPEN_LINE }]);
      reveal(true);
    },

    paint(dark: boolean): void {
      monaco.editor.setTheme(themeName(dark));
    },

    close(): void {
      editor.dispose();
      model?.dispose();
    }
  };
}

// A markdown document's source as a host's document view shows it: the same read-only editor, with
// long lines wrapped, since a document's paragraph is often one line and a reader should not scroll
// sideways through it. What the view needs beyond showing it is where the reader is — the scroll
// offset, the line at the top, the offset of any line — and what the reader selected.
export interface SourceSelection {
  text: string;
  startLine: number;
  // Where the end of the selection stands on the screen, for a button to be put beside it.
  rect: { top: number; left: number; height: number };
}

export interface SourceView {
  show: (text: string) => void;
  paint: (dark: boolean) => void;
  // Whether long lines wrap. A folded pane has no width to wrap to, and wrapping a long document
  // to nothing costs the editor a line per character.
  wrap: (on: boolean) => void;
  scrollTop: () => number;
  setScrollTop: (top: number) => void;
  scrollHeight: () => number;
  lineTop: (line: number) => number;
  topLine: () => number;
  revealLine: (line: number) => void;
  lineCount: () => number;
  onScroll: (listener: (top: number) => void) => void;
  onSelection: (listener: (selection: SourceSelection | null) => void) => void;
  close: () => void;
}

export function openSourceView(box: HTMLElement, dark: boolean): SourceView {
  const editor = monaco.editor.create(box, { ...VIEW, theme: themeName(dark), wordWrap: "on", lineHeight: 22 });
  let model: monaco.editor.ITextModel | null = null;

  return {
    show(text: string): void {
      model = replaceModel(editor, model, text, "markdown");
    },

    paint(dark: boolean): void {
      monaco.editor.setTheme(themeName(dark));
    },

    wrap: (on) => editor.updateOptions({ wordWrap: on ? "on" : "off" }),
    scrollTop: () => editor.getScrollTop(),
    setScrollTop: (top) => editor.setScrollTop(top, monaco.editor.ScrollType.Immediate),
    scrollHeight: () => Math.max(0, editor.getScrollHeight() - editor.getLayoutInfo().height),
    lineTop: (line) => editor.getTopForLineNumber(Math.max(1, line)),
    topLine: () => editor.getVisibleRanges()[0]?.startLineNumber ?? 1,
    lineCount: () => model?.getLineCount() ?? 0,

    revealLine(line: number): void {
      editor.setScrollTop(editor.getTopForLineNumber(Math.max(1, line)), monaco.editor.ScrollType.Immediate);
    },

    onScroll(listener): void {
      editor.onDidScrollChange((event) => {
        if (event.scrollTopChanged) {
          listener(event.scrollTop);
        }
      });
    },

    onSelection(listener): void {
      editor.onDidChangeCursorSelection((event) => {
        const selection = event.selection;
        const text = model === null || selection.isEmpty() ? "" : model.getValueInRange(selection);
        const end = editor.getScrolledVisiblePosition(selection.getEndPosition());

        if (text.trim() === "" || end === null) {
          listener(null);

          return;
        }

        const frame = box.getBoundingClientRect();

        listener({
          text,
          startLine: selection.startLineNumber,
          rect: { top: frame.top + end.top, left: frame.left + end.left, height: end.height }
        });
      });
    },

    close(): void {
      editor.dispose();
      model?.dispose();
    }
  };
}
