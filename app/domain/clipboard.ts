// Text put on the clipboard (`docs/components.md`, "Code and files"). The clipboard API is only
// offered on a secure origin and may be refused even there, so a copy it refuses falls back to the
// selection the browser has always had. The answer is whether the text went on the clipboard.
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard !== undefined) {
    try {
      await navigator.clipboard.writeText(text);

      return true;
    } catch {
      // Falls through to the selection below.
    }
  }

  const holder = document.createElement("textarea");

  holder.value = text;
  holder.setAttribute("readonly", "");
  holder.style.position = "fixed";
  holder.style.opacity = "0";
  document.body.appendChild(holder);
  holder.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    holder.remove();
  }
}
