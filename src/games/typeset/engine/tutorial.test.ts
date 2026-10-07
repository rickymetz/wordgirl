import { describe, expect, it } from "vitest";
import { isSet, tripleKey } from "./sets";
import { TUTORIAL_BOARD, TUTORIAL_SETS, TUTORIAL_STEP_COUNT, TUTORIAL_TARGETS, tutorialStepIndex } from "./tutorial";

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

  it("advances to the earliest unfound teaching set, in any order", () => {
    expect(tutorialStepIndex([])).toBe(0);
    expect(tutorialStepIndex([TUTORIAL_TARGETS[1]])).toBe(0);
    expect(tutorialStepIndex([TUTORIAL_TARGETS[0]])).toBe(1);
    expect(tutorialStepIndex([...TUTORIAL_TARGETS])).toBe(TUTORIAL_STEP_COUNT);
  });
});
