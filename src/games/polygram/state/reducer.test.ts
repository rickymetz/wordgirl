import { describe, expect, it } from "vitest";
import type { Puzzle } from "../engine/types";
import {
  gameReducer,
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
    { size: 3, words: ["bad", "dab"] },
    { size: 4, words: ["abba"] },
  ],
  maxLevel: 4,
  maxScore: 3 + 3 + 3 + 4 + 4, // words + level bonuses
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
    expect(s.score).toBe(3);
    expect(s.current).toBe("");
    expect(s.lastResult?.type).toBe("correct");
    expect(s.phase).toBe("playing");
  });

  it("caps input at the level size", () => {
    const s = play(initialState(puzzle), ...type("badd"));
    expect(s.current).toBe("bad");
  });

  it("rejects duplicates and invalid words", () => {
    let s = play(initialState(puzzle), ...type("bad"), { type: "submit" });
    s = play(s, ...type("bad"), { type: "submit" });
    expect(s.lastResult?.type).toBe("duplicate");
    expect(s.score).toBe(3);
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
    expect(s.score).toBe(3 + 3 + 3); // two words + level bonus
    s = gameReducer(s, { type: "advanceLevel" });
    expect(s.levelIndex).toBe(1);
    expect(s.phase).toBe("playing");
  });

  it("finishes the puzzle on the last level", () => {
    let s = play(
      initialState(puzzle),
      ...type("bad"), { type: "submit" },
      ...type("dab"), { type: "submit" },
      { type: "advanceLevel" },
      ...type("abba"), { type: "submit" },
    );
    expect(s.phase).toBe("done");
    expect(s.score).toBe(puzzle.maxScore);
  });

  it("hints reveal a chosen letter of the first unsolved word and halve its points", () => {
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
    s = play(s, ...type("bad"), { type: "submit" });
    expect(s.lastResult?.points).toBe(1); // floor(3/2)
  });

  it("hydrates to the correct level and phase", () => {
    const s = gameReducer(initialState(puzzle), {
      type: "hydrate",
      found: ["bad", "dab"],
      revealed: {},
      score: 9,
    });
    expect(s.levelIndex).toBe(1);
    expect(s.phase).toBe("playing");

    const done = gameReducer(initialState(puzzle), {
      type: "hydrate",
      found: ["bad", "dab", "abba"],
      revealed: {},
      score: 17,
    });
    expect(done.phase).toBe("done");
  });
});
