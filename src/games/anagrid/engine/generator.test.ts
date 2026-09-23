import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dateKeyRange } from "../../../lib/date";
import { parseDictionary } from "../../../lib/words/dictionary";
import { anagramFamilies, lineWords } from "./families";
import { dailyPuzzle } from "./generator";
import { layoutById } from "./layouts";
import type { WordConstraint } from "./solver";
import { buildUnits, countSolutions, logicSolve } from "./solver";
import type { AnagridPuzzle } from "./types";
import { CELLS, N } from "./types";

const dict = parseDictionary(
  readFileSync(new URL("../../../lib/words/dictionary.txt", import.meta.url), "utf8"),
);
const required = new Set(dict.required.buckets.get(N));

function hiddenCells(p: AnagridPuzzle): number[] {
  return Array.from({ length: N }, (_, i) => (p.col < 0 ? i * N + i : i * N + p.col));
}
function rowCells(p: AnagridPuzzle): number[] {
  return Array.from({ length: N }, (_, c) => p.row * N + c);
}
function spell(p: AnagridPuzzle, cells: number[]): string {
  return cells.map((c) => p.solution[c]).join("");
}
function idx(p: AnagridPuzzle, words: readonly string[]): number[][] {
  return words.map((w) => [...w].map((ch) => p.letters.indexOf(ch)));
}
function givenGrid(p: AnagridPuzzle): Int8Array {
  const g = new Int8Array(CELLS).fill(-1);
  for (const c of p.givens) g[c] = p.letters.indexOf(p.solution[c]);
  return g;
}

// A month of dailies: enough to see both geometries and a family cycle.
const DAYS = dateKeyRange("2026-10-01", "2026-11-15");
const puzzles = DAYS.map((d) => [d, dailyPuzzle(dict, d).puzzle] as const);

describe("dailyPuzzle", () => {
  it("is deterministic per date", () => {
    expect(dailyPuzzle(dict, DAYS[3]).puzzle).toEqual(puzzles[3][1]);
  });

  it("uses both geometries", () => {
    const geos = new Set(puzzles.map(([, p]) => (p.col < 0 ? "diagonal" : "cross")));
    expect(geos).toEqual(new Set(["diagonal", "cross"]));
  });

  it("never repeats a family within one cycle", () => {
    const F = anagramFamilies(dict).length;
    const window = puzzles.slice(0, F).map(([, p]) => p.letters);
    expect(new Set(window).size).toBe(window.length);
  });

  describe.each(puzzles)("%s", (_date, p) => {
    const units = buildUnits(layoutById(p.layoutId)!.regions);

    it("is a valid sudoku solution", () => {
      for (const cells of units.unitCells) {
        expect(new Set(cells.map((c) => p.solution[c])).size).toBe(N);
      }
    });

    it("spells two different common words from the family", () => {
      expect(spell(p, rowCells(p))).toBe(p.cluedWord);
      expect(spell(p, hiddenCells(p))).toBe(p.hiddenWord);
      expect(p.cluedWord).not.toBe(p.hiddenWord);
      for (const w of [p.cluedWord, p.hiddenWord]) {
        expect(required.has(w), w).toBe(true);
        expect(p.family).toContain(w);
      }
    });

    it("needs the words: sudoku rules alone leave several grids", () => {
      expect(countSolutions(givenGrid(p), units, [], 2)).toBe(2);
    });

    it("is unique once the clue is solved, against ANY dictionary anagram", () => {
      const lines: WordConstraint[] = [
        { cells: hiddenCells(p), words: idx(p, lineWords(dict, p.letters)) },
        { cells: rowCells(p), words: idx(p, [p.cluedWord]) },
      ];
      expect(countSolutions(givenGrid(p), units, lines, 2)).toBe(1);
    });

    it("falls to the player's toolkit: singles plus common words", () => {
      const lines: WordConstraint[] = [
        { cells: hiddenCells(p), words: idx(p, p.family) },
        { cells: rowCells(p), words: idx(p, [p.cluedWord]) },
      ];
      expect(logicSolve(givenGrid(p), units, lines).solved).toBe(true);
    });
  });
});
