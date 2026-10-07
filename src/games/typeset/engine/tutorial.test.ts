import { describe, expect, it } from "vitest";
import { isSet, tripleKey } from "./sets";
import { TUTORIAL_BOARD, TUTORIAL_NOT_A_SET, TUTORIAL_SETS, TUTORIAL_STEP_COUNT, TUTORIAL_TARGETS, tutorialStepIndex } from "./tutorial";

describe("tutorial board", () => {
  it("teaches three real sets", () => {
    for (const [a, b, c] of TUTORIAL_SETS) expect(isSet(a, b, c)).toBe(true);
  });

  it("has exactly the three teaching sets and no others", () => {
    expect(TUTORIAL_BOARD.cards).toHaveLength(9);
    expect(TUTORIAL_BOARD.sets.map(tripleKey).sort()).toEqual([...TUTORIAL_TARGETS].sort());
  });

  it("teaches one idea per set: one difference, all different, then a mix", () => {
    const differing = TUTORIAL_SETS.map(([a, b, c]) => [0, 1, 2, 3].filter((i) => !(a[i] === b[i] && b[i] === c[i])).length);
    expect(differing).toEqual([1, 4, 2]);
  });

  it("never sits a set in one row of the 3x3 grid", () => {
    for (const t of TUTORIAL_TARGETS) {
      const rows = new Set(t.split(",").map((i) => Math.floor(Number(i) / 3)));
      expect(rows.size).toBeGreaterThan(1);
    }
  });

  it("advances: first set, then the not-a-set pick (any miss), then the rest in any order", () => {
    const [a, b, c] = TUTORIAL_TARGETS;
    expect(tutorialStepIndex([])).toBe(0);
    expect(tutorialStepIndex([b])).toBe(0);
    expect(tutorialStepIndex([a])).toBe(1);
    expect(tutorialStepIndex([a], 1)).toBe(2);
    expect(tutorialStepIndex([a, c], 1)).toBe(2);
    expect(tutorialStepIndex([a, b], 1)).toBe(3);
    expect(tutorialStepIndex([a, b, c], 0)).toBe(1);
    expect(tutorialStepIndex([a, b, c], 2)).toBe(TUTORIAL_STEP_COUNT);
  });

  it("asks for a real near-miss on the board: two-and-one counts, so not a set", () => {
    const idx = TUTORIAL_NOT_A_SET.map((card) => TUTORIAL_BOARD.cards.findIndex((c) => c.join() === card.join()));
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect(isSet(TUTORIAL_NOT_A_SET[0], TUTORIAL_NOT_A_SET[1], TUTORIAL_NOT_A_SET[2])).toBe(false);
    const counts = TUTORIAL_NOT_A_SET.map((c) => c[1]).sort();
    expect(counts).toEqual([0, 2, 2]); // 1, 3, 3 copies
    // Both RRR cards and the only single R on the board.
    expect(TUTORIAL_BOARD.cards.filter((c) => c[0] === 2 && c[1] === 2)).toHaveLength(2);
    expect(TUTORIAL_BOARD.cards.filter((c) => c[0] === 2 && c[1] === 0)).toHaveLength(1);
  });
});
