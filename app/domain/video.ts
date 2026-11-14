// How the video player behaves, apart from the element it drives (`docs/components.md`, "The video
// player"): the keys it answers, the speeds it offers, how far a skip goes, how often it tells where it
// stands, how a picture is turned, and the shape its still takes in a message. What a host keeps of a
// position, and which subtitle it shows first, are the host's.

/** How far a skip goes, in seconds. */
export const SKIP_SECONDS = 10;

/** How often the player tells where it stands while it plays. */
export const SAVE_EVERY_MS = 5_000;

/** How much a volume key moves the volume. */
export const VOLUME_STEP = 0.1;

/** The playback speeds offered, the normal one among them. */
export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

/** The line a subtitle stands on while the controls stand, counted up from the picture's foot, clear of them. */
export const CUE_LINE_OVER_CONTROLS = -4;

/** How long the controls stand after the pointer last moved over a playing video. */
export const CONTROLS_IDLE_MS = 2_500;

/** The tallest a still stands in a message, in rem; its width follows its shape. */
export const STILL_CAP_REM = 20;

/** Where the still's first frame is read from: a moment past the start, which a phone draws as well. */
export const FIRST_FRAME = "#t=0.1";

export type PlayerAction = "toggle" | "back" | "forward" | "louder" | "quieter" | "fullscreen" | "turn" | "mute" | "captions";

/** A subtitle the player offers, by the number its host knows it by. */
export interface PlayerTrack {
  id: number;
  src: string;
  label: string;
  language: string;
}

/** A video's own width and height, or any two numbers in the same ratio. */
export interface VideoShape {
  width: number;
  height: number;
}

/** The action a key stands for, or none: space, the arrows, f, m, c and r. */
export function keyAction(key: string): PlayerAction | null {
  switch (key) {
    case " ":
    case "k":
      return "toggle";
    case "ArrowLeft":
    case "j":
      return "back";
    case "ArrowRight":
    case "l":
      return "forward";
    case "ArrowUp":
      return "louder";
    case "ArrowDown":
      return "quieter";
    case "f":
    case "F":
      return "fullscreen";
    case "r":
    case "R":
      return "turn";
    case "m":
    case "M":
      return "mute";
    case "c":
    case "C":
      return "captions";
    default:
      return null;
  }
}

/** Where a skip lands: never before the start, and never past the end where the end is known. */
export function skipTo(now: number, by: number, length: number | null): number {
  const to = Math.max(0, now + by);

  return length === null ? to : Math.min(length, to);
}

/** A volume moved by a step, held between nought and one. */
export function steppedVolume(level: number, by: number): number {
  return Math.round(Math.min(1, Math.max(0, level + by)) * 100) / 100;
}

/** A speed as the player names it: `1.25×`. */
export function speedText(speed: number): string {
  return `${speed}×`;
}

/** The subtitle the captions key turns to: the last one shown where none shows, else none. */
export function toggledTrack(shown: number | null, remembered: number | null, tracks: Pick<PlayerTrack, "id">[]): number | null {
  if (shown !== null) return null;
  if (remembered !== null && tracks.some((one) => one.id === remembered)) return remembered;

  return tracks[0]?.id ?? null;
}

/** The next quarter turn of a picture the browser cannot turn by the screen's orientation. */
export function nextTurn(degrees: number): number {
  return (degrees + 90) % 360;
}

/** The orientation to lock the screen to: the other one than it stands in. */
export function otherOrientation(current: string | undefined): "landscape" | "portrait" {
  return current?.startsWith("landscape") ? "portrait" : "landscape";
}

/**
 * The picture's box in a player of a given size, turned by some degrees: on its side its width takes the player's
 * height and its height the player's width, so the turned picture fits the player and is not cut.
 */
export function turnedBox(degrees: number, width: number, height: number): Record<string, string> {
  if (degrees === 0) return {};

  const sideways = degrees % 180 !== 0;

  return {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: `${sideways ? height : width}px`,
    height: `${sideways ? width : height}px`,
    maxWidth: "none",
    transform: `translate(-50%, -50%) rotate(${degrees}deg)`
  };
}

/**
 * The box a still's picture stands in, from the video's shape: its own ratio at the width that makes it as tall as the
 * cap, which the picture's own room narrows further, so it holds its size before the file has answered and asks a box
 * fitted to what it holds for that width. A shape not known yet leaves the box to the picture.
 */
export function stillBox(shape: VideoShape | null): { aspectRatio: string; width: string } | null {
  if (shape === null || !(shape.width > 0) || !(shape.height > 0)) return null;

  return { aspectRatio: `${shape.width} / ${shape.height}`, width: `${((STILL_CAP_REM * shape.width) / shape.height).toFixed(3)}rem` };
}

/** The address a still reads its first frame from: the video's own, at a moment past its start unless it names one. */
export function firstFrameOf(src: string): string {
  return src.includes("#") ? src : `${src}${FIRST_FRAME}`;
}
