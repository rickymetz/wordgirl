import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dateKeyRange } from "../../../lib/date";
import { parseDictionary } from "../../../lib/words/dictionary";
import { PROMOTED_WORDS, anagramFamilies, lineWords } from "./families";
import { DAILY_DIFFICULTY, dailyPuzzle, practicePuzzle, practiceSeed } from "./generator";
import { layoutById } from "./layouts";
import type { WordConstraint } from "./solver";
import { buildUnits, countSolutions, logicSolve } from "./solver";
import type { SixfoldPuzzle } from "./types";
import { CELLS, N } from "./types";

const dict = parseDictionary(
  readFileSync(new URL("../../../lib/words/dictionary.txt", import.meta.url), "utf8"),
);
const required = new Set(dict.required.buckets.get(N));

function hiddenCells(p: SixfoldPuzzle): number[] {
  return Array.from({ length: N }, (_, i) => (p.col < 0 ? i * N + i : i * N + p.col));
}
function rowCells(p: SixfoldPuzzle): number[] {
  return Array.from({ length: N }, (_, c) => p.row * N + c);
}
function spell(p: SixfoldPuzzle, cells: number[]): string {
  return cells.map((c) => p.solution[c]).join("");
}
function idx(p: SixfoldPuzzle, words: readonly string[]): number[][] {
  return words.map((w) => [...w].map((ch) => p.letters.indexOf(ch)));
}
function givenGrid(p: SixfoldPuzzle): Int8Array {
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

  it("stalls early every day: sudoku fills well under two thirds first", () => {
    const share: number[] = [];
    for (const d of DAYS) {
      const a = dailyPuzzle(dict, d);
      expect(a.difficulty).toBe(DAILY_DIFFICULTY);
      share.push(a.preStall / a.empties);
    }
    const mean = share.reduce((x, y) => x + y, 0) / share.length;
    expect(mean).toBeLessThan(0.6);
    // ...but it IS a stall, not a word-first board: sudoku does real work.
    expect(mean).toBeGreaterThan(0.25);
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

    it("spells two different answer-pool words from the family", () => {
      expect(spell(p, rowCells(p))).toBe(p.cluedWord);
      expect(spell(p, hiddenCells(p))).toBe(p.hiddenWord);
      expect(p.cluedWord).not.toBe(p.hiddenWord);
      for (const w of [p.cluedWord, p.hiddenWord]) {
        expect(required.has(w) || PROMOTED_WORDS.includes(w), w).toBe(true);
        expect(p.family).toContain(w);
      }
    });

    it("needs the words: sudoku rules alone leave several grids", () => {
      expect(countSolutions(givenGrid(p), units, [], 2)).toBe(2);
    });

    it("is unique even with NEITHER word known — any anagram in either line", () => {
      // Strict: the other family word in the clued row must hit a repeat,
      // never fill a full, repeat-free grid.
      const all = idx(p, lineWords(dict, p.letters));
      const lines: WordConstraint[] = [
        { cells: hiddenCells(p), words: all },
        { cells: rowCells(p), words: all },
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

describe("practicePuzzle", () => {
  const seeds = Array.from({ length: 12 }, (_, i) => practiceSeed(`t${i}`));
  const boards = seeds.map((s) => practicePuzzle(dict, s).puzzle);

  it("is deterministic per seed", () => {
    expect(practicePuzzle(dict, seeds[0]).puzzle).toEqual(boards[0]);
  });

  it("deals a spread of families and clue kinds", () => {
    expect(new Set(boards.map((p) => p.letters)).size).toBeGreaterThan(8);
    expect(boards.some((p) => p.clueCryptic)).toBe(true);
    expect(boards.some((p) => !p.clueCryptic)).toBe(true);
  });

  it("holds to the daily's guarantees", () => {
    for (const p of boards) {
      const units = buildUnits(layoutById(p.layoutId)!.regions);
      const all = idx(p, lineWords(dict, p.letters));
      const strict: WordConstraint[] = [
        { cells: hiddenCells(p), words: all },
        { cells: rowCells(p), words: all },
      ];
      expect(countSolutions(givenGrid(p), units, strict, 2)).toBe(1);
      const player: WordConstraint[] = [
        { cells: hiddenCells(p), words: idx(p, p.family) },
        { cells: rowCells(p), words: idx(p, [p.cluedWord]) },
      ];
      expect(logicSolve(givenGrid(p), units, player).solved).toBe(true);
    }
  });
});
