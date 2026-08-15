export type SlotDir = "across" | "down";

/**
 * The two boards a day carries. `standard` is the original game —
 * mixed 3-5 letter lines on the shapes in SHAPES. `hard` runs every
 * line at five letters on denser skeletons, so the same-sized word
 * list is harder to find rather than longer: measured across 30 days,
 * standard shows 54% of each line's letters as givens against hard's
 * 48%, on lines a letter and a half longer.
 *
 * ORDER MATTERS NOWHERE, but the STRING does — it is part of the seed
 * and of every storage key. `standard` must keep producing the seed
 * `daily:<dateKey>` it always has, or every archived day regenerates
 * into a different puzzle.
 */
export type Level = "standard" | "hard";

export const LEVELS: Level[] = ["standard", "hard"];

/** Player-facing board name. */
export const LEVEL_LABEL: Record<Level, string> = {
  standard: "Standard",
  hard: "Hard",
};

export interface Slot {
  dir: SlotDir;
  row: number;
  col: number;
  len: number;
}

export interface Shape {
  /** Stable id — seeds reference shapes by library index, names by id. */
  id: string;
  slots: Slot[];
}

/** A combo is one complete valid filling: a word per slot, slot order. */
export type Combo = string[];

export interface CrosshatchPuzzle {
  seed: string;
  dictVersion: number;
  /** Which board this is — derived from the seed, never stored. */
  level: Level;
  shape: Shape;
  rows: number;
  cols: number;
  /** Locked letters: cell key `${row},${col}` -> letter. */
  givens: Record<string, string>;
  /** Every valid filling, enumerated at generation. Never persisted. */
  combos: Combo[];
}

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

/** The cells of a slot, in letter order. */
export function slotCells(slot: Slot): { row: number; col: number }[] {
  return Array.from({ length: slot.len }, (_, i) => ({
    row: slot.dir === "across" ? slot.row : slot.row + i,
    col: slot.dir === "across" ? slot.col + i : slot.col,
  }));
}

export function comboKey(combo: Combo): string {
  return combo.join("|");
}
