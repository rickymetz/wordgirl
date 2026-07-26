import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { enumerateWords, parseDictionary } from "../../../lib/words/dictionary";
import { maxScore } from "./scoring";
import {
  TUTORIAL_LETTERS,
  TUTORIAL_PUZZLE,
  TUTORIAL_STEP_COUNT,
  tutorialStepIndex,
} from "./tutorial";

const dict = parseDictionary(
  readFileSync(
    new URL("../../../lib/words/dictionary.txt", import.meta.url),
    "utf8",
  ),
);

describe("the tutorial puzzle", () => {
  it("keeps the triangle and square in the shape the reducer expects", () => {
    expect(TUTORIAL_PUZZLE.levels.map((l) => l.size)).toEqual([3, 4]);
    expect(TUTORIAL_PUZZLE.maxLevel).toBe(4);
    // letters[0..2] ring the triangle; letters[3] debuts at the square.
    expect(TUTORIAL_PUZZLE.letters).toHaveLength(4);
    expect(TUTORIAL_PUZZLE.maxScore).toBe(maxScore(TUTORIAL_PUZZLE.levels));
  });

  it("lists EXACTLY the words its letters can spell, per level", () => {
    // The reducer validates against these lists alone. A word the player
    // can legitimately spell but that is missing here comes back "not a
    // word" — so the lists must be the full enumeration, not a selection.
    const triangle = TUTORIAL_LETTERS.slice(0, 3);
    expect(TUTORIAL_PUZZLE.levels[0].words).toEqual(
      enumerateWords(dict, triangle, 3).sort(),
    );
    expect(TUTORIAL_PUZZLE.levels[1].words).toEqual(
      enumerateWords(dict, TUTORIAL_LETTERS, 4).sort(),
    );
  });

  it("has no bonus words to explain", () => {
    for (const level of TUTORIAL_PUZZLE.levels) {
      expect(level.bonusWords).toEqual([]);
      // ...and the dictionary agrees there are none to offer.
      expect(
        enumerateWords(
          dict,
          TUTORIAL_LETTERS.slice(0, level.size === 3 ? 3 : 4),
          level.size,
          "bonus",
        ),
      ).toEqual([]);
    }
  });

  it("teaches letter reuse at both levels", () => {
    for (const level of TUTORIAL_PUZZLE.levels) {
      const repeats = level.words.filter(
        (w) => new Set(w).size < w.length,
      );
      expect(repeats.length).toBeGreaterThan(0);
    }
  });

  it("gives the debuting letter something to do", () => {
    const debut = TUTORIAL_LETTERS[3];
    expect(
      TUTORIAL_PUZZLE.levels[1].words.some((w) => w.includes(debut)),
    ).toBe(true);
  });

  it("stays short enough to be a tutorial", () => {
    const total = TUTORIAL_PUZZLE.levels.reduce(
      (n, l) => n + l.words.length,
      0,
    );
    expect(total).toBeLessThanOrEqual(6);
  });
});

describe("tutorialStepIndex", () => {
  const at = (s: Partial<Parameters<typeof tutorialStepIndex>[0]>) =>
    tutorialStepIndex({
      current: "",
      found: [],
      levelIndex: 0,
      phase: "playing",
      ...s,
    });

  it("starts on step one", () => {
    expect(at({})).toBe(0);
  });

  it("advances as the player builds, submits, clears and levels up", () => {
    expect(at({ current: "ro" })).toBe(1);
    expect(at({ found: ["row"] })).toBe(2);
    expect(at({ found: ["row", "woo", "wow"], phase: "levelClear" })).toBe(3);
    expect(at({ levelIndex: 1 })).toBe(3);
  });

  it("reports the script finished only when the puzzle is done", () => {
    expect(at({ phase: "done", levelIndex: 1 })).toBe(TUTORIAL_STEP_COUNT);
  });
});
