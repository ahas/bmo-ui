import { describe, expect, test } from "bun:test";

// The question asked before an action (`docs/components.md`, "Messages"), read off the file that
// ships: the library's dialog naming the item and the action, its way out first and its way through
// last under the action's own verb, every way out answering no, and no layer of the back gesture
// while the page is being left. What the answer is made into is the question module's own test.

const source = await Bun.file(new URL("../../app/components/QuestionDialog.vue", import.meta.url)).text();
const template = source.slice(0, source.indexOf("<script"));

describe("the question dialog", () => {
  test("is the library's dialog, its question the title and the item named under it", () => {
    expect(template).toContain("<UModal");
    expect(template).toContain(':title="props.title"');
    expect(template).toContain(':description="props.item ?? undefined"');
    expect(template).toContain("{{ props.effect }}");
  });

  test("holds the way out first and the way through last, in the error colour, under the action's own verb", () => {
    const out = template.indexOf(`:label="props.cancel ?? $t('common.action.cancel')"`);
    const through = template.indexOf(':label="props.confirm" color="error"');

    expect(out).toBeGreaterThan(-1);
    expect(through).toBeGreaterThan(out);
    expect(template).toContain("emit('close', false)");
    expect(template).toContain("emit('close', true)");
  });

  test("closes with no answer by its close mark, as by Esc, a press outside and the back gesture", () => {
    expect(template).toContain('<ShellClose :class="ui.close()" @close="open = false" />');
    expect(template).not.toContain(":dismissible");
  });

  test("asked while the page is being left, it carries the mark that keeps it off the history", () => {
    expect(template).toContain(':content="content"');
    expect(source).toContain('props.leaving ? ({ [OFF_HISTORY]: "" }');
  });
});
