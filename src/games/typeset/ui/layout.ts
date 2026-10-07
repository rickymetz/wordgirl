/**
 * Places a board's three glyphs on one shared viewBox, so every copy of
 * every glyph on the board renders at a consistent size.
 *
 * - A character board keeps the face's natural proportions: an "a" is
 *   smaller than an "R", as it is in type.
 * - A faces board equalizes INK HEIGHT across the three faces, so no face
 *   reads heavier merely because its letter is drawn larger.
 *
 * Each glyph is centered on its ink box, not its baseline: a card shows
 * one glyph kind at a time, and centered ink sits calmly in the card.
 */
import type { Board } from "../engine/schedule";

export interface Outline {
  d: string;
  adv: number;
  box: [number, number, number, number];
}

export interface PlacedGlyph {
  d: string;
  /** SVG transform placing the outline centered in the shared viewBox. */
  transform: string;
}

export interface GlyphLayout {
  /** Side of the square viewBox, in outline units. */
  size: number;
  glyphs: [PlacedGlyph, PlacedGlyph, PlacedGlyph];
}

/** Breathing room around the largest glyph, as a share of the box. */
const PAD = 0.08;

/** Pure: the caller supplies the three outlines (see glyphLayout.ts). */
export function layoutOutlines(outlines: readonly [Outline, Outline, Outline], kind: Board["kind"]): GlyphLayout {
  const heights = outlines.map((o) => o.box[3] - o.box[1]);
  const target = heights.reduce((a, b) => a + b, 0) / heights.length;
  const scales = outlines.map((_, i) => (kind === "faces" ? target / heights[i] : 1));
  const extent = Math.max(
    ...outlines.map((o, i) => Math.max(o.box[2] - o.box[0], o.box[3] - o.box[1]) * scales[i]),
  );
  const size = Math.round(extent * (1 + 2 * PAD));
  const placed = outlines.map((o, i) => {
    const s = scales[i];
    const cx = (o.box[0] + o.box[2]) / 2;
    const cy = (o.box[1] + o.box[3]) / 2;
    const tx = size / 2 - cx * s;
    const ty = size / 2 - cy * s;
    return { d: o.d, transform: `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${s.toFixed(4)})` };
  });
  return { size, glyphs: placed as GlyphLayout["glyphs"] };
}
