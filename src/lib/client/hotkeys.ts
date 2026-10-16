"use client";

/**
 * One guard for every single-key shortcut in the app (Hook Lab ←/→/↑, editor Space/⌫/arrows).
 * Skips key repeats, modified keys, anything typed into a field, and any key pressed while a
 * dialog, menu, listbox or popover is open, so shortcuts never fire "through" an overlay.
 */
export function shouldIgnoreHotkey(e: KeyboardEvent, opts: { allowModifiers?: boolean } = {}): boolean {
  if (e.defaultPrevented || e.repeat || e.isComposing) return true;
  if (!opts.allowModifiers && (e.metaKey || e.ctrlKey || e.altKey)) return true;
  const el = e.target instanceof Element ? e.target : null;
  if (
    el?.closest(
      "input,textarea,select,[contenteditable=''],[contenteditable=true],[role=dialog],[role=alertdialog],[role=menu],[role=listbox],[role=radiogroup],[role=slider],[data-radix-popper-content-wrapper],[cmdk-root]",
    )
  )
    return true;
  // An open overlay anywhere (Radix popovers are role=dialog too). Tooltips don't count.
  if (typeof document !== "undefined" && document.querySelector("[role=dialog][data-state=open],[role=alertdialog][data-state=open],[role=menu][data-state=open],[cmdk-root]")) return true;
  return false;
}
