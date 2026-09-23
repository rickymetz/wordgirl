import { buildUnits, logicSolve, type WordConstraint } from "./solver";
import type { SixfoldPuzzle } from "./types";
import { CELLS, N } from "./types";

export function hiddenCells(p: SixfoldPuzzle): number[] {
  return Array.from({ length: N }, (_, i) => (p.col < 0 ? i * N + i : i * N + p.col));
}

export function cluedCells(p: SixfoldPuzzle): number[] {
  return Array.from({ length: N }, (_, c) => p.row * N + c);
}

/** The player's toolkit's word knowledge: the clue's row, a family word on the hidden line. */
export function playerLines(p: SixfoldPuzzle): WordConstraint[] {
  const idx = (w: string) => [...w].map((ch) => p.letters.indexOf(ch));
  return [
    { cells: hiddenCells(p), words: p.family.map(idx) },
    { cells: cluedCells(p), words: [idx(p.cluedWord)] },
  ];
}

/**
 * The cell a hint should fill: the first one the player's own toolkit
 * would deduce next, starting from what is on the board and RIGHT (a
 * wrong letter is no footing for a deduction). A hint then teaches the
 * next move instead of filling whatever cell happens to come first in
 * reading order. Falls back to the first empty-or-wrong cell, which
 * only a board the toolkit can't finish would reach.
 */
export function hintCell(p: SixfoldPuzzle, entries: string): number | null {
  const needsHelp = (c: number) => entries[c] !== p.solution[c];
  const grid = new Int8Array(CELLS).fill(-1);
  for (let c = 0; c < CELLS; c++) {
    if (!needsHelp(c)) grid[c] = p.letters.indexOf(p.solution[c]);
  }
  const trace: number[] = [];
  logicSolve(grid, buildUnits(p.regions), playerLines(p), trace);
  const next = trace.find(needsHelp);
  if (next !== undefined) return next;
  for (let c = 0; c < CELLS; c++) if (needsHelp(c)) return c;
  return null;
}
