import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import { dailySeed, generateDoublet } from "./generator";
import {
  cellKey,
  dominoCells,
  dominoLetters,
  type DoubletPuzzle,
} from "./types";

const dict = parseDictionary(
  readFileSync(
    new URL("../../../lib/words/dictionary.txt", import.meta.url),
    "utf8",
  ),
);

/** The grid the shipped solution produces — same math as the reducer. */
function gridFromSolution(puzzle: DoubletPuzzle): Map<string, string> {
  const grid = new Map<string, string>();
  for (const p of puzzle.solution) {
    const domino = puzzle.dominoes.find((d) => d.id === p.dominoId)!;
    const [c1, c2] = dominoCells(p.anchor, p.orientation);
    const [l1, l2] = dominoLetters(domino, p.orientation);
    grid.set(cellKey(c1.row, c1.col), l1);
    grid.set(cellKey(c2.row, c2.col), l2);
  }
  return grid;
}

describe("generateDoublet", () => {
  it("is deterministic for a given seed", () => {
    const a = generateDoublet(dict, dailySeed("2026-07-12", "medium"));
    const b = generateDoublet(dict, dailySeed("2026-07-12", "medium"));
    expect(a.dominoes).toEqual(b.dominoes);
    expect(a.solution).toEqual(b.solution);
    expect(a.board).toEqual(b.board);
  });

  // Hard boards can take several seconds each; keep the sweep short.
  it("ships a valid, complete solution across a span of dailies", { timeout: 120_000 }, () => {
    for (let day = 12; day <= 14; day++) {
      for (const difficulty of ["easy", "medium", "hard"] as const) {
        const key = `2026-07-${day}`;
        const p = generateDoublet(dict, dailySeed(key, difficulty));
        expect(p.difficulty).toBe(difficulty);

        // Every domino is used exactly once and tiles the whole board.
        expect(p.solution).toHaveLength(p.dominoes.length);
        expect(
          new Set(p.solution.map((s) => s.dominoId)).size,
        ).toBe(p.dominoes.length);
        const grid = gridFromSolution(p);
        expect(grid.size).toBe(p.board.cells.length);
        for (const c of p.board.cells) {
          expect(grid.has(cellKey(c.row, c.col))).toBe(true);
        }

        // Every slot reads as a real word under the game's own rules.
        for (const slot of p.slots) {
          const word = slot.cells
            .map((c) => grid.get(cellKey(c.row, c.col)))
            .join("");
          const ok = dict.has(word.toLowerCase());
          expect(ok, `${difficulty} ${key}: "${word}"`).toBe(true);
        }
      }
    }
  });
});
