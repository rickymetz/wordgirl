import { describe, expect, it } from "vitest";
import { dailyBoard } from "../engine/schedule";
import { findSets, isSet, tripleKey } from "../engine/sets";
import { TUTORIAL_BOARD } from "../engine/tutorial";
import { gameReducer, initialState, type Action, type GameState } from "./reducer";

const board = dailyBoard("2026-10-12", "charset");
const run = (actions: Action[], s: GameState = initialState(board)) => actions.reduce(gameReducer, s);
const tapAll = (idx: readonly number[]): Action[] => idx.map((index) => ({ type: "tap", index }));

/** Three cards that are NOT a set. */
function nonSet(): number[] {
  const c = board.cards;
  for (let i = 0; i < c.length; i++)
    for (let j = i + 1; j < c.length; j++)
      for (let k = j + 1; k < c.length; k++) if (!isSet(c[i], c[j], c[k])) return [i, j, k];
  throw new Error("unreachable");
}

describe("selecting", () => {
  it("toggles a card on and off", () => {
    const s = run(tapAll([4, 4]));
    expect(s.selected).toEqual([]);
    expect(run(tapAll([4, 7])).selected).toEqual([4, 7]);
  });

  it("finds a set on the third tap, in any tap order", () => {
    const [a, b, c] = board.sets[0];
    const s = run(tapAll([c, a, b]));
    expect(s.found).toEqual([tripleKey([a, b, c])]);
    expect(s.selected).toEqual([]);
    expect(s.verdict?.kind).toBe("found");
  });

  it("counts a miss and clears, with no other penalty", () => {
    const s = run(tapAll(nonSet()));
    expect(s.misses).toBe(1);
    expect(s.found).toEqual([]);
    expect(s.selected).toEqual([]);
    expect(s.verdict?.kind).toBe("miss");
  });

  it("does not count a set twice", () => {
    const s = run([...tapAll(board.sets[0]), ...tapAll(board.sets[0])]);
    expect(s.found).toHaveLength(1);
    expect(s.misses).toBe(0);
    expect(s.verdict?.kind).toBe("already");
  });

  it("gives each verdict a fresh id so the same toast can repeat", () => {
    const miss = nonSet();
    const s1 = run(tapAll(miss));
    const s2 = run(tapAll(miss), s1);
    expect(s2.verdict!.id).toBeGreaterThan(s1.verdict!.id);
  });

  it("is solved when every set is found, and then ignores taps", () => {
    const s = run(board.sets.flatMap(tapAll));
    expect(s.solved).toBe(true);
    expect(run(tapAll([0]), s).selected).toEqual([]);
  });
});

describe("hints", () => {
  it("counts each hint and keeps describing the same set", () => {
    const s = run([{ type: "hint" }, { type: "hint" }]);
    expect(s.hints).toBe(2);
    expect(s.hintState.facts).toHaveLength(2);
    expect(s.verdict?.kind).toBe("hint");
  });

  it("says so, without counting, when the target is fully described", () => {
    const s = run(Array.from({ length: 5 }, () => ({ type: "hint" }) as Action));
    expect(s.hints).toBe(4);
    expect(s.verdict?.kind).toBe("no-hint");
  });
});

describe("hydrate", () => {
  it("restores progress and drops keys that are not sets on this board", () => {
    const real = board.sets.map(tripleKey);
    const s = run([{ type: "hydrate", found: [real[0], "0,1,99", real[0]], misses: 3, hints: 1 }]);
    expect(s.found).toEqual([real[0]]);
    expect(s.misses).toBe(3);
    expect(s.hints).toBe(1);
  });

  it("restores a fully found board as solved", () => {
    const s = run([{ type: "hydrate", found: board.sets.map(tripleKey), misses: 0, hints: 0 }]);
    expect(s.solved).toBe(true);
  });
});

describe("tutorial board", () => {
  it("plays through its three sets", () => {
    const s = run(findSets(TUTORIAL_BOARD.cards).flatMap(tapAll), initialState(TUTORIAL_BOARD));
    expect(s.solved).toBe(true);
  });
});
