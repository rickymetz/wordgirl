/**
 * Sets a card's copies of a glyph as one tightly spaced ROW, and sizes
 * every row on a board from one shared scale.
 *
 * - Spacing is measured from the INK, not from a fixed slot per copy: each
 *   copy sits `gap` from the next, edge to edge, so a narrow "?" and a
 *   wide "@" are set equally tight. (Fixed square slots left narrow
 *   glyphs floating far apart.)
 * - One height per board: every row is `height` units tall and the widest
 *   possible row (three of the widest glyph) sets `maxRowAspect`, which the
 *   card uses to size rows so all copies on the board render the same size
 *   whatever their count.
 * - A character board keeps the face's natural proportions (an "a" is
 *   smaller than an "R"); a faces board equalizes INK HEIGHT, so no face
 *   reads heavier merely because its letter is drawn larger.
 * - Ink is centered vertically: a card shows one glyph kind at a time, and
 *   centered ink sits calmly in it.
 */
import type { Board } from "../engine/schedule";

export interface Outline {
  d: string;
  adv: number;
  box: [number, number, number, number];
}

export interface PlacedGlyph {
  d: string;
  /** Scale applied to the outline (1 except on a faces board). */
  s: number;
  /** Ink box center, outline units. */
  cx: number;
  cy: number;
  /** Ink width after scaling. */
  w: number;
}

export interface GlyphLayout {
  /** Row height in layout units. */
  height: number;
  /** Space between copies, edge of ink to edge of ink. */
  gap: number;
  /** Side margin, so outside outlines never touch the viewBox edge. */
  pad: number;
  glyphs: [PlacedGlyph, PlacedGlyph, PlacedGlyph];
  /** Width/height of the widest row a board can deal (three of the widest glyph). */
  maxRowAspect: number;
}

/** Vertical breathing room, as a share of the tallest ink. */
const PAD_Y = 0.06;
/** Copy-to-copy gap, as a share of the board's mean ink height. Tight, like set type. */
const GAP = 0.13;

/** Pure: the caller supplies the three outlines (see glyphLayout.ts). */
export function layoutOutlines(outlines: readonly [Outline, Outline, Outline], kind: Board["kind"]): GlyphLayout {
  const heights = outlines.map((o) => o.box[3] - o.box[1]);
  const mean = heights.reduce((a, b) => a + b, 0) / heights.length;
  const scales = outlines.map((_, i) => (kind === "faces" ? mean / heights[i] : 1));
  const inkH = Math.max(...heights.map((h, i) => h * scales[i]));
  const height = Math.round(inkH * (1 + 2 * PAD_Y));
  const gap = Math.round(mean * GAP);
  const pad = Math.round(gap / 2);
  const glyphs = outlines.map((o, i) => ({
    d: o.d,
    s: scales[i],
    cx: (o.box[0] + o.box[2]) / 2,
    cy: (o.box[1] + o.box[3]) / 2,
    w: (o.box[2] - o.box[0]) * scales[i],
  })) as GlyphLayout["glyphs"];
  const layout = { height, gap, pad, glyphs, maxRowAspect: 0 };
  layout.maxRowAspect = Math.max(...glyphs.map((_, i) => rowWidth(layout, i, 3))) / height;
  return layout;
}

/** Width of a row of `count` copies of glyph `i`, in layout units. */
export function rowWidth(layout: Pick<GlyphLayout, "glyphs" | "gap" | "pad">, i: number, count: number): number {
  return Math.round(count * layout.glyphs[i].w + (count - 1) * layout.gap + 2 * layout.pad);
}

/** SVG transform for copy `k` of glyph `i` in its row. */
export function copyTransform(layout: GlyphLayout, i: number, k: number): string {
  const g = layout.glyphs[i];
  const tx = layout.pad + k * (g.w + layout.gap) + g.w / 2 - g.cx * g.s;
  const ty = layout.height / 2 - g.cy * g.s;
  return `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${g.s.toFixed(4)})`;
}
