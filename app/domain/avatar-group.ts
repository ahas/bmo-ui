import type { AvatarProps } from "@nuxt/ui";

// A row of faces (`docs/components.md`, "Avatar groups"): the library's avatars overlapping in one
// moving list, each on a ring of the ground it is drawn over, the rest past a most counted in a cap.

// One face of the row: its own lasting id, which keys it in the list, and the props the library's
// avatar takes. Its size is the group's.
export interface AvatarFace {
  id: string | number;
  avatar: Omit<AvatarProps, "size">;
}

export type FaceSize = NonNullable<AvatarProps["size"]>;

// How a face stands in the row at each of the library's avatar sizes, as the library's own group
// draws it: the ring as wide as the library's for the size, drawn as the face's item's own padding
// and ground so it folds with the face, and the overlap the library gives the size, taken with the
// two rings into one negative margin before every face but the first. The ring sits outside the
// face's box, as the library's does, so the item and the row give it back with negative margins
// and the row stands as tall and as wide as its faces. The cap is at least as wide as a face and
// widens with its count. Written out class and all, since the stylesheet is built from the words in
// this file.
export const FACE_FRAMES: Record<FaceSize, { row: string; item: string; cap: string }> = {
  "3xs": { row: "-mx-px", item: "p-px -my-px not-first:-ms-1", cap: "min-w-4 w-auto px-1" },
  "2xs": { row: "-mx-px", item: "p-px -my-px not-first:-ms-1", cap: "min-w-5 w-auto px-1" },
  xs: { row: "-mx-px", item: "p-px -my-px not-first:-ms-1", cap: "min-w-6 w-auto px-1" },
  sm: { row: "-mx-0.5", item: "p-0.5 -my-0.5 not-first:-ms-2.5", cap: "min-w-7 w-auto px-1" },
  md: { row: "-mx-0.5", item: "p-0.5 -my-0.5 not-first:-ms-2.5", cap: "min-w-8 w-auto px-1" },
  lg: { row: "-mx-0.5", item: "p-0.5 -my-0.5 not-first:-ms-2.5", cap: "min-w-9 w-auto px-1" },
  xl: { row: "-mx-[3px]", item: "p-[3px] -my-[3px] not-first:-ms-3.5", cap: "min-w-10 w-auto px-1" },
  "2xl": { row: "-mx-[3px]", item: "p-[3px] -my-[3px] not-first:-ms-3.5", cap: "min-w-11 w-auto px-1" },
  "3xl": { row: "-mx-[3px]", item: "p-[3px] -my-[3px] not-first:-ms-3.5", cap: "min-w-12 w-auto px-1" }
};

// The faces drawn and how many are left over for the cap: every face where no most is given or it
// is not a count, else the first that many.
export function facesShown(faces: readonly AvatarFace[], most?: number): { shown: readonly AvatarFace[]; rest: number } {
  if (most === undefined || !Number.isInteger(most) || most <= 0 || faces.length <= most) {
    return { shown: faces, rest: 0 };
  }

  return { shown: faces.slice(0, most), rest: faces.length - most };
}
