import ui from "@nuxt/ui/vue-plugin";
import { createApp, defineComponent, h } from "vue";
import { createI18n } from "vue-i18n";

import LoadingImage from "../../app/components/LoadingImage.vue";
import sheet from "./picture-copies-harness.css?inline";

import type { Component } from "vue";

// Two loading pictures of one whole picture at one width (`docs/components.md`, "Skeletons and loading"), on a page
// that shows nothing else: one handed the copies its host serves and the width it is drawn at, one handed only its
// own file. The page's query names the addresses and the width.

const asked = new URLSearchParams(location.search);
const whole = asked.get("whole")!;
const sources = asked.get("sources")!;
const width = Number(asked.get("width"));

// The picture's props reach the library's types through its own, which the render function's overloads do not work
// through, so it is handed to them as any component.
const Picture = LoadingImage as Component;

const Page = defineComponent(() => () =>
  h("div", { style: "display:flex;gap:8px;align-items:start" }, [
    h("div", { "data-picture": "copies" }, [h(Picture, { src: whole, alt: "copies", sources, sizes: `${width}px`, eager: true, imageClass: "block", style: `width:${width}px` })]),
    h("div", { "data-picture": "whole" }, [h(Picture, { src: whole, alt: "whole", eager: true, imageClass: "block" })])
  ])
);

const style = document.createElement("style");

style.textContent = `${sheet} [data-picture] img { width: ${width}px; height: ${width}px; }`;
document.head.append(style);

Object.assign(useAppConfig(), { bmoUi: { locale: "en" } });

createApp(Page)
  .use(createI18n({ legacy: false, locale: "en", messages: { en: { common: { status: { picture_loading: "Loading" }, error: { picture_failed: "Failed" } } } }, missingWarn: false, fallbackWarn: false }))
  .use(ui)
  .mount("#page");
