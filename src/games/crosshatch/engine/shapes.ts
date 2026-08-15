import type { Level, Shape } from "./types";

/**
 * Hand-designed skeletons: 3-5 slots, words of 3-5 letters, every slot
 * intersecting at least one other, bounded by a 5x5 grid so cells stay
 * comfortably tappable on a phone. Coordinates are (row, col) origins.
 *
 * ORDER AND CONTENTS ARE FROZEN per dictionary version — daily seeds
 * pick shapes by index, so edits reshuffle history (see DICT_VERSION).
 */
export const SHAPES: Shape[] = [
  {
    // Two verticals bridged by a crossbar.
    id: "h",
    slots: [
      { dir: "down", row: 0, col: 0, len: 5 },
      { dir: "down", row: 0, col: 4, len: 5 },
      { dir: "across", row: 2, col: 0, len: 5 },
    ],
  },
  {
    // A square ring: every word intersects two others at its ends.
    id: "ring",
    slots: [
      { dir: "across", row: 0, col: 0, len: 4 },
      { dir: "across", row: 3, col: 0, len: 4 },
      { dir: "down", row: 0, col: 0, len: 4 },
      { dir: "down", row: 0, col: 3, len: 4 },
    ],
  },
  {
    // One spine with three teeth hanging from it.
    id: "comb",
    slots: [
      { dir: "across", row: 0, col: 0, len: 5 },
      { dir: "down", row: 0, col: 0, len: 3 },
      { dir: "down", row: 0, col: 2, len: 3 },
      { dir: "down", row: 0, col: 4, len: 3 },
    ],
  },
  {
    // The comb rotated: a vertical spine, three rungs.
    id: "rake",
    slots: [
      { dir: "down", row: 0, col: 0, len: 5 },
      { dir: "across", row: 0, col: 0, len: 3 },
      { dir: "across", row: 2, col: 0, len: 3 },
      { dir: "across", row: 4, col: 0, len: 3 },
    ],
  },
  {
    // A staircase descending to the right.
    id: "stairs",
    slots: [
      { dir: "across", row: 0, col: 0, len: 3 },
      { dir: "down", row: 0, col: 2, len: 3 },
      { dir: "across", row: 2, col: 2, len: 3 },
      { dir: "down", row: 2, col: 4, len: 3 },
    ],
  },
  {
    // A big cross with a short third arm.
    id: "cross",
    slots: [
      { dir: "across", row: 2, col: 0, len: 5 },
      { dir: "down", row: 0, col: 2, len: 5 },
      { dir: "down", row: 0, col: 4, len: 3 },
    ],
  },
  {
    // Two rails, three sleepers: the densest shape.
    id: "lattice",
    slots: [
      { dir: "across", row: 0, col: 0, len: 5 },
      { dir: "across", row: 2, col: 0, len: 5 },
      { dir: "down", row: 0, col: 0, len: 3 },
      { dir: "down", row: 0, col: 2, len: 3 },
      { dir: "down", row: 0, col: 4, len: 3 },
    ],
  },
  {
    // Two crossings chained on one spine.
    id: "zipper",
    slots: [
      { dir: "across", row: 1, col: 0, len: 4 },
      { dir: "down", row: 0, col: 1, len: 4 },
      { dir: "down", row: 0, col: 3, len: 4 },
    ],
  },
];

/**
 * The HARD board's skeletons: every line five letters, more of them,
 * and more crossings between them — still inside the same 5x5 grid, so
 * the board is no harder to tap than the standard one.
 *
 * Why five letters everywhere rather than a bigger grid: the difficulty
 * a player feels is the share of a line already showing. Standard runs
 * 4.0-letter lines with 2.14 givens on them (54% visible); these run at
 * 48% on lines a letter and a half longer, which makes each word harder
 * to find without making the day longer to finish. A 6x6 would push
 * further still, but its sixth row overflows the height budget at the
 * Huge text setting.
 *
 * A SEPARATE ARRAY, never appended to SHAPES: daily seeds index that
 * one by position, so adding to it would reshuffle every archived day.
 * Its own order is frozen for the same reason.
 */
export const HARD_SHAPES: Shape[] = [
  {
    // The crosshatch proper: two lines each way, four crossings.
    id: "hash",
    slots: [
      { dir: "across", row: 1, col: 0, len: 5 },
      { dir: "across", row: 3, col: 0, len: 5 },
      { dir: "down", row: 0, col: 1, len: 5 },
      { dir: "down", row: 0, col: 3, len: 5 },
    ],
  },
  {
    // A full-width ring: every line meets two others, at its ends.
    id: "ring5",
    slots: [
      { dir: "across", row: 0, col: 0, len: 5 },
      { dir: "across", row: 4, col: 0, len: 5 },
      { dir: "down", row: 0, col: 0, len: 5 },
      { dir: "down", row: 0, col: 4, len: 5 },
    ],
  },
  {
    // The ring with a rung through the middle — six crossings, the
    // densest board the dictionary will fill.
    id: "lattice5",
    slots: [
      { dir: "across", row: 0, col: 0, len: 5 },
      { dir: "across", row: 2, col: 0, len: 5 },
      { dir: "across", row: 4, col: 0, len: 5 },
      { dir: "down", row: 0, col: 0, len: 5 },
      { dir: "down", row: 0, col: 4, len: 5 },
    ],
  },
  {
    // One spine across the top, three full-height teeth.
    id: "comb5",
    slots: [
      { dir: "across", row: 0, col: 0, len: 5 },
      { dir: "down", row: 0, col: 0, len: 5 },
      { dir: "down", row: 0, col: 2, len: 5 },
      { dir: "down", row: 0, col: 4, len: 5 },
    ],
  },
  {
    // Three verticals bridged twice — the tallest crossing count that
    // still leaves each line room to vary.
    id: "grid5",
    slots: [
      { dir: "across", row: 0, col: 0, len: 5 },
      { dir: "across", row: 3, col: 0, len: 5 },
      { dir: "down", row: 0, col: 0, len: 5 },
      { dir: "down", row: 0, col: 2, len: 5 },
      { dir: "down", row: 0, col: 4, len: 5 },
    ],
  },
];

export function shapesFor(level: Level): Shape[] {
  return level === "hard" ? HARD_SHAPES : SHAPES;
}
