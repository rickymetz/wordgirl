/**
 * Picking the longest string that still fits a box, by MEASURING rather
 * than guessing. Two settings move the goalposts independently — Text size
 * scales the glyphs, and the accessible Font swaps in a wider face — so a
 * width tuned against one combination is wrong for the next (the house
 * rule for boards, applied to a line of type).
 */

/**
 * The first candidate that fits `maxPx`, given longest-first; the last
 * (shortest) when none do, since something has to render. A width of 0 —
 * an unmounted or not-yet-measured box — keeps the longest rather than
 * flashing the shortest and settling back.
 */
export function firstFitting(
  candidates: string[],
  maxPx: number,
  measure: (text: string) => number,
): string {
  if (candidates.length === 0) return "";
  if (!(maxPx > 0)) return candidates[0];
  return (
    candidates.find((c) => measure(c) <= maxPx) ??
    candidates[candidates.length - 1]
  );
}

// One canvas for the whole app: building the 2D context is the expensive
// part, and `font` is reassigned per measurement anyway. `undefined` means
// "not tried yet", `null` means the environment has no 2D canvas (jsdom).
let ctx: CanvasRenderingContext2D | null | undefined;

/**
 * A text measurer using `el`'s own computed font, so the numbers reflect
 * whatever the Text-size and Font settings currently resolve to. Returns
 * null where there is no canvas to measure with (jsdom in tests) — callers
 * fall back to their longest candidate rather than guessing a width.
 */
export function measurerFor(el: Element): ((text: string) => number) | null {
  if (ctx === undefined) {
    ctx = document.createElement("canvas").getContext("2d");
  }
  if (!ctx) return null;
  const style = getComputedStyle(el);
  // The shorthand can come back empty in some engines; build it from parts.
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const c = ctx;
  return (text) => c.measureText(text).width;
}
