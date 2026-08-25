import { useLayoutEffect } from "react";

/**
 * Re-run a measurement whenever anything that changes text metrics does.
 *
 * Four triggers, because no one of them covers the others:
 * - the element resizing (rotation, the responsive breakpoint, and the
 *   Text-size setting, which scales every rem-based box around it);
 * - `document.fonts.ready`, because the first paint measures FALLBACK
 *   metrics and the real faces land after it;
 * - `loadingdone` on top of that, because `ready` settles once: the
 *   accessible face is `font-display: swap` and is only REQUESTED when the
 *   setting selects it, so it arrives long after the initial `ready` and
 *   would otherwise be measured forever as its fallback;
 * - the settings attributes on `<html>`, because Settings applies the Font
 *   swap by mutating the document, not through React — and the accessible
 *   face is a different width at the same size, so nothing resizes and
 *   nothing else would tell us to look again.
 *
 * Runs as a layout effect so the first measured value is the first one
 * painted, never a wrong one corrected a frame later.
 *
 * `measure` is a DEPENDENCY, not just a callback: memoise it (useCallback)
 * over whatever it reads, and it re-runs when those change — a date rolling
 * over at midnight is a re-measure just as much as a resize is.
 */
export function useRemeasure(
  target: React.RefObject<Element | null>,
  measure: () => void,
): void {
  useLayoutEffect(() => {
    const el = target.current;
    if (!el) return;
    measure();

    const resize =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    resize?.observe(el);
    const attrs =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(measure)
        : null;
    attrs?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-font", "style"],
    });
    const fonts = document.fonts;
    let cancelled = false;
    void fonts?.ready.then(() => {
      if (!cancelled) measure();
    });
    fonts?.addEventListener?.("loadingdone", measure);
    return () => {
      cancelled = true;
      resize?.disconnect();
      attrs?.disconnect();
      fonts?.removeEventListener?.("loadingdone", measure);
    };
  }, [target, measure]);
}
