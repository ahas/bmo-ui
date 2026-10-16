// The shape of the layer's wording (`docs/wording.md`). The layer holds no words and no engine: a
// component asks the host's i18n module, and a domain module with words to say is handed a translator
// of this shape by its caller. A host's own code and tests hand the layer one of the same shape.

export type WordingParams = Record<string, string | number>;

// What a pure function is handed when it has words to say. A screen passes its `t`; a test passes a
// translator of its own.
export type Translate = (key: string, params?: WordingParams) => string;

// A language pack as it stands in its file: groups of groups, ending in the words.
export type Pack = { [key: string]: string | Pack };
