export type SlotDir = "across" | "down";

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
