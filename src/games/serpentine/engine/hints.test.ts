import { describe, expect, it } from "vitest";
import { getDailyPuzzle } from "./dailySeed";
import { completeRoute, correctPrefixLength, nextHint, replayHints } from "./hints";
import { cellKey, type Cell } from "./types";
import { checkSolved } from "./validation";

// "A WORLD OF GRIEF AND PAIN FLOWERS BLOOM EVEN THEN" — the 2026-07-24
// daily. Ten words, forty letters.
const SINGLE = getDailyPuzzle("haiku", "2026-07-24");

// "STEADY THY LADEN HEAD ACROSS A BROOK; …" — the 2026-09-06 poem. Its
// opening S (1,4) touches TWO T's, (0,3) and (1,3), and the board spells
// the phrase either way: one T opens STEADY and the other closes PATIENT.
// The stored path takes (0,3) first; the alternate takes (1,3) first.
const TWO_ROUTES = getDailyPuzzle("poem", "2026-09-06");
const T_STORED = { row: 0, col: 3 };
const T_ALT = { row: 1, col: 3 };

const keys = (cells: readonly Cell[]) => cells.map(cellKey);
const alternate = completeRoute(TWO_ROUTES, [TWO_ROUTES.path[0], T_ALT])!;

describe("the fixtures", () => {
  it("single-route board is the phrase the comments name", () => {
    expect(SINGLE.text).toBe("A WORLD OF GRIEF AND PAIN FLOWERS BLOOM EVEN THEN");
  });

  it("really does have two solutions", () => {
    expect(TWO_ROUTES.text.startsWith("STEADY")).toBe(true);
    expect(TWO_ROUTES.path[1]).toEqual(T_STORED);
    expect(alternate).not.toBeNull();
    expect(checkSolved(TWO_ROUTES.path, TWO_ROUTES)).toBe(true);
    expect(checkSolved(alternate, TWO_ROUTES)).toBe(true);
    expect(keys(alternate)).not.toEqual(keys(TWO_ROUTES.path));
    // Same cells, taken in a different order: the stored route reaches
    // (1,3) near the end, exactly where the alternate reaches (0,3).
    const late = alternate.findIndex((c) => cellKey(c) === cellKey(T_STORED));
    expect(cellKey(TWO_ROUTES.path[late])).toBe(cellKey(T_ALT));
  });
});

describe("completeRoute", () => {
  it("completes a prefix of the stored path to the stored path", () => {
    const route = completeRoute(SINGLE, SINGLE.path.slice(0, 12));
    expect(keys(route!)).toEqual(keys(SINGLE.path));
  });

  it("returns null for a prefix with a wrong letter", () => {
    const wrong = { row: 0, col: 4 }; // the E of STEADY, not a T
    expect(completeRoute(TWO_ROUTES, [TWO_ROUTES.path[0], wrong])).toBeNull();
  });

  it("returns null for a non-adjacent step", () => {
    expect(
      completeRoute(SINGLE, [SINGLE.path[0], SINGLE.path[2]]),
    ).toBeNull();
  });
});

describe("nextHint", () => {
  it("reveals the cell the player is stuck on", () => {
    // Nine of ten words placed: the hint places the "T" of THEN, whose
    // letter the readout already gives. What it adds is WHERE.
    const target = nextHint(SINGLE, SINGLE.path.slice(0, 36), new Set());
    expect(target).toEqual({
      kind: "reveal",
      cell: SINGLE.path[36],
      key: cellKey(SINGLE.path[36]),
      index: 36,
    });
  });

  it("walks forward past cells already hinted", () => {
    const hinted = new Set([cellKey(SINGLE.path[36]), cellKey(SINGLE.path[37])]);
    const target = nextHint(SINGLE, SINGLE.path.slice(0, 36), hinted);
    expect(target).toMatchObject({ kind: "reveal", index: 38 });
  });

  it("takes hints mid-word, not only at a word's opening", () => {
    // Progress 33 is one letter into "EVEN" (32..35).
    const target = nextHint(SINGLE, SINGLE.path.slice(0, 33), new Set());
    expect(target).toMatchObject({ kind: "reveal", index: 33 });
  });

  it("returns null when every remaining cell is hinted", () => {
    const hinted = new Set(SINGLE.path.slice(36).map(cellKey));
    expect(nextHint(SINGLE, SINGLE.path.slice(0, 36), hinted)).toBeNull();
  });

  it("follows the player's alternate route, not the stored one", () => {
    // Deep into the alternate route, the stored path's next cell is the
    // T the player took at step one — already under the snake. The hint
    // must reveal the T the alternate still needs instead.
    const late = alternate.findIndex((c) => cellKey(c) === cellKey(T_STORED));
    const cells = alternate.slice(0, late);
    expect(cells.some((c) => cellKey(c) === cellKey(TWO_ROUTES.path[late]))).toBe(true);

    const target = nextHint(TWO_ROUTES, cells, new Set());
    expect(target).toMatchObject({ kind: "reveal", key: cellKey(T_STORED), index: late });
  });

  it("always reveals a cell off the snake and next to its head", () => {
    // Every step along the alternate route: the old stored-path rule
    // pointed into the snake or away from its head for most of them.
    for (let n = 1; n < alternate.length; n++) {
      const cells = alternate.slice(0, n);
      const target = nextHint(TWO_ROUTES, cells, new Set());
      expect(target?.kind).toBe("reveal");
      if (target?.kind !== "reveal") continue;
      expect(keys(cells)).not.toContain(target.key);
      const head = cells[n - 1];
      expect(Math.max(Math.abs(head.row - target.cell.row), Math.abs(head.col - target.cell.col))).toBe(1);
      expect(target.index).toBe(n);
    }
  });

  it("points back to the last good cell when the snake has gone wrong", () => {
    const wrong = { row: 0, col: 4 }; // E where the T belongs
    expect(nextHint(TWO_ROUTES, [TWO_ROUTES.path[0], wrong], new Set())).toEqual({
      kind: "backtrack",
      keep: 1,
    });
    // Ten good cells, then a wrong turn and a few more after it.
    const good = SINGLE.path.slice(0, 10);
    const off = SINGLE.path.slice(12, 14);
    const target = nextHint(SINGLE, [...good, ...off], new Set());
    expect(target).toEqual({ kind: "backtrack", keep: 10 });
  });
});

describe("correctPrefixLength", () => {
  it("is the whole snake while it can still be completed", () => {
    expect(correctPrefixLength(TWO_ROUTES, alternate.slice(0, 30))).toBe(30);
    expect(correctPrefixLength(TWO_ROUTES, TWO_ROUTES.path.slice(0, 30))).toBe(30);
  });

  it("is zero-based count of cells before the first wrong one", () => {
    const cells = [...SINGLE.path.slice(0, 20), SINGLE.path[25]];
    expect(correctPrefixLength(SINGLE, cells)).toBe(20);
  });

  it("flags a full-length snake that spells the phrase out of order", () => {
    // Every cell, wrong order: not solvable from here at all.
    const scrambled = [...SINGLE.path.slice(0, 5), ...SINGLE.path.slice(5).reverse()];
    expect(correctPrefixLength(SINGLE, scrambled)).toBeLessThan(scrambled.length);
  });
});

describe("replayHints", () => {
  it("restores hints the player can still see", () => {
    // A save of one hint taken at nine words in must come back ahead of
    // the snake, not at the first letter of the phrase.
    expect(replayHints(SINGLE, SINGLE.path.slice(0, 36), 1)).toEqual([
      { key: cellKey(SINGLE.path[36]), index: 36 },
    ]);
  });

  it("replays several hints in targeting order", () => {
    expect(replayHints(SINGLE, SINGLE.path.slice(0, 36), 3).map((h) => h.index)).toEqual([
      36, 37, 38,
    ]);
  });

  it("restores from the start for an untouched board", () => {
    expect(replayHints(SINGLE, SINGLE.path.slice(0, 1), 3).map((h) => h.index)).toEqual([
      1, 2, 3,
    ]);
  });

  it("replays along the player's alternate route", () => {
    const late = alternate.findIndex((c) => cellKey(c) === cellKey(T_STORED));
    expect(replayHints(TWO_ROUTES, alternate.slice(0, late), 1)).toEqual([
      { key: cellKey(T_STORED), index: late },
    ]);
  });

  it("stops cleanly when the count exceeds the cells left", () => {
    expect(replayHints(SINGLE, SINGLE.path.slice(0, 36), 99)).toHaveLength(4);
  });

  it("is empty for a save with no hints", () => {
    expect(replayHints(SINGLE, SINGLE.path.slice(0, 36), 0)).toHaveLength(0);
  });

  it("restores nothing onto a snake that has gone wrong", () => {
    const cells = [...SINGLE.path.slice(0, 10), SINGLE.path[12]];
    expect(replayHints(SINGLE, cells, 2)).toHaveLength(0);
  });
});
