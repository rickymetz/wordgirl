import { useEffect, useRef } from "react";

/**
 * Focus containment for dialogs: when `active`, moves focus into the
 * container (its [autofocus] child, else its first focusable, else the
 * container itself), traps Tab inside, and restores the opener's focus
 * when the dialog closes or unmounts. aria-modal promises assistive
 * tech that the background doesn't exist — this makes it true.
 */
export function useModalFocus<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!active || !node) return;
    const opener = document.activeElement as HTMLElement | null;

    const focusables = () =>
      [
        ...node.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => !el.hasAttribute("disabled"));

    // data-autofocus, not React's autoFocus prop: that fires during
    // commit, BEFORE this effect captures the opener — we'd "restore"
    // focus to the dialog's own button. The container itself can carry
    // it: results cards focus their (ring-free) body, not the X.
    (
      (node.matches("[data-autofocus]") ? node : null) ??
      node.querySelector<HTMLElement>("[data-autofocus]") ??
      focusables()[0] ??
      node
    ).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) {
        e.preventDefault();
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || current === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
      opener?.focus?.();
    };
  }, [active]);

  return ref;
}
