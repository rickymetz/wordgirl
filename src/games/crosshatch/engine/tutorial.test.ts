import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import { uniqueWords } from "./scoring";
import { slotCells } from "./types";
import {
  TUTORIAL_GIVENS,
  TUTORIAL_SHAPE,
  TUTORIAL_STEP_COUNT,
  tutorialPuzzle,
  tutorialStepIndex,
} from "./tutorial";

const dict = parseDictionary(
  readFileSync(
    new URL("../../../lib/words/dictionary.txt", import.meta.url),
    "utf8",
  ),
);

const puzzle = tutorialPuzzle(dict);
const words = uniqueWords(puzzle.combos);

describe("the tutorial grid", () => {
  it("is two three-letter lines on a 3x3 board", () => {
    expect(TUTORIAL_SHAPE.slots).toHaveLength(2);
    expect(puzzle.rows).toBe(3);
    expect(puzzle.cols).toBe(3);
  });

  it("leaves exactly two cells to type", () => {
    const cells = new Set<string>();
    for (const slot of TUTORIAL_SHAPE.slots) {
      for (const c of slotCells(slot)) cells.add(`${c.row},${c.col}`);
    }
    const typeable = [...cells].filter((k) => !(k in TUTORIAL_GIVENS));
    expect(typeable).toHaveLength(2);
  });

  it("stays a handful of words, not a day's worth", () => {
    expect(words.length).toBeGreaterThanOrEqual(4);
    expect(words.length).toBeLessThanOrEqual(6);
  });

  it("keeps both lines variable, so rearranging is real", () => {
    for (let i = 0; i < TUTORIAL_SHAPE.slots.length; i++) {
      const variants = new Set(puzzle.combos.map((c) => c[i]));
      expect(variants.size).toBeGreaterThanOrEqual(2);
    }
  });

  it("CANNOT be swept in one submission", () => {
    // The whole lesson: a valid grid banks its own words only, so the day
    // is finished by submitting a second (and here a third) arrangement.
    for (const combo of puzzle.combos) {
      expect(new Set(combo).size).toBeLessThan(words.length);
    }
    expect(puzzle.combos.length).toBeGreaterThanOrEqual(3);
  });

  it("never locks a line completely", () => {
    for (const slot of TUTORIAL_SHAPE.slots) {
      const blanks = slotCells(slot).filter(
        (c) => !(`${c.row},${c.col}` in TUTORIAL_GIVENS),
      );
      expect(blanks.length).toBeGreaterThan(0);
    }
  });

  it("honours its own givens in every combo", () => {
    for (const combo of puzzle.combos) {
      TUTORIAL_SHAPE.slots.forEach((slot, i) => {
        slotCells(slot).forEach((c, j) => {
          const given = TUTORIAL_GIVENS[`${c.row},${c.col}`];
          if (given) expect(combo[i][j]).toBe(given);
        });
      });
    }
  });
});

describe("tutorialStepIndex", () => {
  const at = (s: Partial<Parameters<typeof tutorialStepIndex>[0]>) =>
    tutorialStepIndex({ grid: {}, found: [], solved: false, ...s });

  it("starts on step one", () => {
    expect(at({})).toBe(0);
  });

  it("waits for BOTH cells before offering to submit", () => {
    expect(at({ grid: { "0,1": "a" } })).toBe(0);
    expect(at({ grid: { "0,1": "a", "1,1": "l" } })).toBe(1);
  });

  it("moves to the rearrange lesson once a second grid lands", () => {
    expect(at({ found: ["all", "can"] })).toBe(2);
    expect(at({ found: ["all", "can", "con"] })).toBe(3);
  });

  it("reports the script finished only when solved", () => {
    expect(at({ solved: true })).toBe(TUTORIAL_STEP_COUNT);
  });
});
