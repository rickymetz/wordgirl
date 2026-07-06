import type { Shape } from "./types";

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
