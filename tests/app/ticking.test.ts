import { describe, expect, test } from "bun:test";

import { attribute, DIRECTIVE, ELEMENT, expression, expressionNodes, INTERPOLATION, sources, staticClasses, template, walkTemplate } from "./sources";

import type { TemplateNode } from "./sources";

// A number that counts while it is being read has to stand in fixed-width digits (`docs/design.md`,
// "Fonts"). The proportional ones are not the same width apiece, so a clock ticking from 9:59 to
// 10:00 changes how much room it takes, and everything on the line — a bar's worth of controls, the
// words after an elapsed time — is shoved along once a second. The rule is read here off the files
// that ship, for every place a ticking value is put on the screen.

// What makes a value tick: a player's place in what it plays, the clock of a run, the two ways a
// length of time is said, and how long a share has left.
const TICKING = new Set(["playClock", "timerClock", "elapsedText", "remainingText", "shareLeftText"]);

interface Site {
  name: string;
  // The elements standing around the value, innermost last; a value handed to a tag is that tag's.
  around: TemplateNode[];
}

function ticks(text: string): string[] {
  return [...expressionNodes(expression(text))]
    .filter((one) => one.type === "CallExpression")
    .map((one) => one.callee as { type: string; name?: string })
    .filter((callee) => callee.type === "Identifier" && TICKING.has(callee.name!))
    .map((callee) => callee.name!);
}

// Every place a ticking value is put on the screen: written into the text, or handed to a tag as one
// of its properties. An accessible property is read out rather than drawn, so it takes no room on the
// line and is not one of them.
function sites(nodes: TemplateNode[]): Site[] {
  const found: Site[] = [];

  for (const { node, around } of walkTemplate(nodes)) {
    if (node.type === INTERPOLATION) {
      const written = (node.content as { content?: string } | undefined)?.content ?? "";

      found.push(...ticks(written).map((name) => ({ name, around })));
    } else if (node.type === ELEMENT) {
      for (const prop of node.props ?? []) {
        const name = prop.arg?.content ?? "";

        if (prop.type !== DIRECTIVE || prop.name !== "bind" || prop.exp?.content === undefined || name.startsWith("aria-")) continue;

        found.push(...ticks(prop.exp.content).map((one) => ({ name: one, around: [...around, node] })));
      }
    }
  }

  return found;
}

// The classes an element is given, plainly or under a condition.
function givenClasses(node: TemplateNode): string[] {
  const bound = attribute(node, "class");
  const conditional =
    bound?.type === DIRECTIVE && bound.exp?.content !== undefined
      ? [...expressionNodes(expression(bound.exp.content))].flatMap((one) => (one.type === "StringLiteral" ? (one.value as string).split(/\s+/) : []))
      : [];

  return [...staticClasses(node), ...conditional];
}

// Whether the value is drawn in digits of one width. Tabular figures are inherited, so an element
// around the value says so for everything inside it; fixed-pitch type does it as surely as the tabular
// figures of a proportional face, and the rolling figure draws its digits in tabular figures of its
// own.
function fixedWidth(site: Site): boolean {
  return site.around.some(
    (node) => /^Rolling(Number|Sentence)$/.test(node.tag ?? "") || givenClasses(node).some((one) => one === "tabular-nums" || one === "font-mono")
  );
}

function fragment(markup: string): Site[] {
  return sites(template(`<template>${markup}</template>`));
}

describe("the numbers that count while they are read", () => {
  const found = async () =>
    (await sources("components/**/*.vue")).flatMap(({ path, text }) => sites(template(text)).map((site) => ({ path, site })));

  test("stand in fixed-width digits, wherever the layer puts one", async () => {
    const shaky = (await found()).filter(({ site }) => !fixedWidth(site)).map(({ path, site }) => `${path}: ${site.name}`);

    expect(shaky).toEqual([]);
  });

  test("and the sweep found the places, so it is saying something", async () => {
    expect((await found()).length).toBeGreaterThanOrEqual(3);
  });
});

describe("what the sweep itself reads", () => {
  test("finds the element a value stands in rather than the one before it", () => {
    const [site] = fragment('<div class="a"><span class="tabular-nums">{{ elapsedText(t, x) }}</span></div>');

    expect(fixedWidth(site!)).toBe(true);
  });

  test("is not fooled by a sibling that closed before the value", () => {
    const [site] = fragment('<div class="a"><b class="tabular-nums">x</b>{{ elapsedText(t, y) }}</div>');

    expect(fixedWidth(site!)).toBe(false);
  });

  test("nor by one that closed itself", () => {
    const [site] = fragment('<p class="loose"><UIcon class="font-mono" />{{ timerClock(z) }}</p>');

    expect(fixedWidth(site!)).toBe(false);
  });

  test("steps over Vue's own template, which is no element and carries no class", () => {
    const [site] = fragment('<b class="tabular-nums"><template v-if="x">{{ playClock(y) }}</template></b>');

    expect(fixedWidth(site!)).toBe(true);
  });

  test("takes the figures an element further out gives everything inside it", () => {
    const [site] = fragment('<p class="tabular-nums"><span v-if="x">{{ playClock(y) }}</span></p>');

    expect(fixedWidth(site!)).toBe(true);
  });

  test("hands a value written into a tag's own attributes to that tag", () => {
    const [site] = fragment('<div class="loose"><UBadge class="tabular-nums" :label="remainingText(t, a, b)" /></div>');

    expect(fixedWidth(site!)).toBe(true);
  });

  test("and does not count one that is read out rather than drawn", () => {
    expect(fragment('<div class="loose" :aria-valuetext="playClock(y)" />')).toEqual([]);
  });
});
