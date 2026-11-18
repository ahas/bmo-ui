import { describe, expect, test } from "bun:test";

import { choiceCount, choiceFields, narrowChoices, SEARCH_ABOVE, searchesChoices } from "~/domain/choices";

// When the one select searches and what its search keeps (`docs/components.md`, "Choosing a value").
// How the search module matches words is its own test's; this one holds the select's list to it.

const fruits = ["Apple", "Banana", "Cherry", "Date", "Elderberry", "Fig", "Grape"].map((label) => ({ label, value: label.toLowerCase() }));

describe("whether a list searches", () => {
  test("not while it holds seven choices or fewer", () => {
    expect(SEARCH_ABOVE).toBe(7);
    expect(searchesChoices(fruits, false)).toBe(false);
    expect(searchesChoices([], false)).toBe(false);
  });

  test("once it holds more than seven", () => {
    expect(searchesChoices([...fruits, { label: "Honeydew", value: "honeydew" }], false)).toBe(true);
  });

  test("counting no heading or separator as a choice", () => {
    const headed = [{ type: "label" as const, label: "Fruit" }, ...fruits.slice(0, 4), { type: "separator" as const }, { type: "label" as const, label: "More" }, ...fruits.slice(4)];

    expect(choiceCount(headed)).toBe(7);
    expect(searchesChoices(headed, false)).toBe(false);
  });

  test("counting every group of a list drawn in groups", () => {
    expect(choiceCount([fruits.slice(0, 4), fruits.slice(4), [{ label: "Honeydew" }]])).toBe(8);
    expect(searchesChoices([fruits.slice(0, 4), fruits.slice(4), [{ label: "Honeydew" }]], false)).toBe(true);
  });

  test("always where a road finds its choices, however few it holds", () => {
    expect(searchesChoices([], true)).toBe(true);
  });
});

describe("the words a choice shows", () => {
  test("are its label and the line under it, read by the keys the select is handed", () => {
    expect(choiceFields({ name: "Ada", note: "Engineering" }, { label: "name", description: "note" }).map((field) => field.text)).toEqual(["Ada", "Engineering"]);
  });

  test("are its own value where it is a plain value", () => {
    expect(choiceFields(42)[0]!.text).toBe("42");
  });
});

describe("the choices kept for the words typed", () => {
  const people = [
    { type: "label" as const, label: "Design" },
    { label: "Ada", description: "Lead" },
    { label: "Ben", description: "Intern" },
    { type: "separator" as const },
    { type: "label" as const, label: "Sales" },
    { label: "Cora", description: "Lead" },
    { type: "separator" as const },
    { label: "Dan" }
  ];

  test("are every choice, headings and separators too, for no words", () => {
    expect(narrowChoices(people, "  ")).toBe(people);
  });

  test("match the label or the line under it, letter case folded", () => {
    expect(narrowChoices(fruits, "an").map((item) => (item as { label: string }).label)).toEqual(["Banana"]);
    expect<unknown>(narrowChoices(people, "INTERN")).toEqual([people[0], people[2]]);
  });

  test("keep a heading while any choice under it stands, and a separator only between parts that both stand", () => {
    expect<unknown>(narrowChoices(people, "lead")).toEqual([people[0], people[1], people[3], people[4], people[5]]);
    expect<unknown>(narrowChoices(people, "dan")).toEqual([people[7]]);
  });

  test("match no heading's own words", () => {
    expect<unknown>(narrowChoices(people, "Sales")).toEqual([]);
  });

  test("keep the groups of a list drawn in groups, dropping a group left with none", () => {
    expect(narrowChoices([fruits.slice(0, 3), fruits.slice(3)], "e")).toEqual([[fruits[0], fruits[2]], [fruits[3], fruits[4], fruits[6]]]);
    expect(narrowChoices([fruits.slice(0, 3), fruits.slice(3)], "fig")).toEqual([[fruits[5]]]);
  });
});
