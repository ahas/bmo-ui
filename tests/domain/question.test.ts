import { afterEach, describe, expect, test } from "bun:test";
import { ref } from "vue";

import { askDiscard, useCloseGuard } from "~/domain/form-save";
import { askQuestion } from "~/domain/question";

import type { QuestionAsked } from "~/domain/question";
import type { Translate } from "#shared/wording";

// A question the reader answers before an action is a dialog of its own, opened through the
// library's overlay, and never the message pill (`docs/components.md`, "Messages", "Forms"). The
// overlay is stood in for, as the library's own composable is reached by the app's auto-imports, and
// what is read is what the question module hands it and what it makes of the answer.

const wording: Translate = (key) => key;

interface Opened {
  component: unknown;
  props: QuestionAsked;
  destroyOnClose: boolean;
}

let opened: Opened[] = [];

// The overlay answering every question with `answer`: what the dialog hands back on its way through,
// or nothing at all for every way out.
function overlayAnswering(answer: boolean | undefined): void {
  opened = [];
  Object.assign(globalThis, {
    useOverlay: () => ({
      create: (component: unknown, options: { props: QuestionAsked; destroyOnClose: boolean }) => {
        opened.push({ component, props: options.props, destroyOnClose: options.destroyOnClose });

        return { open: () => Promise.resolve(answer) };
      }
    })
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "useOverlay");
});

describe("a question", () => {
  test("opens the question dialog, a dialog of its own taken off the page once it has gone", async () => {
    overlayAnswering(true);

    await askQuestion({ title: "Delete it?", item: "plan.md", confirm: "Delete" });

    expect(opened).toHaveLength(1);
    expect(String(opened[0]!.component)).toEndWith("app/components/QuestionDialog.vue");
    expect(opened[0]!.props).toEqual({ title: "Delete it?", item: "plan.md", confirm: "Delete" });
    expect(opened[0]!.destroyOnClose).toBe(true);
  });

  test("answers yes only for the way through", async () => {
    overlayAnswering(true);
    expect(await askQuestion({ title: "Delete it?", confirm: "Delete" })).toBe(true);

    overlayAnswering(false);
    expect(await askQuestion({ title: "Delete it?", confirm: "Delete" })).toBe(false);

    // Esc, a press outside, the close and the back gesture close it with no answer at all.
    overlayAnswering(undefined);
    expect(await askQuestion({ title: "Delete it?", confirm: "Delete" })).toBe(false);
  });
});

describe("the question before changes are thrown away", () => {
  test("is the pack's question, gone through with the pack's discard", async () => {
    overlayAnswering(true);

    expect(await askDiscard(wording)).toBe(true);
    expect(opened[0]!.props).toEqual({ title: "common.title.discard_changes", confirm: "common.action.discard", leaving: false });
  });

  test("asked while the page is being left, it says so, so it takes no entry of the back gesture", async () => {
    overlayAnswering(false);

    expect(await askDiscard(wording, true)).toBe(false);
    expect(opened[0]!.props.leaving).toBe(true);
  });
});

describe("closing a form's dialog", () => {
  test("with nothing changed closes at once and asks nothing", async () => {
    overlayAnswering(false);

    const open = ref(true);
    const guard = useCloseGuard(open, () => false, wording);

    expect(guard.dismissible.value).toBe(true);
    await guard.leave();

    expect(open.value).toBe(false);
    expect(opened).toEqual([]);
  });

  test("with changes asks first: the way out leaves it open, discarding closes it", async () => {
    const open = ref(true);
    const guard = useCloseGuard(open, () => true, wording);

    expect(guard.dismissible.value).toBe(false);

    overlayAnswering(false);
    await guard.leave();
    expect(open.value).toBe(true);
    expect(opened).toHaveLength(1);

    overlayAnswering(true);
    await guard.leave();
    expect(open.value).toBe(false);
  });

  test("once closed asks nothing more, though the screen then clears its form", async () => {
    overlayAnswering(false);

    const open = ref(true);
    let changed = false;
    const guard = useCloseGuard(open, () => changed, wording);

    await guard.leave();
    changed = true;
    await guard.leave();

    expect(open.value).toBe(false);
    expect(opened).toEqual([]);
  });
});
