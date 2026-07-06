import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { letterMask, parseDictionary } from "./dictionary";
import {
  LEVEL_CAPS,
  MAX_TOTAL_WORDS,
  MIN_MAX_LEVEL,
  dailySeed,
  generatePuzzle,
} from "./generator";

const dict = parseDictionary(
  readFileSync(
    new URL("../assets/dictionary.txt", import.meta.url),
    "utf8",
  ),
);

describe("generatePuzzle", () => {
  it("is deterministic: same seed, same puzzle", () => {
    const a = generatePuzzle(dict, dailySeed("2026-07-06"));
    const b = generatePuzzle(dict, dailySeed("2026-07-06"));
    expect(a).toEqual(b);
  });

  it("differs across seeds", () => {
    const a = generatePuzzle(dict, dailySeed("2026-07-06"));
    const b = generatePuzzle(dict, dailySeed("2026-07-07"));
    expect(a.letters).not.toEqual(b.letters);
  });

  it("sweep over 400 consecutive dates: all constraints hold", () => {
    const start = Date.now();
    for (let i = 0; i < 400; i++) {
      const date = new Date(2026, 0, 1 + i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const puzzle = generatePuzzle(dict, dailySeed(key));

      // Letters distinct, lowercase a-z.
      expect(new Set(puzzle.letters).size).toBe(puzzle.letters.length);
      for (const c of puzzle.letters) expect(c).toMatch(/^[a-z]$/);

      // Level structure: sizes 3..maxLevel contiguous, counts within caps.
      expect(puzzle.maxLevel).toBeGreaterThanOrEqual(MIN_MAX_LEVEL);
      expect(puzzle.levels[0].size).toBe(3);
      let total = 0;
      for (const [idx, level] of puzzle.levels.entries()) {
        expect(level.size).toBe(3 + idx);
        expect(level.words.length).toBeGreaterThanOrEqual(1);
        expect(level.words.length).toBeLessThanOrEqual(
          LEVEL_CAPS[level.size],
        );
        total += level.words.length;

        // Every word: exact length, spellable from the first `size` letters.
        const setMask = letterMask(puzzle.letters.slice(0, level.size).join(""));
        for (const word of level.words) {
          expect(word).toHaveLength(level.size);
          expect(letterMask(word) & ~setMask).toBe(0);
        }

        // A letter must be used at least once on the level introducing
        // it: all three seeds at the triangle, the new letter after.
        const introduced =
          level.size === 3
            ? puzzle.letters.slice(0, 3)
            : [puzzle.letters[level.size - 1]];
        for (const letter of introduced) {
          expect(
            level.words.some((w) => w.includes(letter)),
            `letter "${letter}" unused on level ${level.size}`,
          ).toBe(true);
        }
      }
      expect(total).toBeLessThanOrEqual(MAX_TOTAL_WORDS);
      expect(puzzle.maxScore).toBeGreaterThan(0);
    }
    // Whole sweep should be fast — generation must feel instant on device.
    expect(Date.now() - start).toBeLessThan(15_000);
  }, 30_000);
});
