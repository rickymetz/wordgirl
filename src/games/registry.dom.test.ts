import { beforeEach, describe, expect, it } from "vitest";
import { games } from "./registry";
import { DICT_VERSION } from "../lib/words/dictionary";

/**
 * The three per-game daily loaders must never disagree: `solvedToday`
 * (the outro's "still open" list), `roundupEntry` (the roundup gate), and
 * `solvedOn` (the streak walk) all answer "did you finish this game" for a
 * date. The review found crosshatch's three had drifted apart; this locks
 * every game's three together — fully solved → all say yes, one board
 * short → all say no — so a future edit to one can't silently split them.
 */

// A date on/after crosshatch's HARD_EPOCH so its day carries BOTH boards.
const DAY = "2026-08-25";
const V = DICT_VERSION;
const k = (id: string, sub: string) => `wg:v1:local:${id}:daily:${sub}`;
const put = (id: string, sub: string, v: unknown) =>
  localStorage.setItem(k(id, sub), JSON.stringify(v));

/** Seed each game's boards for DAY. `solved` seeds a fully-finished day;
 *  otherwise one board is left unsolved so the DAY is incomplete. */
function seed(id: string, solved: boolean) {
  switch (id) {
    case "polygram":
      put(id, DAY, {
        dateKey: DAY, dictVersion: V, solved, completed: solved,
        elapsedMs: 201000, foundWords: ["ARC", "CAR"], revealed: { ARC: [0] },
      });
      break;
    case "pierglass":
      put(id, DAY, {
        dateKey: DAY, dictVersion: V, solved,
        elapsedMs: 130000, rows: ["ANNA", "OTTO"], parRows: 6, hints: 1,
      });
      break;
    case "crosshatch":
      put(id, DAY, {
        dateKey: DAY, dictVersion: V, level: "normal", solved,
        elapsedMs: 240000, foundWords: ["SO", "ON"], grid: {}, revealed: {}, totalWords: 6,
      });
      // Second board always solved — the toggled first board decides the day.
      put(id, `hard:${DAY}`, {
        dateKey: DAY, dictVersion: V, level: "hard", solved: true,
        elapsedMs: 300000, foundWords: ["TEA", "EAT"], grid: {}, revealed: {}, totalWords: 7,
      });
      break;
    case "doublet":
      for (const [d, ms, n] of [["easy", 120000, 3], ["medium", 180000, 4], ["hard", 260000, 5]] as const) {
        put(id, `${d}:${DAY}`, {
          dateKey: DAY, dictVersion: V, difficulty: d,
          // Only the easy board follows `solved`; the rest are done.
          solved: d === "easy" ? solved : true,
          elapsedMs: ms, placed: Array.from({ length: n }, (_, i) => ({ id: i })),
          foundWords: [], hints: 0,
        });
      }
      break;
    case "serpentine":
      for (const [d, ms, len] of [["haiku", 150000, 17], ["poem", 320000, 34]] as const) {
        put(id, `${d}:${DAY}`, {
          dateKey: DAY, dictVersion: V, difficulty: d, puzzleId: `${d}1`,
          solved: d === "haiku" ? solved : true,
          elapsedMs: ms, cells: Array.from({ length: len }, (_, i) => ({ i })), hints: 0,
        });
      }
      break;
    default:
      throw new Error(`registry test has no seed for "${id}" — add one`);
  }
}

beforeEach(() => localStorage.clear());

describe("per-game daily loaders agree", () => {
  for (const game of games) {
    it(`${game.id}: solvedToday, roundupEntry and solvedOn all say YES when fully solved`, async () => {
      seed(game.id, true);
      const [today, entry, on] = await Promise.all([
        game.solvedToday!(DAY),
        game.roundupEntry!(DAY),
        game.solvedOn!(DAY),
      ]);
      expect(today).toBe(true);
      expect(on).toBe(true);
      expect(entry).not.toBeNull();
      // The entry is a well-formed roundup row.
      expect(entry).toMatchObject({
        name: expect.any(String),
        emoji: expect.any(String),
        elapsedMs: expect.any(Number),
        hints: expect.any(Number),
      });
      const expectedLevels: Record<string, string[]> = {
        crosshatch: ["Normal", "Hard"],
        doublet: ["Easy", "Medium", "Hard"],
        serpentine: ["Haiku", "Poem"],
      };
      if (game.id in expectedLevels) {
        // Multi-level games break out per level (unit + a level each).
        expect(entry!.unit).toEqual(expect.any(String));
        expect(entry!.levels?.map((l) => l.label)).toEqual(expectedLevels[game.id]);
        for (const lv of entry!.levels ?? []) {
          expect(lv.value).toEqual(expect.any(Number));
          expect(lv.hints).toEqual(expect.any(Number));
        }
      } else {
        // Single-board games give a bare count plus the unit, no levels.
        expect(entry!.unit).toEqual(expect.any(String));
        expect(entry!.value).toEqual(expect.any(Number));
        expect(entry!.levels).toBeUndefined();
      }
    });

    it(`${game.id}: all three say NO when one board is short`, async () => {
      seed(game.id, false);
      const [today, entry, on] = await Promise.all([
        game.solvedToday!(DAY),
        game.roundupEntry!(DAY),
        game.solvedOn!(DAY),
      ]);
      expect(today).toBe(false);
      expect(on).toBe(false);
      expect(entry).toBeNull();
    });
  }
});
