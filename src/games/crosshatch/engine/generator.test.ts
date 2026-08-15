import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { puzzleKey } from "../../../lib/puzzleKey";
import { parseDictionary } from "../../../lib/words/dictionary";
import {
  MAX_SLOT_WORDS,
  MAX_WORDS,
  MIN_WORDS,
  dailySeed,
  enumerateCombos,
  generateCrosshatch,
  parseLevel,
} from "./generator";
import type { Shape } from "./types";
import { cellKey, comboKey, LEVELS, slotCells } from "./types";

const rawDict = readFileSync(
  new URL("../../../lib/words/dictionary.txt", import.meta.url),
  "utf8",
);
const dict = parseDictionary(rawDict);

/** Bonus-tier words: "+"-prefixed lines in the shipped dictionary. */
const bonusWords = new Set(
  rawDict
    .split("\n")
    .filter((line) => line.startsWith("+"))
    .map((line) => line.trim().slice(1)),
);

describe("enumerateCombos", () => {
  // Tiny fixture: a plus of two 3-letter slots crossing at the middle.
  const cross: Shape = {
    id: "test-cross",
    slots: [
      { dir: "across", row: 1, col: 0, len: 3 },
      { dir: "down", row: 0, col: 1, len: 3 },
    ],
  };
  const fixture = parseDictionary(["bad", "bud", "dab", "dud", "add"].join("\n"));

  it("finds exactly the hand-checkable fillings", () => {
    // across[1] must equal down[1]. No givens: enumerate everything.
    const combos = enumerateCombos(cross, fixture, new Map());
    const keys = combos.map(comboKey).sort();
    // Valid pairs (across|down) where middle letters agree and words
    // differ: bad/dab? "bad"[1]=a,"dab"[1]=a ok. Enumerate by hand:
    // middles: bad=a,bud=u,dab=a,dud=u,add=d.
    // a-middle: across∈{bad,dab}, down∈{bad,dab}, distinct → 2 pairs.
    // u-middle: across∈{bud,dud}, down∈{bud,dud}, distinct → 2 pairs.
    // d-middle: only "add" — needs distinct words → 0 pairs.
    expect(keys).toEqual(["bad|dab", "bud|dud", "dab|bad", "dud|bud"]);
  });

  it("respects givens", () => {
    // Lock the across word's first letter to 'b'.
    const combos = enumerateCombos(
      cross,
      fixture,
      new Map([[cellKey(1, 0), "b"]]),
    );
    expect(combos.map(comboKey).sort()).toEqual(["bad|dab", "bud|dud"]);
  });
});

describe("generateCrosshatch", () => {
  it("is deterministic: same seed, same puzzle", () => {
    const a = generateCrosshatch(dict, dailySeed("2026-07-07"));
    const b = generateCrosshatch(dict, dailySeed("2026-07-07"));
    expect(a).toEqual(b);
  });

  it("differs across seeds", () => {
    const a = generateCrosshatch(dict, dailySeed("2026-07-07"));
    const b = generateCrosshatch(dict, dailySeed("2026-07-08"));
    expect(comboKey(a.combos[0]) === comboKey(b.combos[0]) && a.shape.id === b.shape.id).toBe(false);
  });

  it("derivation is pinned — changing it is a migration", () => {
    // Fingerprints mirror crosshatchPuzzleKey (givens + combos), the
    // identity saved progress is matched against.
    //
    // IF THIS FAILS, every date's puzzle changed and saved days no
    // longer describe the puzzle they were played on. That's allowed,
    // but it's a migration: bump DICT_VERSION and raise
    // GENERATOR_VERSION in state/persistence.ts (which marks older
    // saves retired) before updating these fingerprints.
    const pinned = [
      ["2026-07-06", "kkvr3k"],
      ["2026-12-25", "gvd3mp"],
      ["2027-06-01", "1o6lk8"],
    ];
    for (const [date, fingerprint] of pinned) {
      const p = generateCrosshatch(dict, dailySeed(date));
      expect(puzzleKey([p.givens, p.combos]), date).toBe(fingerprint);
    }
  });

  it("never requires a bonus-tier word", () => {
    // Every enumerated word gates the solve and can be hinted, so all
    // of them must come from the common tier — no ENABLE obscurities
    // (kagu, habu, vatu) among the day's mandatory finds.
    for (let i = 0; i < 120; i++) {
      const date = new Date(2026, 6, 6 + i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      for (const level of LEVELS) {
        const words = new Set(
          generateCrosshatch(dict, dailySeed(key, level)).combos.flat(),
        );
        const bonus = [...words].filter((w) => bonusWords.has(w));
        expect(bonus, `${key} ${level}: bonus-tier words required`).toEqual([]);
      }
    }
  }, 60_000);

  it.each(LEVELS)(
    "%s: sweep over 200 consecutive dates, all constraints hold",
    (level) => {
    const start = Date.now();
    for (let i = 0; i < 200; i++) {
      const date = new Date(2026, 0, 1 + i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const puzzle = generateCrosshatch(dict, dailySeed(key, level));
      const { shape, givens, combos } = puzzle;
      expect(puzzle.level).toBe(level);

      // Distinct-word count in band; combos unique.
      const wordCount = new Set(combos.flat()).size;
      expect(wordCount).toBeGreaterThanOrEqual(MIN_WORDS);
      expect(wordCount).toBeLessThanOrEqual(MAX_WORDS);
      expect(new Set(combos.map(comboKey)).size).toBe(combos.length);

      // Every slot is anchored by at least one given cell, but NEVER
      // fully given — a locked line would have no interactivity.
      for (const slot of shape.slots) {
        expect(
          slotCells(slot).some((c) => givens[cellKey(c.row, c.col)]),
          `${key}: unanchored slot`,
        ).toBe(true);
        expect(
          slotCells(slot).some((c) => !givens[cellKey(c.row, c.col)]),
          `${key}: fully locked slot`,
        ).toBe(true);
      }

      // At most one slot admits a single word across all combos, and
      // no slot hoards more than its share of the day's words.
      const variety = shape.slots.map(
        (_, s) => new Set(combos.map((c) => c[s])).size,
      );
      expect(variety.filter((v) => v < 2).length).toBeLessThanOrEqual(1);
      expect(Math.max(...variety)).toBeLessThanOrEqual(MAX_SLOT_WORDS);

      for (const combo of combos) {
        expect(combo).toHaveLength(shape.slots.length);
        // No repeated word within a combo.
        expect(new Set(combo).size).toBe(combo.length);
        // Lay the combo on the grid: intersections and givens agree,
        // and every word is a dictionary word of exact slot length.
        const grid = new Map<string, string>(Object.entries(givens));
        shape.slots.forEach((slot, s) => {
          const word = combo[s];
          expect(word).toHaveLength(slot.len);
          expect(
            dict.has(word),
            `${key}: "${word}" not in dictionary`,
          ).toBe(true);
          slotCells(slot).forEach((c, j) => {
            const k = cellKey(c.row, c.col);
            const existing = grid.get(k);
            if (existing !== undefined) {
              expect(existing, `${key}: conflict at ${k}`).toBe(word[j]);
            }
            grid.set(k, word[j]);
          });
        });
      }
    }
    // Generation happens on-device at load — the sweep must stay quick.
    expect(Date.now() - start).toBeLessThan(30_000);
    },
    60_000,
  );

  it("the two boards of a date are different puzzles", () => {
    for (const key of ["2026-08-15", "2026-09-01", "2026-12-25"]) {
      const std = generateCrosshatch(dict, dailySeed(key, "normal"));
      const hard = generateCrosshatch(dict, dailySeed(key, "hard"));
      expect(puzzleKey([std.givens, std.combos])).not.toBe(
        puzzleKey([hard.givens, hard.combos]),
      );
      // And the hard one is the harder one: five-letter lines showing
      // a smaller share of themselves than the normal board's.
      for (const slot of hard.shape.slots) expect(slot.len).toBe(5);
    }
  });

  it("a seed with no level is the normal board", () => {
    // Every save and every archived day was written against this seed
    // string; parsing it as anything else would rewrite history.
    expect(dailySeed("2026-08-20")).toBe("daily:2026-08-20");
    expect(parseLevel("daily:2026-08-20")).toBe("normal");
    expect(parseLevel("daily:hard:2026-08-20")).toBe("hard");
    expect(generateCrosshatch(dict, "daily:2026-08-20").level).toBe("normal");
  });
});
