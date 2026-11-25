import { describe, expect, test } from "bun:test";

// The foot of a list read a page at a time (`docs/design.md`, 「Lists」), read off the file that ships: what
// stands there in each state of the paging and what it is wired to. How the paging runs is the next-pages
// module's own test, and how the foot is measured the foot module's.

const source = await Bun.file(new URL("../../app/components/NextPageFoot.vue", import.meta.url)).text();
const template = source.slice(0, source.indexOf("<script"));

// The one element a mark stands in, with its attributes and nothing of what it holds.
function tagOf(mark: string): string {
  const at = template.indexOf(mark);

  expect(at).toBeGreaterThan(-1);

  const opened = template.lastIndexOf("<", at);

  return template.slice(opened, template.indexOf(">", opened) + 1);
}

describe("what stands at the foot", () => {
  test("nothing once no more is held, no page is on its way and none failed", () => {
    expect(tagOf("data-next-page-foot")).toContain('v-if="props.more || pages.adding.value || pages.failure.value !== null"');
  });

  test("the incoming rows' placeholder while a page is on its way, under the screen's busy name", () => {
    const skeleton = tagOf("<ContentSkeleton");

    expect(skeleton).toContain('v-if="pages.adding.value"');
    expect(skeleton).toContain(':label="props.loadingLabel"');
  });

  test("a failed page's reason as an alert, with the one control that asks it again", () => {
    expect(tagOf("data-next-page-failed")).toContain('role="alert"');
    expect(source).toContain("failureText(failure, props.failedWords)");
    expect(source).toContain("props.failedWords(failure)");
    expect(tagOf("common.action.retry")).toContain('@click="pages.retry"');
  });

  test("the measured foot, hidden from assistive technology, only while more is held", () => {
    const foot = tagOf('ref="foot"');

    expect(foot).toContain('v-if="props.more"');
    expect(foot).toContain('aria-hidden="true"');
  });

  test("one row across the table's columns where a span is given, a block otherwise", () => {
    expect(template).toContain(":is=\"props.span === undefined ? 'div' : 'tr'\"");
    expect(template).toContain(':colspan="props.span"');
  });
});

describe("the paging", () => {
  test("is the next-pages module's, measured by the foot module", () => {
    expect(source).toContain("useFootInView(foot,");
    expect(source).toContain("useNextPages({");
    expect(source).toContain("(await props.next()) !== false");
  });
});
