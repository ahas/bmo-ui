import { describe, expect, test } from "bun:test";

// The one share link dialog (`docs/components.md`, "Share links"), read off the file that ships:
// which of its two faces stands when, and what a rendered screen would show as nothing at all —
// that it is the shared centred dialog, that it calls only the road it is handed, that the address
// is one somebody outside can open, that a link's end is a day, and that nothing is emptied on the
// way out. How the end reads is the share-links module's own test.

const source = await Bun.file(new URL("../../app/components/ShareLinkDialog.vue", import.meta.url)).text();
const template = source.slice(0, source.indexOf("<script"));

// The one element a mark stands in, with its attributes and nothing of what it holds.
function tagOf(mark: string): string {
  const at = template.indexOf(mark);

  expect(at).toBeGreaterThan(-1);

  const opened = template.lastIndexOf("<", at);

  return template.slice(opened, template.indexOf(">", opened) + 1);
}

describe("where it stands", () => {
  test("it is the shared dialog, titled by what it is, the subject under the title", () => {
    expect(tagOf("<SettingsDialog")).toContain(`:title="$t('common.title.share_link')"`);
    expect(tagOf("<SettingsDialog")).toContain(':description="props.subject"');
    expect(template).not.toContain("UDrawer");
    expect(template).not.toContain("USlideover");
  });

  test("while the link is read the body is a skeleton", () => {
    expect(tagOf("<ContentSkeleton")).toContain('v-if="loading"');
  });
});

describe("the road", () => {
  test("is the host's: the dialog reads, makes and ends through it and opens no address of its own", () => {
    expect(source).toContain("props.road.read()");
    expect(source).toContain("props.road.make(span.value)");
    expect(source).toContain("props.road.remove(shown.value)");
    expect(source).not.toContain("$fetch");
    expect(source).not.toContain("useFetch");
  });

  test("the address is the road's page read against the page the dialog stands on", () => {
    expect(source).toContain("new URL(props.road.page(shown.value), window.location.href).href");
    expect(tagOf("<UInput")).toContain("readonly");
    expect(tagOf("<UInput")).toContain("font-mono");
  });

  test("a failure is worded by the host's reading where it hands one", () => {
    expect(source).toContain("explain: failureText");
    expect(source.match(/props\.explain\(error, t\("common\.error\./g)?.length).toBe(3);
  });
});

describe("with no link", () => {
  test("the spans are the host's, offered as one dropdown", () => {
    expect(tagOf("<USelect")).toContain(':items="props.spans"');
    expect(source).toContain("span.value = props.span ?? props.spans[0]?.value;");
  });

  test("making one is the footer's action, and nothing here closes the dialog", () => {
    expect(tagOf(`:label="$t('common.action.create_link')"`)).toContain('v-if="shown === null"');
    expect(source).not.toMatch(/open\.value\s*=/);
  });
});

describe("with a link", () => {
  test("copying is the layer's icon button, named by its tooltip, and says on the pill whether it worked", () => {
    expect(template).toContain(`<IconButton :label="$t('common.action.copy')"`);
    expect(source).toContain("common.message.link_copied");
    expect(source).toContain("common.error.link_copy_failed");
  });

  test("its end is a chip of the day it stands until, the moment to the minute in the shared tooltip", () => {
    expect(tagOf("<UBadge")).toContain(':label="until"');
    expect(tagOf("<UBadge")).toContain("tabular-nums");
    expect(source).toContain("shareUntilText(t, shown.value.expiresAt, now.value)");
    expect(tagOf("<HintTip")).toContain(':text="endsAt"');
    expect(source).not.toContain("remainingText");
  });

  test("ending it is the footer's action, in the colour of removing", () => {
    expect(tagOf(`:label="$t('common.action.unshare')"`)).toContain('color="error"');
  });
});

describe("what it tells the screen behind", () => {
  test("each read, make and end says what the thing is now shared by", () => {
    expect(source.match(/emit\("shared"/g)?.length).toBe(3);
    expect(source).toContain('emit("shared", null)');
  });

  test("what stands is read afresh on opening and left standing as it closes", () => {
    expect(source).toContain("void read();");
    expect(source).toContain("if (!standing) {\n      return;\n    }");
  });
});
