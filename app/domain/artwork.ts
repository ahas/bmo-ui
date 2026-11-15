// The shapes a card's picture stands at, and how a picture and a row of them find theirs
// (`docs/components.md`, "Artwork"). Each shape carries its own ratio and the class that draws it, so
// a frame asks the shape and nothing keeps a table of them.

/** A picture's own width and height, or any two numbers in the same ratio. */
export interface PictureSize {
  width: number;
  height: number;
}

/** One shape a card's picture stands at. */
export interface ArtworkShape {
  /** The shape's name, which a test and a host's own data read it by. */
  name: "portrait" | "landscape" | "square";
  /** Its width over its height. */
  ratio: number;
  /** The utility class that holds a box at the shape. */
  aspect: string;
}

export const PORTRAIT: ArtworkShape = { name: "portrait", ratio: 2 / 3, aspect: "aspect-[2/3]" };

export const LANDSCAPE: ArtworkShape = { name: "landscape", ratio: 16 / 9, aspect: "aspect-video" };

export const SQUARE: ArtworkShape = { name: "square", ratio: 1, aspect: "aspect-square" };

/** The shapes, in the order a tie between them is broken. */
export const ARTWORK_SHAPES: readonly ArtworkShape[] = [LANDSCAPE, PORTRAIT, SQUARE];

/** A picture at least this wide for its height stands landscape. */
export const LANDSCAPE_FROM = 4 / 3;

/** A picture wider than this for its height, and short of landscape, stands square. */
export const SQUARE_PAST = 4 / 5;

/** How far a picture's ratio may stand from its frame's, as a share, and still fill it edge to edge. */
export const FILLS_WITHIN = 0.01;

function known(size: PictureSize | null | undefined): size is PictureSize {
  return size !== null && size !== undefined && size.width > 0 && size.height > 0;
}

/** The shape a picture of a size stands at, or none where its size is not known. */
export function shapeOf(size: PictureSize | null | undefined): ArtworkShape | null {
  if (!known(size)) return null;

  const ratio = size.width / size.height;

  if (ratio >= LANDSCAPE_FROM) return LANDSCAPE;

  return ratio > SQUARE_PAST ? SQUARE : PORTRAIT;
}

/**
 * The one shape a row of pictures stands at: the one most of them have, a tie broken in the shapes' own order,
 * and `otherwise` where no picture's size is known.
 */
export function rowShape(sizes: readonly (PictureSize | null | undefined)[], otherwise: ArtworkShape): ArtworkShape {
  const counts = new Map<ArtworkShape, number>();

  for (const size of sizes) {
    const shape = shapeOf(size);

    if (shape) counts.set(shape, (counts.get(shape) ?? 0) + 1);
  }

  let chosen: ArtworkShape | null = null;

  for (const shape of ARTWORK_SHAPES) if ((counts.get(shape) ?? 0) > (chosen ? (counts.get(chosen) ?? 0) : 0)) chosen = shape;

  return chosen ?? otherwise;
}

/** Whether a picture of a size fills a frame of a shape edge to edge, so no ground stands round it. */
export function fillsShape(size: PictureSize | null | undefined, shape: ArtworkShape): boolean {
  if (!known(size)) return false;

  return Math.abs(size.width / size.height - shape.ratio) / shape.ratio <= FILLS_WITHIN;
}
