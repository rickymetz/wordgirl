import { describe, expect, it } from "vitest";
import type { Puzzle } from "../engine/types";
import {
  canSkipLevel,
  gameReducer,
  hintTarget,
  initialState,
  unsolvedWords,
  type GameAction,
  type GameState,
} from "./reducer";

const puzzle: Puzzle = {
  seed: "test",
  dictVersion: 1,
  letters: ["a", "b", "d", "c"],
  levels: [
    { size: 3, words: ["bad", "dab"], bonusWords: ["abb"] },
    { size: 4, words: ["abba"], bonusWords: [] },
  ],
  maxLevel: 4,
  totalWords: 4, // three at the triangle (two required + one bonus), one square
};

function play(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

function type(word: string): GameAction[] {
  return [...word].map((letter) => ({ type: "tapLetter", letter }));
}

describe("gameReducer", () => {
  it("builds and submits a correct word", () => {
    const s = play(initialState(puzzle), ...type("bad"), { type: "submit" });
    expect(s.found).toEqual(["bad"]);
    expect(s.current).toBe("");
    expect(s.lastResult?.type).toBe("correct");
    expect(s.phase).toBe("playing");
  });

  it("caps input at the level size", () => {
    const s = play(initialState(puzzle), ...type("badd"));
    expect(s.current).toBe("bad");
  });

  it("differentiates empty and too-short submissions", () => {
    let s = gameReducer(initialState(puzzle), { type: "submit" });
    expect(s.lastResult?.type).toBe("empty");
    s = play(initialState(puzzle), ...type("ba"), { type: "submit" });
    expect(s.lastResult?.type).toBe("tooShort");
    expect(s.current).toBe("");
  });

  it("bonus words count without gating the level", () => {
    let s = play(initialState(puzzle), ...type("abb"), { type: "submit" });
    expect(s.lastResult).toMatchObject({ type: "correct", bonus: true });
    expect(s.found).toEqual(["abb"]);
    expect(s.phase).toBe("playing"); // bonus can't clear the level
    // Level still clears on required words alone.
    s = play(s, ...type("bad"), { type: "submit" }, ...type("dab"), {
      type: "submit",
    });
    expect(s.phase).toBe("levelClear");
  });

  it("hints can be aimed at a chosen unsolved word", () => {
    let s = gameReducer(initialState(puzzle), {
      type: "revealHint",
      word: "dab",
      letterIndex: 0,
    });
    expect(s.revealed).toEqual({ dab: [0] });
    // Invalid target (bonus word) falls back to the default.
    s = gameReducer(initialState(puzzle), {
      type: "revealHint",
      word: "abb",
      letterIndex: 0,
    });
    expect(s.revealed).toEqual({ bad: [0] });
  });

  it("rejects duplicates and invalid words", () => {
    let s = play(initialState(puzzle), ...type("bad"), { type: "submit" });
    s = play(s, ...type("bad"), { type: "submit" });
    expect(s.lastResult?.type).toBe("duplicate");
    expect(s.found).toEqual(["bad"]);
    s = play(s, ...type("abd"), { type: "submit" });
    expect(s.lastResult?.type).toBe("invalid");
    expect(s.found).toEqual(["bad"]);
  });

  it("clears a level with bonus and advances", () => {
    let s = play(
      initialState(puzzle),
      ...type("bad"), { type: "submit" },
      ...type("dab"), { type: "submit" },
    );
    expect(s.phase).toBe("levelClear");
    s = gameReducer(s, { type: "advanceLevel" });
    expect(s.levelIndex).toBe(1);
    expect(s.phase).toBe("playing");
  });

  it("finishes the puzzle on the last level", () => {
    const s = play(
      initialState(puzzle),
      ...type("abb"), { type: "submit" }, // the bonus word
      ...type("bad"), { type: "submit" },
      ...type("dab"), { type: "submit" },
      { type: "advanceLevel" },
      ...type("abba"), { type: "submit" },
    );
    expect(s.phase).toBe("done");
    // A perfect sweep: every word the puzzle had, bonus tier included.
    expect(s.found).toHaveLength(puzzle.totalWords);
  });

  it("hints reveal a chosen letter of the first unsolved word", () => {
    let s = gameReducer(initialState(puzzle), {
      type: "revealHint",
      letterIndex: 2,
    });
    expect(unsolvedWords(s)[0]).toBe("bad");
    expect(s.revealed).toEqual({ bad: [2] });
    // Re-revealing the same position is a no-op.
    expect(
      gameReducer(s, { type: "revealHint", letterIndex: 2 }).revealed,
    ).toEqual({ bad: [2] });
    // A hinted word still counts as found when typed out.
    s = play(s, ...type("bad"), { type: "submit" });
    expect(s.found).toEqual(["bad"]);
  });

  it("fully revealing a word auto-submits it", () => {
    let s = initialState(puzzle);
    for (const i of [0, 1, 2]) {
      s = gameReducer(s, { type: "revealHint", letterIndex: i });
    }
    // Third reveal completes "bad" -> found automatically.
    expect(s.found).toEqual(["bad"]);
    expect(s.lastResult).toMatchObject({ type: "correct", word: "bad" });
    // Hints now target the next unsolved word.
    expect(hintTarget(s)).toBe("dab");
    expect(unsolvedWords(s)).toEqual(["dab"]);
    // Auto-submitting the LAST word clears the level.
    for (const i of [0, 1, 2]) {
      s = gameReducer(s, { type: "revealHint", letterIndex: i });
    }
    expect(s.found).toEqual(["bad", "dab"]);
    expect(s.phase).toBe("levelClear");
  });

  it("hydrates to the correct level and phase", () => {
    const s = gameReducer(initialState(puzzle), {
      type: "hydrate",
      found: ["bad", "dab"],
      revealed: {},
      skippedLevels: [],
    });
    expect(s.levelIndex).toBe(1);
    expect(s.phase).toBe("playing");

    const done = gameReducer(initialState(puzzle), {
      type: "hydrate",
      found: ["bad", "dab", "abba"],
      revealed: {},
      skippedLevels: [],
    });
    expect(done.phase).toBe("done");
  });

  it("canSkipLevel is true when gate met via bonus words", () => {
    const s = play(
      initialState(puzzle),
      ...type("bad"),
      { type: "submit" },
      ...type("abb"),
      { type: "submit" },
    );
    expect(s.found).toEqual(["bad", "abb"]);
    expect(s.phase).toBe("playing");
    expect(canSkipLevel(s)).toBe(true);
  });

  it("canSkipLevel is false when all core words found", () => {
    const s = play(
      initialState(puzzle),
      ...type("bad"),
      { type: "submit" },
      ...type("dab"),
      { type: "submit" },
    );
    expect(s.phase).toBe("levelClear");
    expect(canSkipLevel(s)).toBe(false);
  });

  it("skipLevel advances and records skipped level", () => {
    let s = play(
      initialState(puzzle),
      ...type("bad"),
      { type: "submit" },
      ...type("abb"),
      { type: "submit" },
    );
    s = gameReducer(s, { type: "skipLevel" });
    expect(s.levelIndex).toBe(1);
    expect(s.phase).toBe("playing");
    expect(s.skippedLevels).toEqual([0]);
  });

  it("hydrate respects skipped levels", () => {
    const s = gameReducer(initialState(puzzle), {
      type: "hydrate",
      found: ["bad", "abb"],
      revealed: {},
      skippedLevels: [0],
    });
    expect(s.levelIndex).toBe(1);
    expect(s.phase).toBe("playing");
    expect(s.skippedLevels).toEqual([0]);
  });
});
