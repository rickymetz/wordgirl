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
  /** Mean stroke thickness, outline units (2 x area / perimeter, from the bake). */
  stem?: number;
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
  /** Mean stroke thickness after scaling (0 when the bake didn't record it). */
  stem: number;
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
    stem: (o.stem ?? 0) * scales[i],
  })) as GlyphLayout["glyphs"];
  const layout = { height, gap, pad, glyphs, maxRowAspect: 0 };
  layout.maxRowAspect = Math.max(...glyphs.map((_, i) => rowWidth(layout, i, 3))) / height;
  return layout;
}

/** Width of a row of `count` copies of glyph `i`, in layout units. */
export function rowWidth(layout: Pick<GlyphLayout, "glyphs" | "gap" | "pad">, i: number, count: number, extraGap = 0): number {
  return Math.round(count * layout.glyphs[i].w + (count - 1) * (layout.gap + extraGap) + 2 * layout.pad);
}

/** CSS px of the open fill's outline: drawn centered on the edge, so half of it lies outside the letter. */
export const OPEN_STROKE = 3;
/** Share of a card's height a row may take. */
const ROW_OF_CARD_H = 0.8;
/** Share of a card's width the widest row may take. */
const ROW_OF_CARD_W = 0.86;
/** The touch floor a card never shrinks below. */
export const MIN_CARD = 44;
/** Grid gap between cards, px. */
export const CARD_GAP = 8;

/** Cards across. Fixed: three columns is how the game reads, like Set's own layout. */
export const COLS = 3;

export interface BoardFit {
  rows: number;
  /** Row height, px: the size every glyph on the board is drawn at. */
  rowPx: number;
}

/**
 * Pure: the row height for `n` cards dealt three across into a `width` x
 * `height` px box. The lesser of a share of the card's height and what lets
 * the board's WIDEST row (`maxRowAspect`) fit the card's width, less room for
 * an open outline's spacing (two extra gaps of `OPEN_STROKE` px). Floored to
 * whole px, so every glyph on the board is drawn the same size.
 */
export function fitBoard(n: number, width: number, height: number, maxRowAspect: number): BoardFit {
  const rows = Math.ceil(n / COLS);
  const cardW = (width - (COLS - 1) * CARD_GAP) / COLS;
  const cardH = (height - (rows - 1) * CARD_GAP) / rows;
  const rowPx = Math.floor(Math.max(0, Math.min(ROW_OF_CARD_H * cardH, (ROW_OF_CARD_W * cardW - 2 * OPEN_STROKE) / maxRowAspect)));
  return { rows, rowPx };
}

/** SVG transform for copy `k` of glyph `i` in its row; `extraGap` widens the spacing (layout units). */
export function copyTransform(layout: GlyphLayout, i: number, k: number, extraGap = 0): string {
  const g = layout.glyphs[i];
  const tx = layout.pad + k * (g.w + layout.gap + extraGap) + g.w / 2 - g.cx * g.s;
  const ty = layout.height / 2 - g.cy * g.s;
  return `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${g.s.toFixed(4)})`;
}
