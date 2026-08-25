export type EdgeFade = "none" | "left" | "right" | "both";

/**
 * Which edges of a horizontal scroller should fade, from its scroll
 * geometry: an edge fades only when there is content PAST it — so the
 * right edge stops fading once you reach the end, and the left edge starts
 * fading once you've scrolled away from the start. A 1px slack absorbs the
 * sub-pixel scroll positions snapping and hi-dpi produce, so the end
 * states latch cleanly instead of flickering. Pure, so it can be tested
 * without a layout engine.
 */
export function edgeFade(
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number,
): EdgeFade {
  if (scrollWidth <= clientWidth + 1) return "none"; // nothing to scroll
  const atStart = scrollLeft <= 1;
  const atEnd = scrollLeft + clientWidth >= scrollWidth - 1;
  if (atStart) return "right";
  if (atEnd) return "left";
  return "both";
}
