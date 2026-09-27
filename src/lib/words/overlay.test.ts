import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "./dictionary";
import {
  ADDED_WORDS,
  DICT_OVERLAY_EPOCH,
  PROMOTED_WORDS,
  dictionaryOn,
} from "./overlay";

const raw = readFileSync(new URL("./dictionary.txt", import.meta.url), "utf8");
const dict = parseDictionary(raw);
const words = (tier: ReturnType<typeof parseDictionary>["required"]) =>
  new Set([...tier.buckets.values()].flat());

describe("dictionaryOn", () => {
  it("leaves every date before the epoch on the untouched dictionary", () => {
    expect(dictionaryOn(dict, "2026-09-27")).toBe(dict);
    expect(dictionaryOn(dict, "2026-07-06")).toBe(dict);
  });

  it("applies from the epoch on, and to undated (practice) play", () => {
    const on = dictionaryOn(dict, DICT_OVERLAY_EPOCH);
    expect(on).not.toBe(dict);
    expect(dictionaryOn(dict, null)).toBe(on);
    expect(dictionaryOn(dict, "2027-01-01")).toBe(on);
  });

  it("promotes into required and out of bonus; adds to bonus only", () => {
    const on = dictionaryOn(dict, null);
    const req = words(on.required);
    const bonus = words(on.bonus);
    for (const w of ["hazy", "pear", "tacos", "cloudy"]) {
      expect(req.has(w), w).toBe(true);
      expect(bonus.has(w), w).toBe(false);
    }
    for (const w of ["email", "online", "selfie"]) {
      expect(dict.has(w), w).toBe(false);
      expect(on.has(w), w).toBe(true);
      expect(bonus.has(w), w).toBe(true);
      expect(req.has(w), w).toBe(false);
    }
    // Nothing lost, nothing duplicated.
    const all = [...on.all.buckets.values()].flat();
    expect(new Set(all).size).toBe(all.length);
    expect(all.length).toBe(words(dict.all).size + ADDED_WORDS.length);
    // Masks stay aligned with their buckets.
    for (const [len, bucket] of on.all.buckets) {
      expect(on.all.masks.get(len)).toHaveLength(bucket.length);
    }
  });

  it("every correction is a real change against the shipped file", () => {
    // A promoted word must be bonus-tier today, an added one absent —
    // otherwise the list has drifted from dictionary.txt.
    const bonus = words(dict.bonus);
    expect(PROMOTED_WORDS.filter((w) => !bonus.has(w))).toEqual([]);
    expect(ADDED_WORDS.filter((w) => dict.has(w))).toEqual([]);
    expect(ADDED_WORDS.filter((w) => w.length < 2 || w.length > 10)).toEqual([]);
  });
});
