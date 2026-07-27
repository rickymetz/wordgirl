import { describe, it, expect } from "vitest";
import { getThemedPuzzle, getPoolSize, titleSpoilsPhrase } from "./puzzles";
import {
  cellsFitPuzzle,
  crossingStepIndex,
  pathSelfCrosses,
  validatePuzzle,
} from "./validation";
import type { Cell } from "./types";

describe("titleSpoilsPhrase", () => {
  it("withholds a title that is the phrase", () => {
    const title = "A little Dog that wags his tail";
    expect(titleSpoilsPhrase(title, "A LITTLE DOG THAT WAGS HIS TAIL")).toBe(true);
  });

  it("withholds a title that opens the phrase and covers half of it", () => {
    expect(
      titleSpoilsPhrase("She Walks in Beauty", "SHE WALKS IN BEAUTY, LIKE THE NIGHT"),
    ).toBe(true);
  });

  it("keeps a title that only echoes the first words", () => {
    // Seven letters of thirty-one: a hint, not the answer.
    expect(
      titleSpoilsPhrase("Old Pond", "OLD POND FROGS JUMPING IN SOUND OF WATER"),
    ).toBe(false);
  });

  it("keeps a title that names the poem rather than quoting it", () => {
    expect(
      titleSpoilsPhrase("Sonnet 18", "AND SUMMER'S LEASE HATH ALL TOO SHORT A DATE"),
    ).toBe(false);
  });

  it("ignores punctuation and case when comparing", () => {
    expect(titleSpoilsPhrase("oh! weep for those", "OH! WEEP FOR THOSE")).toBe(true);
  });

  it("says no when either side is empty", () => {
    expect(titleSpoilsPhrase("", "ANY PHRASE")).toBe(false);
    expect(titleSpoilsPhrase("Any Title", "")).toBe(false);
  });
});

describe("serpentine puzzles", () => {
  const size = getPoolSize();
  for (const difficulty of ["haiku", "poem"] as const) {
    for (let i = 0; i < size; i++) {
      const puzzle = getThemedPuzzle(difficulty, i, "validate");
      it(`${puzzle.id} (${difficulty}) has a valid path`, () => {
        const error = validatePuzzle(puzzle);
        expect(error).toBeNull();
      });
    }
  }
});

describe("crossingStepIndex", () => {
  const cells = (...pairs: [number, number][]): Cell[] =>
    pairs.map(([row, col]) => ({ row, col }));

  it("finds the X two diagonals draw through one 2×2 block", () => {
    // (0,0)→(1,1) and (1,0)→(0,1) are the two arms of the same X.
    const path = cells([0, 0], [1, 1], [2, 1], [1, 0], [0, 1]);
    expect(crossingStepIndex(path)).toBe(4);
    expect(pathSelfCrosses(path)).toBe(true);
  });

  it("catches the crossing whichever arm is drawn first", () => {
    expect(pathSelfCrosses(cells([1, 0], [0, 1], [1, 1], [0, 0]))).toBe(true);
  });

  it("lets two diagonals share a 2×2 block without crossing", () => {
    // Both arms of the OTHER diagonal — parallel, never meeting.
    expect(pathSelfCrosses(cells([0, 0], [1, 1], [1, 2], [0, 3]))).toBe(false);
  });

  it("lets the line run alongside itself", () => {
    expect(
      pathSelfCrosses(cells([0, 0], [0, 1], [0, 2], [1, 2], [1, 1], [1, 0])),
    ).toBe(false);
  });

  it("says no for orthogonal-only and trivial paths", () => {
    expect(pathSelfCrosses(cells([0, 0], [0, 1], [1, 1], [1, 0]))).toBe(false);
    expect(pathSelfCrosses(cells([0, 0]))).toBe(false);
    expect(pathSelfCrosses([])).toBe(false);
  });
});

describe("generated paths never cross themselves", () => {
  const size = getPoolSize();
  // Layout is re-rolled per date, so one salt proves nothing about the
  // next. These salts cover ~1500 boards; before the rule, 44% crossed.
  for (const salt of ["2026-07-10", "2026-11-03", "2027-02-29", "x", "yz"]) {
    it(`holds across the pool for salt ${salt}`, () => {
      for (const difficulty of ["haiku", "poem"] as const) {
        for (let i = 0; i < size; i++) {
          const puzzle = getThemedPuzzle(difficulty, i, salt);
          const at = crossingStepIndex(puzzle.path);
          expect(
            at,
            `${puzzle.id} (${difficulty}) crosses at step ${at}`,
          ).toBe(-1);
        }
      }
    });
  }

  it("is enforced by validatePuzzle, so a hand-laid path is held to it too", () => {
    const crossed = {
      id: "crossed",
      title: "Crossed",
      author: "",
      difficulty: "haiku" as const,
      rows: 2,
      cols: 2,
      grid: [
        ["A", "B"],
        ["C", "D"],
      ],
      text: "ADCB",
      excerpt: false,
      titleSpoils: false,
      blocked: new Set<string>(),
      path: [
        { row: 0, col: 0 },
        { row: 1, col: 1 },
        { row: 1, col: 0 },
        { row: 0, col: 1 },
      ],
    };
    expect(validatePuzzle(crossed)).toMatch(/crosses itself/);
  });

  it("still turns corners — the rule bans crossings, not diagonals", () => {
    const puzzle = getThemedPuzzle("poem", 3, "2026-07-10");
    const diagonals = puzzle.path.filter(
      (c, i) =>
        i > 0 && c.row !== puzzle.path[i - 1].row && c.col !== puzzle.path[i - 1].col,
    );
    expect(diagonals.length).toBeGreaterThan(0);
  });
});

describe("cellsFitPuzzle", () => {
  const puzzle = getThemedPuzzle("haiku", 0, "fit-test");

  it("accepts the puzzle's own solution path", () => {
    expect(cellsFitPuzzle(puzzle.path, puzzle)).toBe(true);
  });

  it("accepts an empty save", () => {
    expect(cellsFitPuzzle([], puzzle)).toBe(true);
  });

  it("rejects a cell past the last row", () => {
    // What a save from a build whose grid was one row taller looks like.
    expect(cellsFitPuzzle([{ row: puzzle.rows, col: 0 }], puzzle)).toBe(false);
  });

  it("rejects a cell past the last column, or a negative one", () => {
    expect(cellsFitPuzzle([{ row: 0, col: puzzle.cols }], puzzle)).toBe(false);
    expect(cellsFitPuzzle([{ row: -1, col: 0 }], puzzle)).toBe(false);
  });

  it("rejects a blocked cell", () => {
    const blocked = [...puzzle.blocked].map((k) => k.split(",").map(Number));
    if (blocked.length === 0) return;
    const [row, col] = blocked[0];
    expect(cellsFitPuzzle([{ row, col }], puzzle)).toBe(false);
  });
});
