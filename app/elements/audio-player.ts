import ui from "@nuxt/ui/vue-plugin";
import { defineCustomElement } from "vue";
import { createI18n } from "vue-i18n";

import { markPainted } from "../domain/loading";
import AudioPlayerElement from "./AudioPlayerElement.vue";
import sheet from "./audio-player.css?inline";

import type { I18nOptions, Locale } from "vue-i18n";

// The audio player as a custom element (`docs/components.md`, "The audio player as an element"), built
// into one script that carries everything it draws with: a page that is no app of the layer's loads the
// script and stands the player wherever it writes the element. The script defines nothing until the
// page calls `define` with the words the player says.

/** Words keyed as a language pack keys them: each a sentence, or the words under one more part of the key. */
export interface Words {
  [part: string]: string | Words;
}

/** What a page defines the element with. */
export interface AudioPlayerElementOptions {
  // The words the player says, keyed as the layer's language pack keys them (`docs/wording.md`).
  words: Words;
  // The language the words are in.
  locale?: string;
  // The element's name; `bmo-audio-player` where none is given.
  tag?: string;
}

/** The element's name where a page names none. */
export const AUDIO_PLAYER_TAG = "bmo-audio-player";

// The rules registering the custom properties the sheet animates and composes with, as the browser reads
// them out of the sheet. A property is registered for the whole document or not at all, so these stand in
// the page's own head as well.
function registrations(css: string): string {
  const read = new CSSStyleSheet();

  read.replaceSync(css);

  return [...read.cssRules]
    .filter((rule) => rule instanceof CSSPropertyRule)
    .map((rule) => rule.cssText)
    .join("");
}

/** Defines the element under its name, once; a second call for a name already defined changes nothing. */
export function define(options: AudioPlayerElementOptions): void {
  const tag = options.tag ?? AUDIO_PLAYER_TAG;

  if (customElements.get(tag) !== undefined) {
    return;
  }

  // A host's language pack narrows the engine's locale type to the languages the host carries, and the
  // host's typecheck reads this file; the element's words are in whatever language the page names, so
  // the locale and the words are handed over as the engine's own types.
  const locale = (options.locale ?? "en") as Locale;
  const messages = { [locale]: options.words } as I18nOptions["messages"];
  const i18n = createI18n({ legacy: false, locale, messages, missingWarn: false, fallbackWarn: false });
  const Base = defineCustomElement(AudioPlayerElement, {
    styles: [sheet],
    configureApp(app) {
      app.use(i18n);
      app.use(ui);
    }
  });

  // The element answers `play` and `pause` as an audio element does, so a page's own script moves it as
  // it moved the audio element it stands for.
  class AudioPlayer extends Base {
    play(): Promise<void> {
      return this.shadowRoot?.querySelector("audio")?.play() ?? Promise.resolve();
    }

    pause(): void {
      this.shadowRoot?.querySelector("audio")?.pause();
    }
  }

  const registered = document.createElement("style");

  registered.textContent = registrations(sheet);
  document.head.append(registered);
  markPainted();
  customElements.define(tag, AudioPlayer);
}
