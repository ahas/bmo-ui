import { isIconStyle } from "../domain/icon-styles";

import type { IconStyleOptions } from "../domain/icon-styles";

// The icon library puts each icon's style in ahead of every stylesheet the page has, and a sheet put
// in ahead of the others makes the browser rebuild its whole set of fonts: for one frame every letter
// stands in the system font behind and the whole screen lurches (`docs/design.md`, "Fonts"). Those
// styles are put in behind the others instead. They sit in a cascade layer and match with no weight
// of their own, so their place among the sheets changes nothing they draw; the library offers no
// setting for where it puts them, so the head is told here.
export default defineNuxtPlugin(() => {
  const head = document.head;
  const options = useAppConfig().icon as IconStyleOptions;
  const insertBefore = head.insertBefore.bind(head);

  head.insertBefore = function <T extends Node>(node: T, child: Node | null): T {
    return isIconStyle(node, options) ? head.appendChild(node) : insertBefore(node, child);
  };
});
