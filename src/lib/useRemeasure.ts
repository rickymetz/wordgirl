import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Re-run a measurement whenever anything that changes text metrics does.
 *
 * Three triggers, because no one of them covers the others:
 * - the element resizing (rotation, the responsive breakpoint, and the
 *   Text-size setting, which scales every rem-based box around it);
 * - `document.fonts.ready`, because the first paint measures FALLBACK
 *   metrics and the real faces land after it;
 * - the settings attributes on `<html>`, because Settings applies the Font
 *   swap by mutating the document, not through React — and the accessible
 *   face is a different width at the same size, so nothing resizes and
 *   nothing else would tell us to look again.
 *
 * Runs as a layout effect so the first measured value is the first one
 * painted, never a wrong one corrected a frame later.
 */
export function useRemeasure(
  target: React.RefObject<Element | null>,
  measure: () => void,
): void {
  // The callback closes over fresh props every render; the observers are
  // set up once. A ref keeps them calling the current one.
  const latest = useRef(measure);
  useEffect(() => {
    latest.current = measure;
  });

  useLayoutEffect(() => {
    const el = target.current;
    if (!el) return;
    const run = () => latest.current();
    run();

    const resize =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(run) : null;
    resize?.observe(el);
    const attrs =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(run)
        : null;
    attrs?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-font", "style"],
    });
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) run();
    });
    return () => {
      cancelled = true;
      resize?.disconnect();
      attrs?.disconnect();
    };
  }, [target]);
}
