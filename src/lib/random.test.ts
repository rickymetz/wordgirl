import { describe, expect, it } from "vitest";
import { seededRandom, shuffle } from "./random";

describe("seededRandom", () => {
  it("is deterministic for the same seed", () => {
    const a = seededRandom("polygram:2026-07-06");
    const b = seededRandom("polygram:2026-07-06");
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("differs across seeds", () => {
    const a = seededRandom("daily:2026-07-06");
    const b = seededRandom("daily:2026-07-07");
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it("stays in [0, 1)", () => {
    const rand = seededRandom("range-check");
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("shuffle", () => {
  it("is deterministic and preserves elements", () => {
    const items = () => ["a", "b", "c", "d", "e", "f"];
    const s1 = shuffle(items(), seededRandom("s"));
    const s2 = shuffle(items(), seededRandom("s"));
    expect(s1).toEqual(s2);
    expect([...s1].sort()).toEqual(items());
  });
});
