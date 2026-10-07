/**
 * Binds the pure layout (layout.ts) to the baked outlines. Kept apart so
 * the hub-card preview can lay out its three glyphs from a tiny subset
 * file instead of pulling every outline into the hub bundle.
 */
import glyphData from "../glyphs.json";
import type { Board, BoardGlyph } from "../engine/schedule";
import { layoutOutlines, type GlyphLayout, type Outline } from "./layout";

export type { GlyphLayout } from "./layout";

const OUTLINES = glyphData.glyphs as unknown as Record<string, Outline>;

export function outlineFor(g: BoardGlyph): Outline {
  const o = OUTLINES[`${g.face}:${g.char}`];
  if (!o) throw new Error(`typeset: no baked outline for ${g.face}:${g.char} — run npm run bake:typeset-glyphs`);
  return o;
}

export function layoutGlyphs(glyphs: Board["glyphs"], kind: Board["kind"]): GlyphLayout {
  return layoutOutlines(glyphs.map(outlineFor) as unknown as [Outline, Outline, Outline], kind);
}
