import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright-core";

import { BROWSER_HOOK_MS, touchReady } from "./touch";

import type { Browser, Page } from "playwright-core";

// The audio player as a custom element (`docs/components.md`, "The audio player as an element"), built
// as `bun run elements` builds it and loaded by a page that is no app of the layer's: a page in a sandbox
// of its own origin, which may load scripts and sounds over the web and fetch only its own address, as a
// hosted page is let. The element mounts where the page writes it, plays its sound, opens its volume
// inside itself, and stops for another one starting. Skipped where the browser build is not on the
// machine, as every browser check is.

const ready = touchReady();
const ROOT = new URL("../../", import.meta.url).pathname;

// A second of a tone, as a WAV file: a sound any browser plays with no codec of its own.
function tone(): Uint8Array {
  const rate = 8000;
  const samples = rate;
  const bytes = new Uint8Array(44 + samples * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (at: number, text: string) => [...text].forEach((letter, step) => view.setUint8(at + step, letter.charCodeAt(0)));

  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, samples * 2, true);

  for (let at = 0; at < samples; at += 1) {
    view.setInt16(44 + at * 2, Math.round(Math.sin((at / rate) * 2 * Math.PI * 440) * 12000 * (at / samples)), true);
  }

  return bytes;
}

const WORDS = {
  common: {
    action: { play: "Play", pause: "Pause", mute: "Mute", unmute: "Unmute" },
    label: { volume: "Volume", play_position: "Place", unplayable: "Cannot play" },
    aria: { download_named: "Download {name}" },
    status: { loading: "Loading" }
  }
};

// The page: its own words around two players, the script loaded by address, and the element defined
// once the script has run.
const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<script src="/bmo-audio-player.js" defer></script>
<script>document.addEventListener("DOMContentLoaded", () => BmoAudioPlayer.define({ words: ${JSON.stringify(WORDS)} }));</script>
</head><body><p>Listen</p>
<bmo-audio-player id="one" src="/tone.wav" name="tone.wav" scheme="dark"></bmo-audio-player>
<bmo-audio-player id="two" src="/tone.wav?again" scheme="light"></bmo-audio-player>
</body></html>`;

// What a hosted page is let do, with the web its scripts and sounds come from being this server.
const POLICY = "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline' http:; style-src 'unsafe-inline'; img-src data: blob:; media-src http:; connect-src 'self'";

// Where the page is opened: an address the browser is answered for by the test itself.
const ORIGIN = "http://page.test";

let out = "";
let browser: Browser;
let page: Page;
const refused: string[] = [];

beforeAll(async () => {
  if (!ready) return;

  out = mkdtempSync(join(tmpdir(), "bmo-ui-elements-"));

  const built = Bun.spawnSync(["bun", "x", "vite", "build", "--config", "elements.config.ts", "--outDir", out, "--logLevel", "error"], { cwd: ROOT });

  if (built.exitCode !== 0) throw new Error(`the element build failed: ${built.stderr.toString()}`);

  const [script, sound] = [await Bun.file(join(out, "bmo-audio-player.js")).text(), Buffer.from(tone())];

  browser = await chromium.launch();
  page = await browser.newPage({ viewport: { width: 640, height: 480 } });
  await page.route(`${ORIGIN}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path === "/bmo-audio-player.js") return route.fulfill({ contentType: "text/javascript", body: script });
    // The waveform is fetched from a page of an origin of its own, so the sound answers any origin.
    if (path === "/tone.wav") return route.fulfill({ contentType: "audio/wav", headers: { "access-control-allow-origin": "*" }, body: sound });

    return route.fulfill({ contentType: "text/html; charset=utf-8", headers: { "content-security-policy": POLICY }, body: PAGE });
  });
  page.on("console", (message) => {
    if (message.type() === "error") refused.push(message.text());
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForFunction(() => document.querySelector("#two")?.shadowRoot?.querySelector("[data-attachment]") !== null);
}, BROWSER_HOOK_MS);

afterAll(async () => {
  await browser?.close();

  if (out !== "") rmSync(out, { recursive: true, force: true });
}, BROWSER_HOOK_MS);

// Whether each element's own sound is playing, in the page's order.
async function playing(): Promise<boolean[]> {
  return page.evaluate(() => [...document.querySelectorAll("bmo-audio-player")].map((element) => element.shadowRoot?.querySelector("audio")?.paused === false));
}

describe.skipIf(!ready)("the audio player as an element", () => {
  test("mounts the player where the page wrote it, inside a shadow root, named and on its scheme's ground", async () => {
    const seen = await page.evaluate(() => {
      const one = document.querySelector("#one")!.shadowRoot!;
      const two = document.querySelector("#two")!.shadowRoot!;

      return {
        names: [one, two].map((root) => root.querySelector("[data-attachment]")?.getAttribute("aria-label")),
        grounds: [one, two].map((root) => root.querySelector(".audio-element")?.className),
        sources: [one, two].map((root) => root.querySelector("audio")?.getAttribute("src")),
        lightDocument: document.querySelectorAll("[data-attachment]").length
      };
    });

    expect(seen.names).toEqual(["tone.wav", "tone.wav"]);
    expect(seen.grounds.map((name) => name?.split(" ")[0])).toEqual(["dark", "light"]);
    expect(seen.sources).toEqual(["/tone.wav", "/tone.wav?again"]);
    expect(seen.lightDocument).toBe(0);
  });

  test("plays its sound from its address, and one starting stops the other", async () => {
    await page.locator("#one button.rounded-full").click();
    await page.waitForFunction(() => (document.querySelector("#one")!.shadowRoot!.querySelector("audio")!.currentTime ?? 0) > 0.1);
    expect(await playing()).toEqual([true, false]);

    await page.locator("#two button.rounded-full").click();
    await page.waitForFunction(() => document.querySelector("#one")!.shadowRoot!.querySelector("audio")!.paused);
    expect(await playing()).toEqual([false, true]);

    await page.evaluate(() => (document.querySelector("#two") as HTMLElement & { pause: () => void }).pause());
    expect(await playing()).toEqual([false, false]);
  });

  test("draws its waveform from the sound it fetched", async () => {
    await page.waitForFunction(() => new Set([...document.querySelector("#one")!.shadowRoot!.querySelectorAll("[role=slider] > span:not([aria-hidden])")].map((bar) => (bar as HTMLElement).style.height)).size > 1);
  });

  test("opens its volume inside itself, a mute toggle and a slider", async () => {
    await page.locator("#one [data-volume]").click();

    const opened = await page.evaluate(() => {
      const root = document.querySelector("#one")!.shadowRoot!;

      return { slider: root.querySelectorAll("[role=slider]").length, mute: root.querySelector("button[aria-label=Mute]") !== null, outside: document.body.querySelectorAll("[role=dialog]").length };
    });

    expect(opened).toEqual({ slider: 2, mute: true, outside: 0 });
  });

  test("loads nothing but its script and its sound", () => {
    expect(refused).toEqual([]);
  });
});
