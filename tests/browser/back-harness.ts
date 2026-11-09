import { createApp, h, nextTick, onScopeDispose, ref, watch } from "vue";
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger
} from "reka-ui";
import { DrawerContent, DrawerOverlay, DrawerPortal, DrawerRoot } from "vaul-vue";

import { layerCount } from "../../app/domain/layers";
import { watchOverlays } from "../../app/domain/overlays";

// The two floating things a back press meets with a tooltip standing over them: a dialog whose
// close control the focus lands on as it opens, and a drawer opened from a menu whose button keeps
// the tooltip the pointer brought up. Both are drawn by the component library's own parts, as a
// host's screens draw them, and nothing in the page registers a layer itself: the overlays module
// finds them on the page.
//
// The library draws each floating thing into the page's body and moves the focus into it as it
// opens, so a control inside it that is named on hover is named at once.

// The layer's code reaches the framework's own names without importing them, since Nuxt binds them
// in a host; a page standing outside Nuxt hands the same names over before anything opens.
Object.assign(globalThis, {
  watch,
  nextTick,
  onScopeDispose,
  useRouter: () => ({ options: {}, beforeEach: () => undefined })
});

export interface BackPage {
  layerCount: () => number;
  // The dialog and the drawer put up or taken down together, in the one turn a screen's own action does it in.
  stand: (dialog: boolean, drawer: boolean) => void;
}

// A control named by a tooltip, as every icon button of a host's is.
function named(label: string, mark: string) {
  return h(TooltipRoot, null, {
    default: () => [
      h(TooltipTrigger, { asChild: true }, { default: () => h("button", { "aria-label": label, "data-trigger": mark }, label) }),
      h(TooltipPortal, null, { default: () => h(TooltipContent, { "data-tooltip": mark }, { default: () => label }) })
    ]
  });
}

export function mountBack(box: HTMLElement): BackPage {
  const dialogOpen = ref(false);
  const menuOpen = ref(false);
  const drawerOpen = ref(false);

  createApp({
    render: () =>
      h(TooltipProvider, null, {
        default: () =>
          h("div", [
            h("button", { id: "open-dialog", onClick: () => (dialogOpen.value = true) }, "open dialog"),
            h("button", { id: "open-menu", onClick: () => (menuOpen.value = true) }, "open menu"),

            h(DialogRoot, { open: dialogOpen.value, "onUpdate:open": (standing: boolean) => (dialogOpen.value = standing) }, {
              default: () =>
                h(DialogPortal, null, {
                  default: () => [
                    h(DialogOverlay),
                    h(DialogContent, { "data-sheet": "dialog" }, {
                      default: () => [h(DialogTitle, null, { default: () => "Share link" }), named("Close", "close")]
                    })
                  ]
                })
            }),

            h(DropdownMenuRoot, { open: menuOpen.value, "onUpdate:open": (standing: boolean) => (menuOpen.value = standing) }, {
              default: () => [
                h(DropdownMenuTrigger, { asChild: true }, { default: () => named("More", "more") }),
                h(DropdownMenuPortal, null, {
                  default: () =>
                    h(DropdownMenuContent, null, {
                      default: () =>
                        h(DropdownMenuItem, {
                          "data-item": "properties",
                          // The one press that closes the menu and opens the drawer, as a screen's
                          // own action in a menu does.
                          onSelect: () => {
                            menuOpen.value = false;
                            drawerOpen.value = true;
                          }
                        }, { default: () => "Properties" })
                    })
                })
              ]
            }),

            h(DrawerRoot, { open: drawerOpen.value, "onUpdate:open": (standing: boolean) => (drawerOpen.value = standing), direction: "bottom" }, {
              default: () =>
                h(DrawerPortal, null, {
                  default: () => [
                    h(DrawerOverlay),
                    h(DrawerContent, { "data-sheet": "drawer" }, {
                      default: () => [h(DialogTitle, null, { default: () => "Properties" }), h("p", null, "Kind: document")]
                    })
                  ]
                })
            })
          ])
      })
  }).mount(box);

  watchOverlays();

  return {
    layerCount,
    stand: (dialog, drawer) => {
      drawerOpen.value = drawer;
      dialogOpen.value = dialog;
    }
  };
}
