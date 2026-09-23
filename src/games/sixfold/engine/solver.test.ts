import { describe, expect, it } from "vitest";
import { BOX_LAYOUT } from "./layouts";
import type { Grid, WordConstraint } from "./solver";
import { buildUnits, countSolutions, emptyGrid, logicSolve } from "./solver";
import { CELLS } from "./types";

const units = buildUnits(BOX_LAYOUT.regions);

/** A valid 6×6 box sudoku over letter indices 0-5. */
const SOLVED = [
  [0, 1, 2, 3, 4, 5],
  [3, 4, 5, 0, 1, 2],
  [1, 2, 0, 4, 5, 3],
  [4, 5, 3, 1, 2, 0],
  [2, 0, 1, 5, 3, 4],
  [5, 3, 4, 2, 0, 1],
].flat();

function grid(values: readonly number[]): Grid {
  return Int8Array.from(values);
}

describe("countSolutions", () => {
  it("accepts a full valid grid exactly once", () => {
    expect(countSolutions(grid(SOLVED), units)).toBe(1);
  });

  it("rejects clashing givens", () => {
    const g = emptyGrid();
    g[0] = 2;
    g[1] = 2;
    expect(countSolutions(g, units)).toBe(0);
  });

  it("finds many grids for an empty board, stopping at the limit", () => {
    expect(countSolutions(emptyGrid(), units, [], 5)).toBe(5);
  });

  it("writes the first solution it finds", () => {
    const g = grid(SOLVED);
    g[7] = -1;
    const out = emptyGrid();
    expect(countSolutions(g, units, [], 2, undefined, out)).toBe(1);
    expect([...out]).toEqual(SOLVED);
  });

  it("lets a word line decide between otherwise equal grids", () => {
    // Blank two rows: the rows of one box band can swap letters freely.
    const g = grid(SOLVED);
    for (let c = 0; c < 12; c++) g[c] = -1;
    const free = countSolutions(g, units, [], 10);
    expect(free).toBeGreaterThan(1);
    const row0: WordConstraint = {
      cells: [0, 1, 2, 3, 4, 5],
      words: [SOLVED.slice(0, 6)],
    };
    expect(countSolutions(g, units, [row0], 10)).toBe(1);
  });
});

describe("logicSolve", () => {
  it("finishes a grid by singles", () => {
    const g = grid(SOLVED);
    for (const c of [0, 7, 14, 21, 28, 35]) g[c] = -1;
    const r = logicSolve(g, units);
    expect(r.solved).toBe(true);
    expect(r.wordPlacements).toBe(0);
  });

  it("uses a word line when singles run out", () => {
    const g = grid(SOLVED);
    for (let c = 0; c < 12; c++) g[c] = -1;
    expect(logicSolve(g, units).solved).toBe(false);
    const row0: WordConstraint = {
      cells: [0, 1, 2, 3, 4, 5],
      words: [SOLVED.slice(0, 6)],
    };
    const r = logicSolve(g, units, [row0]);
    expect(r.solved).toBe(true);
    expect(r.wordPlacements).toBeGreaterThan(0);
  });

  it("gives up rather than guess on an empty board", () => {
    expect(logicSolve(emptyGrid(), units).solved).toBe(false);
    expect(emptyGrid().length).toBe(CELLS);
  });
});
