import { describe, expect, test } from "bun:test";

// The player's volume (`docs/components.md`, "Skeletons and loading"), read off the file that ships:
// where the control stands, what names it for a screen reader, and how the page's volume reaches the
// element that plays.

const player = await Bun.file(new URL("../../app/components/AudioPlayer.vue", import.meta.url)).text();

describe("the player's volume", () => {
  test("opens as a popover on a button beside the download", () => {
    const popover = player.indexOf("<UPopover");
    const download = player.indexOf("common.aria.download_named");

    expect(popover).toBeGreaterThan(-1);
    expect(popover).toBeLessThan(download);
    expect(player).toContain('<UPopover v-model:open="volumeOpen"');
    expect(player.slice(popover, player.indexOf("</UPopover>"))).toContain("<IconButton data-volume :label=\"$t('common.label.volume')\"");
  });

  test("holds a mute toggle named by what it does next, and a slider named for the volume", () => {
    expect(player).toContain(":label=\"silent ? $t('common.action.unmute') : $t('common.action.mute')\"");
    expect(player).toContain('@click="volume.toggleMute()"');
    expect(player).toContain("<USlider");
    expect(player).toContain(':model-value="Math.round(volume.heard.value * 100)"');
    expect(player).toContain('@update:model-value="slideTo"');
  });

  test("stands the page's one volume on its element as it mounts and whenever it moves", () => {
    expect(player).toContain('import { useVolume } from "../domain/volume";');
    expect(player).toContain("watch(volume.loudness, standVolume);");
    expect(player).toMatch(/onMounted\(\(\) => \{\n {2}standVolume\(\);/);
    expect(player).toContain("audio.volume = volume.loudness.value.level;");
    expect(player).toContain("audio.muted = volume.loudness.value.muted;");
  });
});
