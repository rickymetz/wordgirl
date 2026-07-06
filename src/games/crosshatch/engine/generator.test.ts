import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import {
  MAX_COMBOS,
  MIN_COMBOS,
  dailySeed,
  enumerateCombos,
  generateCrosshatch,
} from "./generator";
import type { Shape } from "./types";
import { cellKey, comboKey, slotCells } from "./types";

const dict = parseDictionary(
  readFileSync(new URL("../../../lib/words/dictionary.txt", import.meta.url), "utf8"),
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

  it("sweep over 200 consecutive dates: all constraints hold", () => {
    const start = Date.now();
    for (let i = 0; i < 200; i++) {
      const date = new Date(2026, 0, 1 + i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const puzzle = generateCrosshatch(dict, dailySeed(key));
      const { shape, givens, combos } = puzzle;

      // Combo count in band; combos unique.
      expect(combos.length).toBeGreaterThanOrEqual(MIN_COMBOS);
      expect(combos.length).toBeLessThanOrEqual(MAX_COMBOS);
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

      // At most one slot admits a single word across all combos.
      const fixed = shape.slots.filter(
        (_, s) => new Set(combos.map((c) => c[s])).size < 2,
      );
      expect(fixed.length).toBeLessThanOrEqual(1);

      for (const combo of combos) {
        expect(combo).toHaveLength(shape.slots.length);
        // No repeated word within a combo.
        expect(new Set(combo).size).toBe(combo.length);
        // Lay the combo on the grid: intersections and givens agree,
        // and every word is a required-tier word of exact slot length.
        const grid = new Map<string, string>(Object.entries(givens));
        shape.slots.forEach((slot, s) => {
          const word = combo[s];
          expect(word).toHaveLength(slot.len);
          expect(
            dict.required.buckets.get(slot.len)?.includes(word),
            `${key}: "${word}" not a required word`,
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
  }, 60_000);
});
