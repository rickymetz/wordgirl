/**
 * Measures the two ways a board can fail a player's eye, from the baked
 * outlines rather than from the pool's labels (legibility.test.ts runs
 * them over every board the schedule and tutorial can deal):
 *
 *  - A stroke too thin to HOLD the cross-hatch. The hatch is a lattice
 *    `pitch` px apart (Glyph.tsx); a stroke much narrower than that shows
 *    a stray dot or two of it, and the middle fill reads as a pale solid
 *    (Fraunces' "#", launch day). `hatchRatio` is the glyph's mean stroke
 *    over the hatch pitch, at the size a phone actually draws it.
 *  - Two faces that draw the letter alike. Faces boards promise three
 *    silhouettes, but a letter with no serifs to show (an "e") draws a
 *    soft serif and a geometric sans as near twins (Literata and Jost,
 *    launch day). `silhouetteOverlap` lays two glyphs over each other at
 *    the same ink height, centered, the way the board sizes them, and
 *    returns the share of their ink they hold in common.
 *
 * Test-only, like raster.ts: nothing in the app imports it.
 */
import { DAILY_DEAL } from "../engine/sets";
import { fitBoard, type GlyphLayout, type Outline } from "./layout";
import { overlap, rasterize } from "./raster";

/**
 * The board width the hatch is judged at: a 375px phone (iPhone SE/mini)
 * less the screen's px-5 gutters. Narrower screens draw smaller still, but
 * every glyph shrinks by the same factor there, so this ranks them the same.
 */
export const REFERENCE_BOARD_W = 375 - 2 * 20;

/** Hatch pitch in px for a row `rowPx` tall (mirrors Glyph.tsx). */
export function hatchPitchPx(rowPx: number): number {
  return Math.max(0.075 * rowPx, 4.5);
}

/** Each glyph's mean stroke over the hatch pitch, at the reference board width. */
export function hatchRatios(layout: GlyphLayout, boardW = REFERENCE_BOARD_W): number[] {
  // Height unbounded: a three-across board is width-bound on a phone.
  const { rowPx } = fitBoard(DAILY_DEAL.size, boardW, 10_000, layout.maxRowAspect);
  const pitch = hatchPitchPx(rowPx);
  return layout.glyphs.map((g) => (g.stem * rowPx) / layout.height / pitch);
}

/** Ink height the silhouettes are compared at, px: about a card's row. */
const COMPARE_H = 64;

/** Share of ink two glyphs hold in common at the same ink height, centered (0 to 1). */
export function silhouetteOverlap(a: Outline, b: Outline): number {
  const mask = (o: Outline) => rasterize(o, COMPARE_H / (o.box[3] - o.box[1]), 3 * COMPARE_H, 2 * COMPARE_H);
  return overlap(mask(a), mask(b));
}
