import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import { CLUES } from "./clues";
import { anagramFamilies, lineWords } from "./families";
import type { WordConstraint } from "./solver";
import { buildUnits, countSolutions, logicSolve } from "./solver";
import {
  TUTORIAL_FIRST_CELL,
  TUTORIAL_PUZZLE as P,
  TUTORIAL_STEP_COUNT,
  tutorialStepIndex,
} from "./tutorial";
import { CELLS, N } from "./types";

const dict = parseDictionary(
  readFileSync(new URL("../../../lib/words/dictionary.txt", import.meta.url), "utf8"),
);
const units = buildUnits(P.regions);
const idx = (w: string) => [...w].map((ch) => P.letters.indexOf(ch));
const rowCells = Array.from({ length: N }, (_, c) => P.row * N + c);
const colCells = Array.from({ length: N }, (_, r) => r * N + P.col);

function givenGrid(): Int8Array {
  const g = new Int8Array(CELLS).fill(-1);
  for (const c of P.givens) g[c] = P.letters.indexOf(P.solution[c]);
  return g;
}

describe("tutorial puzzle", () => {
  it("is a real family of common words, with a clue", () => {
    const fam = anagramFamilies(dict).find((f) => f.letters === P.letters);
    expect(fam?.words).toEqual(P.family);
    expect(CLUES[P.cluedWord]).toBeTruthy();
  });

  it("spells both words where the script says", () => {
    expect(rowCells.map((c) => P.solution[c]).join("")).toBe(P.cluedWord);
    expect(colCells.map((c) => P.solution[c]).join("")).toBe(P.hiddenWord);
  });

  it("is a valid sudoku solution", () => {
    for (const cells of units.unitCells) {
      expect(new Set(cells.map((c) => P.solution[c])).size).toBe(N);
    }
  });

  it("step 1 is a plain sudoku move: the first gap is forced", () => {
    const g = givenGrid();
    const rowUsed = new Set(
      Array.from({ length: N }, (_, c) => g[c]).filter((v) => v >= 0),
    );
    expect(g[TUTORIAL_FIRST_CELL]).toBe(-1);
    expect(rowUsed.size).toBe(N - 1);
  });

  it("needs the words: sudoku alone leaves two grids", () => {
    expect(countSolutions(givenGrid(), units, [], 3)).toBe(2);
  });

  it("the clue settles it, against every dictionary anagram", () => {
    const lines: WordConstraint[] = [
      { cells: rowCells, words: [idx(P.cluedWord)] },
      { cells: colCells, words: lineWords(dict, P.letters).map(idx) },
    ];
    expect(countSolutions(givenGrid(), units, lines, 2)).toBe(1);
    expect(logicSolve(givenGrid(), units, lines).solved).toBe(true);
  });
});

describe("tutorialStepIndex", () => {
  const given = (() => {
    const out = Array<string>(CELLS).fill(".");
    for (const c of P.givens) out[c] = P.solution[c];
    return out.join("");
  })();
  const put = (entries: string, cells: number[]) =>
    [...entries].map((ch, i) => (cells.includes(i) ? P.solution[i] : ch)).join("");

  it("walks forward as the board fills", () => {
    expect(tutorialStepIndex({ entries: given, solved: false })).toBe(0);
    const s1 = put(given, [TUTORIAL_FIRST_CELL]);
    expect(tutorialStepIndex({ entries: s1, solved: false })).toBe(1);
    const s2 = put(s1, rowCells);
    expect(tutorialStepIndex({ entries: s2, solved: false })).toBe(2);
    expect(tutorialStepIndex({ entries: s2, solved: true })).toBe(TUTORIAL_STEP_COUNT);
  });

  it("skips to the down once the clued row is in, S or no S", () => {
    expect(tutorialStepIndex({ entries: put(given, rowCells), solved: false })).toBe(2);
  });
});
