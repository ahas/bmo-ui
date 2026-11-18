import { describe, expect, test } from "bun:test";
import { createApp, defineComponent, effectScope, h, nextTick, reactive, ref, watch } from "vue";

import { useFormPart, useFormSave, useOpenedWith } from "~/domain/form-save";

import type { FormSave, OpenedWith, OpenedWithOptions } from "~/domain/form-save";
import type { Translate } from "#shared/wording";

// A form holds changes only while its values differ from what it opened with, and its save is on only
// while it holds changes (`docs/components.md`, "Forms"). The snapshot is read in a scope of its own,
// and the frame and its block are mounted as a host mounts them, the block registering with the frame
// it stands in, so what is read is the form a screen would hold.

const wording: Translate = (key) => key;

// Lets everything an opening or a change set off be drawn, as the page would before the reader's
// next press.
async function drawn(): Promise<void> {
  await nextTick();
  await nextTick();
}

// The reader's first press on the page, which ends the form being filled.
function press(): void {
  document.dispatchEvent(new Event("pointerdown"));
}

function openedWith(values: () => unknown, options?: OpenedWithOptions): { opened: OpenedWith; stop: () => void } {
  const scope = effectScope();
  const opened = scope.run(() => useOpenedWith(values, options))!;

  return { opened, stop: () => scope.stop() };
}

// A date of a calendar library's: an object that gives its ISO text for itself and nothing else.
class CalendarDay {
  constructor(readonly iso: string) {}

  toString(): string {
    return this.iso;
  }
}

describe("a form's opened-with snapshot", () => {
  test("reads values as the inputs leave them, alike where the reader would call them the same", async () => {
    const file = new Blob(["first"]);
    const form = reactive<Record<string, unknown>>({
      name: "Annual leave",
      hours: 8,
      note: null,
      tags: [],
      day: new Date("2026-11-18T09:00:00Z"),
      start: new CalendarDay("09:00:00"),
      address: { street: "", city: "Lisbon" },
      breaks: [{ start: "12:00", end: "13:00" }],
      file
    });
    const { opened, stop } = openedWith(() => form);

    await drawn();
    press();

    form.name = "  Annual leave ";
    form.hours = "8";
    form.note = "  ";
    form.tags = undefined;
    form.day = new Date("2026-11-18T09:00:00Z");
    form.start = new CalendarDay("09:00:00");
    form.address = { city: "Lisbon", street: null };
    form.breaks = [{ end: "13:00", start: "12:00", note: "" }];
    form.missing = Number.NaN;
    expect(opened.dirty.value).toBe(false);

    form.hours = 9;
    expect(opened.dirty.value).toBe(true);
    form.hours = 8;

    form.start = new CalendarDay("09:30:00");
    expect(opened.dirty.value).toBe(true);
    form.start = new CalendarDay("09:00:00");

    form.breaks = [{ start: "12:00", end: "13:00" }, { start: "15:00", end: "15:10" }];
    expect(opened.dirty.value).toBe(true);
    form.breaks = [{ start: "12:00", end: "13:00" }];

    form.file = new Blob(["first"]);
    expect(opened.dirty.value).toBe(true);
    form.file = file;

    expect(opened.dirty.value).toBe(false);

    stop();
  });

  test("is taken once the form stands open and ready, and closing drops it", async () => {
    const open = ref(false);
    const ready = ref(false);
    const text = ref("");
    const { opened, stop } = openedWith(() => text.value, { open, ready });

    open.value = true;
    await drawn();
    press();

    // Data landing after the reader's first press, before the form says it is ready, is no change.
    text.value = "Annual leave";
    ready.value = true;
    await drawn();
    expect(opened.dirty.value).toBe(false);

    press();
    text.value = "Family event";
    expect(opened.dirty.value).toBe(true);

    open.value = false;
    await drawn();
    expect(opened.dirty.value).toBe(false);

    // The next opening reads against what the form then holds.
    open.value = true;
    await drawn();
    press();
    expect(opened.dirty.value).toBe(false);

    text.value = "Annual leave";
    expect(opened.dirty.value).toBe(true);

    stop();
  });

  test("follows the values until the reader's first press, and is taken again once a save's answer is drawn", async () => {
    // The screen copies the answer a save brings into its field as it draws.
    const answer = ref("");
    const text = ref("");
    const scope = effectScope();
    const opened = scope.run(() => {
      watch(answer, (one) => {
        text.value = one;
      });

      return useOpenedWith(() => text.value);
    })!;

    await drawn();

    text.value = "Annual leave";
    expect(opened.dirty.value).toBe(false);

    press();
    text.value = "Family event";
    expect(opened.dirty.value).toBe(true);

    answer.value = "FAMILY EVENT";
    await opened.take();
    expect(text.value).toBe("FAMILY EVENT");
    expect(opened.dirty.value).toBe(false);

    scope.stop();
  });

  test("is not taken again while the form is closed or not yet ready, so the next opening takes and follows its own", async () => {
    const open = ref(true);
    const ready = ref(true);
    const text = ref("Annual leave");
    const { opened, stop } = openedWith(() => text.value, { open, ready });

    await drawn();

    // A read the last opening set off lands once the form has closed.
    open.value = false;
    await drawn();
    await opened.take();

    // The next opening is filled after it stands, before the reader presses anything.
    open.value = true;
    ready.value = false;
    await drawn();
    await opened.take();
    ready.value = true;
    await drawn();
    text.value = "Family event";
    expect(opened.dirty.value).toBe(false);

    press();
    text.value = "Sick leave";
    expect(opened.dirty.value).toBe(true);

    stop();
  });
});

function mountForm(): { form: FormSave; value: { value: string }; sent: () => number; unmount: () => void } {
  const saved = ref("first");
  const value = ref("first");
  let sent = 0;
  let form: FormSave | null = null;

  const Block = defineComponent({
    setup() {
      useFormPart({
        dirty: useOpenedWith(() => value.value),
        save: async () => {
          sent += 1;
          saved.value = value.value;

          return true;
        },
        discard: () => {
          value.value = saved.value;
        }
      });

      return () => null;
    }
  });

  const Frame = defineComponent({
    setup() {
      form = useFormSave(wording);

      return () => h(Block);
    }
  });

  const app = createApp(Frame);

  app.mount(document.createElement("div"));

  return { form: form!, value, sent: () => sent, unmount: () => app.unmount() };
}

describe("a form's save", () => {
  test("stays off until a value differs from what the form opened with, and goes off again once it is put back", async () => {
    const { form, value, sent, unmount } = mountForm();

    await drawn();
    press();

    expect(form.dirty.value).toBe(false);
    expect(await form.save()).toBe(false);
    expect(sent()).toBe(0);

    value.value = "second";
    expect(form.dirty.value).toBe(true);

    value.value = "first";
    expect(form.dirty.value).toBe(false);
    expect(await form.save()).toBe(false);
    expect(sent()).toBe(0);

    // A save that went through is what the form holds from then on, so the save is off again at once.
    value.value = "second";
    expect(await form.save()).toBe(true);
    expect(sent()).toBe(1);
    expect(form.dirty.value).toBe(false);

    // Discarding puts the values back to what was saved, which is what the form now holds.
    value.value = "third";
    form.discard();
    expect(form.dirty.value).toBe(false);

    unmount();
  });
});
