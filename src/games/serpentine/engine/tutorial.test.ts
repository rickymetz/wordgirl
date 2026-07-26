import { describe, expect, it } from "vitest";
import { allPoemEntries } from "./puzzles";
import { areAdjacent, cellKey } from "./types";
import { checkSolved, validatePuzzle } from "./validation";
import {
  TUTORIAL_FIRST_DIAGONAL,
  onSolutionPath,
  TUTORIAL_PUZZLE,
  TUTORIAL_STEP_COUNT,
  tutorialStepIndex,
} from "./tutorial";

const isDiagonal = (a: { row: number; col: number }, b: typeof a) =>
  a.row !== b.row && a.col !== b.col;

describe("the tutorial puzzle", () => {
  it("passes the same validation the corpus does", () => {
    expect(validatePuzzle(TUTORIAL_PUZZLE)).toBeNull();
  });

  it("is a small grid with nothing blocked", () => {
    expect(TUTORIAL_PUZZLE.rows).toBe(3);
    expect(TUTORIAL_PUZZLE.cols).toBe(4);
    expect(TUTORIAL_PUZZLE.blocked.size).toBe(0);
    expect(TUTORIAL_PUZZLE.path).toHaveLength(12);
  });

  it("its own path solves it", () => {
    expect(checkSolved(TUTORIAL_PUZZLE.path, TUTORIAL_PUZZLE)).toBe(true);
  });

  it("cannot be traced without a diagonal move", () => {
    const diagonals = TUTORIAL_PUZZLE.path.filter(
      (c, i) => i > 0 && isDiagonal(TUTORIAL_PUZZLE.path[i - 1], c),
    );
    expect(diagonals.length).toBeGreaterThanOrEqual(1);
  });

  it("puts the first diagonal where the script says it is", () => {
    const i = TUTORIAL_FIRST_DIAGONAL;
    expect(
      isDiagonal(TUTORIAL_PUZZLE.path[i - 1], TUTORIAL_PUZZLE.path[i]),
    ).toBe(true);
    // ...and nothing earlier is diagonal, or the lesson lands late.
    for (let j = 1; j < i; j++) {
      expect(
        isDiagonal(TUTORIAL_PUZZLE.path[j - 1], TUTORIAL_PUZZLE.path[j]),
      ).toBe(false);
    }
  });

  it("keeps every step adjacent", () => {
    for (let i = 1; i < TUTORIAL_PUZZLE.path.length; i++) {
      expect(
        areAdjacent(TUTORIAL_PUZZLE.path[i - 1], TUTORIAL_PUZZLE.path[i]),
      ).toBe(true);
    }
  });

  it("carries no poem credit to print", () => {
    // The tutorial's phrase is an instruction, not verse — the screen hides
    // PoemCredit for it, and there is no author to attribute.
    expect(TUTORIAL_PUZZLE.author).toBe("");
    expect(TUTORIAL_PUZZLE.excerpt).toBe(false);
  });

  it("keeps its id out of the corpus namespace", () => {
    // Saves compare puzzleId; a collision with h###/p### would be a trap.
    expect(TUTORIAL_PUZZLE.id).not.toMatch(/^[hp]\d+$/);
    const corpusPhrases = new Set(allPoemEntries().map((e) => e[2]));
    expect(corpusPhrases.has(TUTORIAL_PUZZLE.text)).toBe(false);
  });

  it("lays the phrase's letters along the path in order", () => {
    const spelled = TUTORIAL_PUZZLE.path
      .map((c) => TUTORIAL_PUZZLE.grid[c.row][c.col])
      .join("");
    expect(spelled).toBe(TUTORIAL_PUZZLE.text.replace(/[^A-Z]/g, ""));
  });

  it("has no stray letters off the path", () => {
    const onPath = new Set(TUTORIAL_PUZZLE.path.map(cellKey));
    for (let r = 0; r < TUTORIAL_PUZZLE.rows; r++) {
      for (let c = 0; c < TUTORIAL_PUZZLE.cols; c++) {
        expect(onPath.has(cellKey({ row: r, col: c }))).toBe(true);
        expect(TUTORIAL_PUZZLE.grid[r][c]).toMatch(/^[A-Z]$/);
      }
    }
  });
});

describe("tutorialStepIndex", () => {
  const at = (s: Partial<Parameters<typeof tutorialStepIndex>[0]>) =>
    tutorialStepIndex({ cells: [], solved: false, ...s });
  const path = (n: number) => TUTORIAL_PUZZLE.path.slice(0, n);

  it("starts on step one", () => {
    expect(at({})).toBe(0);
  });

  it("advances on the first tap, then at the diagonal", () => {
    expect(at({ cells: path(1) })).toBe(1);
    expect(at({ cells: path(TUTORIAL_FIRST_DIAGONAL) })).toBe(2);
    expect(at({ cells: path(TUTORIAL_FIRST_DIAGONAL + 1) })).toBe(3);
  });

  it("reports the script finished only when solved", () => {
    expect(at({ cells: TUTORIAL_PUZZLE.path, solved: true })).toBe(
      TUTORIAL_STEP_COUNT,
    );
  });

  // The diagonal step asserts where the NEXT letter is, so it must never
  // appear to a player who isn't standing where that is true. The reducer
  // accepts any adjacent move, so wandering off is easy to do.
  it("never shows the diagonal step off the solution path", () => {
    // Two cells traced, but down a route that spells nothing: T then A
    // (straight down) instead of T then R.
    const wrong = [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ];
    expect(onSolutionPath(wrong)).toBe(false);
    expect(at({ cells: wrong })).toBe(1);
  });

  it("holds at the follow-the-letters step for any wrong route", () => {
    // A long wrong route still gets the step that tells you how to undo,
    // never the positional claim and never the near-the-end step.
    const wrong = [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 1, col: 1 },
    ];
    expect(onSolutionPath(wrong)).toBe(false);
    expect(at({ cells: wrong })).toBe(1);
  });

  it("recovers the diagonal step when the player backs onto the path", () => {
    // Undo is ordinary play here, and the screen does not clamp the step
    // forward — stepping back to the diagonal should put its lesson back.
    expect(at({ cells: path(3) })).toBe(3);
    expect(at({ cells: path(TUTORIAL_FIRST_DIAGONAL) })).toBe(2);
    expect(at({ cells: path(1) })).toBe(1);
    expect(at({ cells: [] })).toBe(0);
  });

  it("accepts every prefix of the real path as on-path", () => {
    for (let n = 0; n <= TUTORIAL_PUZZLE.path.length; n++) {
      expect(onSolutionPath(path(n))).toBe(true);
    }
  });

  it("rejects a path longer than the solution", () => {
    expect(onSolutionPath([...TUTORIAL_PUZZLE.path, { row: 0, col: 0 }])).toBe(
      false,
    );
  });
});
