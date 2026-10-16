// A table whose rows stand in labelled parts under one header. The screen says which part each row
// belongs to and names the parts in the order they stand; the table puts a heading row before the
// first row of each part. A row whose part is not named stands after every part, under no heading,
// so a row the screen could not place is still shown rather than dropped.

export interface TableSection {
  key: string;
  label: string;
}

const headingMark = Symbol("table section heading");

// The row a part's heading stands in, among the screen's own rows.
export interface SectionHeading {
  readonly [headingMark]: true;
  readonly section: TableSection;
}

export function sectionHeading(section: TableSection): SectionHeading {
  return { [headingMark]: true, section };
}

// The part a heading row heads, or null for one of the screen's own rows.
export function headingOf(item: unknown): TableSection | null {
  return typeof item === "object" && item !== null && headingMark in item ? (item as SectionHeading).section : null;
}

// The rows as the table draws them: each named part that has a row, in the order the parts are
// named, its heading first and its rows in the order the screen gave them; then the rows of no named
// part. A part with no row gets no heading.
export function sectionedRows<T>(
  rows: readonly T[],
  sections: readonly TableSection[],
  sectionOf: (row: T) => string | null | undefined,
): (T | SectionHeading)[] {
  const named = new Set(sections.map((section) => section.key));
  const drawn: (T | SectionHeading)[] = [];

  for (const section of sections) {
    const members = rows.filter((row) => sectionOf(row) === section.key);

    if (members.length > 0) {
      drawn.push(sectionHeading(section), ...members);
    }
  }

  return [...drawn, ...rows.filter((row) => !named.has(sectionOf(row) ?? ""))];
}

// Which row a drawn row is, kept apart per part: the same row standing in two parts is two rows.
// A heading is its part's own; a row is its part and its key, or its place among the screen's rows
// where the screen names no key.
export function sectionedRowId<T>(
  item: T | SectionHeading,
  index: number,
  sectionOf: (row: T) => string | null | undefined,
  rowKey?: (row: T) => string,
): string {
  const heading = headingOf(item);

  if (heading !== null) {
    return `section:${heading.key}`;
  }

  const row = item as T;

  return `row:${sectionOf(row) ?? ""}:${rowKey?.(row) ?? String(index)}`;
}
