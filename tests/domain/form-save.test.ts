import { describe, expect, test } from "bun:test";
import { createApp, defineComponent, h, ref } from "vue";

import { useFormPart, useFormSave } from "~/domain/form-save";

import type { FormSave } from "~/domain/form-save";
import type { Translate } from "#shared/wording";

// A form's save is on only while something differs from what is saved (`docs/components.md`,
// "Forms"). The frame and its block are mounted as a host mounts them, the block registering with
// the frame it stands in, so what is read is the form a screen would hold.

const wording: Translate = (key) => key;

function mountForm(): { form: FormSave; value: { value: string }; sent: () => number; unmount: () => void } {
  const saved = ref("first");
  const value = ref("first");
  let sent = 0;
  let form: FormSave | null = null;

  const Block = defineComponent({
    setup() {
      useFormPart({
        dirty: () => value.value !== saved.value,
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
  test("stays off until a value differs from what is saved, and goes off again once it is put back", async () => {
    const { form, value, sent, unmount } = mountForm();

    expect(form.dirty.value).toBe(false);
    expect(await form.save()).toBe(false);
    expect(sent()).toBe(0);

    value.value = "second";
    expect(form.dirty.value).toBe(true);

    value.value = "first";
    expect(form.dirty.value).toBe(false);
    expect(await form.save()).toBe(false);
    expect(sent()).toBe(0);

    // A save that went through is what is saved from then on, so the save is off again at once.
    value.value = "second";
    expect(await form.save()).toBe(true);
    expect(sent()).toBe(1);
    expect(form.dirty.value).toBe(false);

    unmount();
  });
});
