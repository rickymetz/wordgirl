import { describe, expect, it } from "vitest";
import { seededRandom } from "../../../lib/random";
import { DAILY_DEAL, DECK, deal, findSets, isSet, thirdCard, tripleKey, type Card } from "./sets";

describe("set rules", () => {
  it("has 81 distinct cards", () => {
    expect(new Set(DECK.map((c) => c.join(""))).size).toBe(81);
  });

  it("accepts all-same and all-different per attribute, rejects mixes", () => {
    expect(isSet([0, 0, 0, 0], [0, 0, 0, 1], [0, 0, 0, 2])).toBe(true);
    expect(isSet([0, 1, 2, 0], [1, 2, 0, 0], [2, 0, 1, 0])).toBe(true);
    expect(isSet([0, 0, 0, 0], [0, 0, 0, 1], [0, 0, 0, 1])).toBe(false);
    expect(isSet([0, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0])).toBe(false);
  });

  it("completes every pair with exactly one third card", () => {
    for (const a of DECK.slice(0, 20))
      for (const b of DECK.slice(40, 60)) {
        const c = thirdCard(a, b);
        expect(isSet(a, b, c)).toBe(true);
        expect(DECK.filter((d) => isSet(a, b, d))).toHaveLength(1);
      }
  });

  it("finds sets as ascending triples", () => {
    const cards: Card[] = [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [2, 2, 2, 2],
      [0, 1, 2, 0],
    ];
    expect(findSets(cards)).toEqual([[0, 1, 2]]);
    expect(tripleKey([9, 2, 5])).toBe("2,5,9");
  });
});

describe("deal", () => {
  it("lands every daily deal in 4–8 sets with 12 distinct cards", () => {
    for (let i = 0; i < 200; i++) {
      const { cards, sets } = deal(seededRandom(`test:${i}`));
      expect(cards).toHaveLength(DAILY_DEAL.size);
      expect(new Set(cards.map((c) => c.join(""))).size).toBe(12);
      expect(sets.length).toBeGreaterThanOrEqual(4);
      expect(sets.length).toBeLessThanOrEqual(8);
      expect(sets).toEqual(findSets(cards));
    }
  });

  it("is deterministic for a seed", () => {
    expect(deal(seededRandom("same"))).toEqual(deal(seededRandom("same")));
  });

  it("throws rather than loop forever on impossible bounds", () => {
    expect(() => deal(seededRandom("x"), { size: 3, minSets: 2, maxSets: 2 })).toThrow();
  });
});
