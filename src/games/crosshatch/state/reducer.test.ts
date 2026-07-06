import { describe, expect, it } from "vitest";
import type { CrosshatchPuzzle } from "../engine/types";
import {
  gameReducer,
  hintTarget,
  initialState,
  letterAt,
  slotWord,
  type GameAction,
  type GameState,
} from "./reducer";

/**
 * Fixture: the test cross from the generator tests — across3 at (1,0),
 * down3 at (0,1) — with the across word's first letter given as 'b'.
 * Combos (across|down): bad|dab, bud|dud.
 */
const puzzle: CrosshatchPuzzle = {
  seed: "test",
  dictVersion: 2,
  shape: {
    id: "test-cross",
    slots: [
      { dir: "across", row: 1, col: 0, len: 3 },
      { dir: "down", row: 0, col: 1, len: 3 },
    ],
  },
  rows: 3,
  cols: 3,
  givens: { "1,0": "b" },
  combos: [
    ["bad", "dab"],
    ["bud", "dud"],
  ],
};

function play(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

function type(word: string): GameAction[] {
  return [...word].map((letter) => ({ type: "typeLetter", letter }));
}

describe("cursor and typing", () => {
  it("starts on the first editable cell of the first slot", () => {
    const s = initialState(puzzle);
    // (1,0) is a given, so the across slot's first editable cell is (1,1).
    expect(s.cursor).toEqual({ row: 1, col: 1, dir: "across" });
  });

  it("typing fills along the slot, skipping givens", () => {
    const s = play(initialState(puzzle), ...type("ad"));
    expect(letterAt(s, 1, 1)).toBe("a");
    expect(letterAt(s, 1, 2)).toBe("d");
    expect(slotWord(s, puzzle.shape.slots[0])).toEqual({
      word: "bad",
      complete: true,
    });
  });

  it("re-tapping the focused crossing cell flips direction", () => {
    // Move focus elsewhere first — the initial cursor already sits on
    // (1,1), and tapping the focused cell is what flips direction.
    let s = play(
      initialState(puzzle),
      { type: "focusCell", row: 1, col: 2 },
      { type: "focusCell", row: 1, col: 1 },
    );
    expect(s.cursor?.dir).toBe("across");
    s = gameReducer(s, { type: "focusCell", row: 1, col: 1 });
    expect(s.cursor?.dir).toBe("down");
    // A letter typed downward lands in the down slot's next cell.
    s = gameReducer(s, { type: "typeLetter", letter: "a" });
    expect(letterAt(s, 1, 1)).toBe("a");
    expect(s.cursor).toEqual({ row: 2, col: 1, dir: "down" });
  });

  it("backspace clears the cell, then walks backward over givens", () => {
    let s = play(initialState(puzzle), ...type("ad"));
    // Cursor sits at the last cell, which holds 'd'.
    s = gameReducer(s, { type: "backspace" });
    expect(letterAt(s, 1, 2)).toBeUndefined();
    s = gameReducer(s, { type: "backspace" });
    // Now empty: steps back to (1,1) and clears it; never touches the given.
    expect(letterAt(s, 1, 1)).toBeUndefined();
    expect(letterAt(s, 1, 0)).toBe("b");
  });

  it("clearEntry wipes typed letters but not givens", () => {
    let s = play(initialState(puzzle), ...type("ad"), { type: "clearEntry" });
    expect(s.grid).toEqual({});
    expect(letterAt(s, 1, 0)).toBe("b");
  });
});

describe("submit", () => {
  // Fill the whole cross: across = b(given)+"ad", down needs (0,1) and (2,1).
  const fillBadDab = (s: GameState) =>
    play(
      s,
      ...type("ad"), // across -> "bad"
      { type: "focusCell", row: 0, col: 1 },
      ...type("dab"), // down: (0,1)=d, (1,1) already 'a' -> overwritten 'a', (2,1)=b
    );

  it("banks every new word in a valid grid and keeps it for iteration", () => {
    let s = fillBadDab(initialState(puzzle));
    s = gameReducer(s, { type: "submit" });
    expect(s.lastResult).toMatchObject({
      type: "correct",
      newWords: ["bad", "dab"],
    });
    expect(s.found).toEqual(["bad", "dab"]);
    expect(letterAt(s, 1, 1)).toBe("a"); // grid untouched
  });

  it("rejects incomplete grids and all-banked resubmits", () => {
    let s = play(initialState(puzzle), ...type("ad"), { type: "submit" });
    expect(s.lastResult?.type).toBe("incomplete");
    s = fillBadDab(initialState(puzzle));
    s = play(s, { type: "submit" }, { type: "submit" });
    expect(s.lastResult?.type).toBe("nothingNew");
    expect(s.found).toHaveLength(2);
  });

  it("flags fillings outside the combo set with the offending word", () => {
    let s = play(
      initialState(puzzle),
      ...type("ax"), // across -> "bax"
      { type: "focusCell", row: 0, col: 1 },
      ...type("dax"),
    );
    s = gameReducer(s, { type: "submit" });
    expect(s.lastResult?.type).toBe("noFit");
    expect(s.lastResult?.word).toBe("bax");
  });

  it("marks solved at the 90% word threshold and keeps it sticky", () => {
    // 4 unique words -> solveTarget = ceil(3.6) = 4: finding all solves.
    let s = fillBadDab(initialState(puzzle));
    s = gameReducer(s, { type: "submit" });
    expect(s.solved).toBe(false);
    s = play(
      s,
      { type: "focusCell", row: 1, col: 1 },
      ...type("ud"), // across -> "bud"
      { type: "focusCell", row: 0, col: 1 },
      ...type("dud"),
      { type: "submit" },
    );
    expect(s.lastResult).toMatchObject({
      type: "correct",
      newWords: ["bud", "dud"],
    });
    expect(s.found).toHaveLength(4);
    expect(s.solved).toBe(true);
  });

  it("hints reveal letters of the target word and bank it when full", () => {
    // Default target: first unfound in list order (bad).
    let s = gameReducer(initialState(puzzle), {
      type: "revealHint",
      letterIndex: 1,
    });
    expect(hintTarget(initialState(puzzle))).toBe("bad");
    expect(s.revealed).toEqual({ bad: [1] });
    // Re-revealing the same position is a no-op.
    expect(
      gameReducer(s, { type: "revealHint", letterIndex: 1 }).revealed,
    ).toEqual({ bad: [1] });
    // An explicit aim at another unfound word wins.
    s = gameReducer(s, { type: "revealHint", word: "dud", letterIndex: 0 });
    expect(s.revealed).toEqual({ bad: [1], dud: [0] });
    // Revealing the last letters banks the word without typing.
    s = gameReducer(s, { type: "revealHint", word: "dud", letterIndex: 1 });
    s = gameReducer(s, { type: "revealHint", word: "dud", letterIndex: 2 });
    expect(s.found).toEqual(["dud"]);
    expect(s.lastResult).toMatchObject({
      type: "correct",
      newWords: ["dud"],
    });
    // A found word can't be aimed at — falls back to the default.
    s = gameReducer(s, { type: "revealHint", word: "dud", letterIndex: 0 });
    expect(s.revealed.bad).toEqual([1, 0]);
  });

  it("hydrates found words, grid, and solved flag", () => {
    const s = gameReducer(initialState(puzzle), {
      type: "hydrate",
      found: ["bad", "dab"],
      grid: { "1,1": "a" },
      revealed: {},
      solved: false,
    });
    expect(s.found).toHaveLength(2);
    expect(letterAt(s, 1, 1)).toBe("a");
    expect(s.solved).toBe(false);
  });
});
