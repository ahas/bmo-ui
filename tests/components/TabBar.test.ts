import { describe, expect, test } from "bun:test";

// The tab bar, view switch and toolbar (`docs/components.md`, "Tab bar and toolbar"), read off the
// files that ship. What a press, a drag or a key does in a browser was driven on the bench; what is
// checked here is the shape each screen relies on.

const read = async (path: string): Promise<string> => await Bun.file(new URL(path, import.meta.url)).text();

const bar = await read("../../app/components/TabBar.vue");
const barTemplate = bar.slice(0, bar.indexOf("<script"));
const barScript = bar.slice(bar.indexOf("<script"));
const switcher = await read("../../app/components/TabSwitch.vue");
const toolbar = await read("../../app/components/ToolBar.vue");
const tabs = await read("../../app/domain/tabs.ts");

describe("the tab bar", () => {
  test("draws the screen's own list and says what was pressed, closed or moved", () => {
    expect(barScript).toContain('"update:active": [id: string]');
    expect(barScript).toContain("close: [ids: string[]]");
    expect(barScript).toContain("move: [from: number, to: number]");
    expect(barScript).not.toContain("navigateTo");
    expect(barScript).not.toContain("useRouter");
    expect(barTemplate).toContain('role="tablist"');
    expect(barTemplate).toContain('role="tab"');
  });

  test("closes by its mark, the middle button, Delete and a menu of the four closings", () => {
    expect(barTemplate).toContain('@click.stop="close([tab.id])"');
    expect(barTemplate).toContain('@auxclick.middle.prevent="close([tab.id])"');
    expect(barScript).toContain('event.key === "Delete"');

    for (const label of ["common.action.close", "common.action.close_other_tabs", "common.action.close_right_tabs", "common.action.close_all_tabs"]) {
      expect(barScript).toContain(`label: t("${label}")`);
    }
  });

  test("walks its tabs by arrow, Home and End, with one tab in the keyboard's order", () => {
    expect(barScript).toContain("ArrowLeft");
    expect(barScript).toContain("ArrowRight");
    expect(barScript).toContain("Home: 0");
    expect(barScript).toContain("End: last");
    expect(barTemplate).toContain(':tabindex="tab.id === standingId ? 0 : -1"');
  });

  test("read-only, shows, switches and pins and nothing else: no close mark, no drag, no closing in its menu", () => {
    expect(barTemplate).toContain('v-else-if="!props.readonly"');
    expect(barTemplate).toContain(':draggable="!props.readonly"');
    expect(barTemplate).toContain(':disabled="props.readonly && !props.pinnable"');
    expect(barScript).toContain("if (!props.readonly && ids.length > 0)");
    expect(barScript).toContain("if (!props.readonly) {\n    groups.push([");
  });

  test("pins a tab from its menu, draws a pin where its close mark would be, and never closes a pinned tab with the others", () => {
    expect(barScript).toContain('pin: [id: string, on: boolean]');
    expect(barScript).toContain('label: t("common.action.pin")');
    expect(barScript).toContain('label: t("common.action.unpin")');
    expect(barTemplate).toContain('<UIcon v-if="tab.pinned" name="i-material-symbols-keep-outline"');
    expect(barScript).toContain("const others = othersOf(pins, index);");
    expect(barScript).toContain("close(pick(all))");
  });

  test("adds the screen's own choices to a tab's menu", () => {
    expect(barScript).toContain("menu?: ((id: string) => readonly BarMenuItem[]) | null;");
    expect(barScript).toContain("props.menu?.(tab.id)");
  });

  test("shows a finger its close marks, which a hover would otherwise uncover", () => {
    expect(barTemplate).toContain("pointer-coarse:opacity-70");
  });

  test("is its tabs' whole height, its bottom line drawn over them rather than under them", () => {
    expect(barTemplate).toContain("TAB_ROW_LINE");
    expect(barTemplate.slice(barTemplate.indexOf("<div"), barTemplate.indexOf("<div ref=\"strip\""))).not.toContain("border-b");
    expect(tabs).toContain("before:absolute before:inset-x-0 before:bottom-0 before:h-px");
  });

  test("opens a tab's menu on a finger's second tap of the standing tab, a long press being a drag", () => {
    expect(barTemplate).toContain('@click="onTabClick(tab.id, $event)"');
    expect(barScript).toContain('(event as PointerEvent).pointerType === "touch"');
    expect(barScript).toContain("id === props.active");
    expect(barScript).toContain('new MouseEvent("contextmenu"');
  });

  test("stands its actions and the screen's own at the right end as one group, one gap apart", () => {
    const group = barTemplate.slice(barTemplate.indexOf("<ActionGroup") - 200, barTemplate.indexOf('<slot name="actions"'));

    expect(group).toContain("flex shrink-0 items-center gap-1 border-l border-default px-1");
    expect(barTemplate.indexOf('<slot name="actions"')).toBeGreaterThan(barTemplate.indexOf("<ActionGroup"));
  });

  test("keeps the open tab in view and stands a view switch and the actions at its right end", () => {
    expect(barScript).toContain('scrollIntoView({ block: "nearest", inline: "nearest" })');
    expect(barTemplate.indexOf('<slot name="switch"')).toBeGreaterThan(barTemplate.indexOf('role="tablist"'));
    expect(barTemplate.indexOf("<ActionGroup")).toBeGreaterThan(barTemplate.indexOf('<slot name="switch"'));
  });
});

describe("the view switch and the toolbar", () => {
  test("the switch's choices share its width evenly and are the library's small buttons", () => {
    expect(switcher).toContain("grid! shrink-0 auto-cols-fr grid-flow-col");
    expect(switcher).toContain('role="tablist"');
    expect(switcher).toContain('role="tab"');
    expect(switcher).toContain('size="sm"');
    expect(switcher).not.toContain("h-full");
    expect(bar).toContain("flex h-9 shrink-0");
  });

  test("the switch stands in the tab bar centred, parted from the tabs by a line", () => {
    expect(barTemplate).toContain('<div v-if="$slots.switch" class="flex shrink-0 items-center border-l border-default px-1">');
  });

  test("the toolbar runs edge to edge with cells divided by lines, at the same height", () => {
    expect(toolbar).toContain('role="toolbar"');
    expect(toolbar).toContain("flex h-9 shrink-0");
    expect(toolbar).toContain("divide-x divide-default");
    expect(toolbar).toContain("shadow-[inset_0_-1px_0_var(--ui-border)]");
    expect(toolbar).not.toMatch(/\sp[xy]?-\d/);
  });
});
