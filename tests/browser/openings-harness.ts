import { createApp, defineComponent, h, ref, Teleport } from "vue";

import { useOpenings } from "../../app/domain/openings";

// Two floating things drawn into the page's body the way the component library draws them, and
// nothing else on the page: a dialog mounted with the app, ahead of everything, and a drawer
// mounted after it that the dialog is opened from — a dialog set up ahead of every screen and a
// narrow screen's side drawer. The dialog stands keyed by its openings or, for the check that the
// page shows the fault at all, unkeyed.

export interface OpeningsPage {
  openDrawer: () => void;
  closeDrawer: () => void;
  openDialog: () => void;
  closeDialog: () => void;
}

export function mountOpenings(box: HTMLElement, options: { keyed: boolean }): OpeningsPage {
  const dialogOpen = ref(false);
  const drawerOpen = ref(false);

  const floating = (name: string, open: () => boolean, style: string) =>
    h(Teleport, { to: "body" }, open() ? [h("div", { "data-floating": name, style: `position:fixed;top:0;bottom:0;left:0;${style}` }, name)] : []);

  const dialog = defineComponent({
    setup() {
      const openings = useOpenings(() => dialogOpen.value);

      return () => h("div", { key: options.keyed ? openings.value : 0 }, [floating("dialog", () => dialogOpen.value, "right:0;background:#fff")]);
    }
  });

  const drawer = defineComponent({
    setup() {
      return () => floating("drawer", () => drawerOpen.value, "width:80%;background:#ccc");
    }
  });

  // The drawer mounts once the page has been read, as a layout behind the app's own dialog does.
  const later = ref(false);

  createApp({ render: () => [h(dialog), later.value ? h(drawer) : null] }).mount(box);
  later.value = true;

  return {
    openDrawer: () => (drawerOpen.value = true),
    closeDrawer: () => (drawerOpen.value = false),
    openDialog: () => (dialogOpen.value = true),
    closeDialog: () => (dialogOpen.value = false)
  };
}
