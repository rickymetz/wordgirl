import { describe, expect, it } from "vitest";
import { allPoemEntries } from "./puzzles";
import { areAdjacent, cellKey } from "./types";
import { checkSolved, pathSelfCrosses, validatePuzzle } from "./validation";
import {
  TUTORIAL_BLOCKED_TWIN,
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

  it("never crosses its own line, like every generated board", () => {
    expect(pathSelfCrosses(TUTORIAL_PUZZLE.path)).toBe(false);
  });

  it("keeps every step adjacent", () => {
    for (let i = 1; i < TUTORIAL_PUZZLE.path.length; i++) {
      expect(
        areAdjacent(TUTORIAL_PUZZLE.path[i - 1], TUTORIAL_PUZZLE.path[i]),
      ).toBe(true);
    }
  });

  it("stages the crossing rule: two touching Es, one closed by the line", () => {
    // The lesson step four makes a claim about. Everything it says has to
    // be true of the board at exactly that moment, or the tutorial teaches
    // a lie on the one screen with no hints to fall back on.
    const traced = TUTORIAL_PUZZLE.path.slice(0, TUTORIAL_BLOCKED_TWIN);
    const tail = traced[traced.length - 1];
    const seen = new Set(traced.map(cellKey));
    const letterAt = (c: { row: number; col: number }) =>
      TUTORIAL_PUZZLE.grid[c.row][c.col];

    const touching = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const c = { row: tail.row + dr, col: tail.col + dc };
        if (c.row < 0 || c.row >= TUTORIAL_PUZZLE.rows) continue;
        if (c.col < 0 || c.col >= TUTORIAL_PUZZLE.cols) continue;
        if (!seen.has(cellKey(c))) touching.push(c);
      }
    }

    // "Both cells left touching yours show an E."
    expect(touching).toHaveLength(2);
    const needed = letterAt(TUTORIAL_PUZZLE.path[TUTORIAL_BLOCKED_TWIN]);
    expect(needed).toBe("E");
    expect(touching.map(letterAt)).toEqual([needed, needed]);

    // "The one across the line you drew is closed" — exactly one of the two
    // crosses, and it is NOT the one the solution takes.
    const crosses = touching.filter(
      (c) => pathSelfCrosses([...traced, c]),
    );
    expect(crosses).toHaveLength(1);
    expect(cellKey(crosses[0])).not.toBe(
      cellKey(TUTORIAL_PUZZLE.path[TUTORIAL_BLOCKED_TWIN]),
    );

    // "Come back for it later" — the closed cell is a detour, not a dead
    // end, so the player is never told to abandon a letter.
    const later = TUTORIAL_PUZZLE.path.findIndex(
      (c) => cellKey(c) === cellKey(crosses[0]),
    );
    expect(later).toBeGreaterThan(TUTORIAL_BLOCKED_TWIN);
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

  it("starts on step one, on the given first letter", () => {
    expect(at({ cells: path(1) })).toBe(0);
  });

  it("advances at the diagonal, then past it", () => {
    expect(at({ cells: path(TUTORIAL_FIRST_DIAGONAL) })).toBe(1);
    expect(at({ cells: path(TUTORIAL_FIRST_DIAGONAL + 1) })).toBe(2);
  });

  it("advances at the blocked twin and stays there to the end", () => {
    expect(at({ cells: path(TUTORIAL_BLOCKED_TWIN - 1) })).toBe(2);
    expect(at({ cells: path(TUTORIAL_BLOCKED_TWIN) })).toBe(3);
    // The closed cell is still on the board until the last move, so the
    // lesson holds rather than handing back to "cover every letter".
    for (let n = TUTORIAL_BLOCKED_TWIN; n <= TUTORIAL_PUZZLE.path.length; n++) {
      expect(at({ cells: path(n) })).toBe(3);
    }
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
    expect(at({ cells: wrong })).toBe(0);
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
    expect(at({ cells: wrong })).toBe(0);
  });

  it("recovers the diagonal step when the player backs onto the path", () => {
    // Undo is ordinary play here, and the screen does not clamp the step
    // forward — stepping back to the diagonal should put its lesson back.
    expect(at({ cells: path(3) })).toBe(2);
    expect(at({ cells: path(TUTORIAL_FIRST_DIAGONAL) })).toBe(1);
    expect(at({ cells: path(1) })).toBe(0);
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
