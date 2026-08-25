/**
 * How far a hub card's preview art has to drop to get out from under the
 * card's title, and how much taller the card must grow to allow it.
 *
 * The titles are long words in a wide display face, so above the default
 * Text size they outgrow their column and run sideways into the art — the
 * title reading through the tiles. Which games it hits, and by how much,
 * depends on the name, the face, the Text size and the screen width all at
 * once, so this takes MEASURED boxes rather than a per-game constant.
 */

export interface ClearanceBoxes {
  /** Right edge of the title's rendered text (its advance, not its column). */
  titleRight: number;
  /** Bottom of the title's line box. */
  titleBottom: number;
  /** The art's box where CSS puts it, before any shift of ours. */
  artLeft: number;
  artTop: number;
  artBottom: number;
  /** Bottom of the card's CONTENT box, before any padding of ours. */
  cardBottom: number;
}

export interface Clearance {
  /** Px to translate the art down. */
  shift: number;
  /** Px of extra bottom padding the card needs to contain the shifted art. */
  extraPad: number;
}

const NONE: Clearance = { shift: 0, extraPad: 0 };

/**
 * Zero unless the boxes overlap on BOTH axes: at the default size a title
 * and its art share a vertical band happily, side by side, and only a title
 * long enough to reach across is a collision.
 *
 * The art drops by the full overlap — measured against the title's line box,
 * which runs a few px below the last glyph, so the clearance comes with a
 * little air. Where the card has no room left under the art (the tallest
 * previews already fill it), `extraPad` grows the card instead of capping
 * the shift: bottom padding sits outside the content box, so the card gets
 * taller without moving the text and re-opening the collision it just fixed.
 */
export function clearance(boxes: ClearanceBoxes): Clearance {
  const overlapX = boxes.titleRight - boxes.artLeft;
  const overlapY = boxes.titleBottom - boxes.artTop;
  if (overlapX <= 0 || overlapY <= 0) return NONE;
  const room = Math.max(0, boxes.cardBottom - boxes.artBottom);
  return { shift: overlapY, extraPad: Math.max(0, overlapY - room) };
}
