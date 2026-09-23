import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import { CLUES } from "./clues";
import { anagramFamilies, lineWords } from "./families";
import { cluedCells, hiddenCells } from "./hints";
import type { WordConstraint } from "./solver";
import { buildUnits, countSolutions, logicSolve } from "./solver";
import {
  TUTORIAL_PUZZLE as P,
  TUTORIAL_STALL_CELLS,
  TUTORIAL_STEP_COUNT,
  TUTORIAL_SUDOKU_CELLS,
  tutorialStepIndex,
} from "./tutorial";
import { CELLS, N } from "./types";

const dict = parseDictionary(
  readFileSync(new URL("../../../lib/words/dictionary.txt", import.meta.url), "utf8"),
);
const units = buildUnits(P.regions);
const idx = (w: string) => [...w].map((ch) => P.letters.indexOf(ch));

function givenGrid(): Int8Array {
  const g = new Int8Array(CELLS).fill(-1);
  for (const c of P.givens) g[c] = P.letters.indexOf(P.solution[c]);
  return g;
}
const entriesWith = (cells: readonly number[]) =>
  [...Array(CELLS).keys()]
    .map((c) => (P.givens.includes(c) || cells.includes(c) ? P.solution[c] : "."))
    .join("");

describe("tutorial puzzle", () => {
  it("is a real family of common words, clued from the clue list", () => {
    const fam = anagramFamilies(dict).find((f) => f.letters === P.letters);
    expect(fam?.words).toEqual(P.family);
    expect(CLUES[P.cluedWord]).toContain(P.clue);
  });

  it("spells both words where the script says", () => {
    expect(cluedCells(P).map((c) => P.solution[c]).join("")).toBe(P.cluedWord);
    expect(hiddenCells(P).map((c) => P.solution[c]).join("")).toBe(P.hiddenWord);
  });

  it("is a valid sudoku solution", () => {
    for (const cells of units.unitCells) {
      expect(new Set(cells.map((c) => P.solution[c])).size).toBe(N);
    }
  });

  it("step 1: each sudoku gap is its row's only missing letter", () => {
    for (const c of TUTORIAL_SUDOKU_CELLS) {
      const row = Math.floor(c / N);
      const gaps = [...Array(N).keys()].filter((i) => !P.givens.includes(row * N + i));
      expect(gaps, `row ${row + 1}`).toEqual([c % N]);
    }
  });

  it("step 2: sudoku fills exactly the gaps, then stalls on the rectangle", () => {
    const trace: number[] = [];
    const r = logicSolve(givenGrid(), units, [], trace);
    expect(r.solved).toBe(false);
    expect([...trace].sort((a, b) => a - b)).toEqual([...TUTORIAL_SUDOKU_CELLS].sort((a, b) => a - b));
    expect(countSolutions(givenGrid(), units, [], 3)).toBe(2);
    expect(TUTORIAL_STALL_CELLS.every((c) => !P.givens.includes(c))).toBe(true);
  });

  it("the clue breaks the stall, and the grid is unique against every anagram", () => {
    const player: WordConstraint[] = [
      { cells: cluedCells(P), words: [idx(P.cluedWord)] },
      { cells: hiddenCells(P), words: P.family.map(idx) },
    ];
    expect(logicSolve(givenGrid(), units, player).solved).toBe(true);
    const all = lineWords(dict, P.letters).map(idx);
    const strict: WordConstraint[] = [
      { cells: cluedCells(P), words: all },
      { cells: hiddenCells(P), words: all },
    ];
    expect(countSolutions(givenGrid(), units, strict, 2)).toBe(1);
  });
});

describe("tutorialStepIndex", () => {
  it("walks forward as the board fills", () => {
    expect(tutorialStepIndex({ entries: entriesWith([]), solved: false })).toBe(0);
    expect(tutorialStepIndex({ entries: entriesWith(TUTORIAL_SUDOKU_CELLS), solved: false })).toBe(1);
    const broken = [...TUTORIAL_SUDOKU_CELLS, 21, 22];
    expect(tutorialStepIndex({ entries: entriesWith(broken), solved: false })).toBe(2);
    expect(tutorialStepIndex({ entries: entriesWith(broken), solved: true })).toBe(TUTORIAL_STEP_COUNT);
  });

  it("the clue's row in skips ahead, sudoku gaps or not", () => {
    expect(tutorialStepIndex({ entries: entriesWith([21, 22]), solved: false })).toBe(2);
  });
});
