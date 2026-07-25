import { describe, expect, it } from "vitest";
import type { PuzzleDef, Cell } from "../engine/types";
import { gameReducer, initialState } from "./reducer";

const path: Cell[] = [
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 1, col: 1 },
  { row: 1, col: 0 },
];

const puzzle: PuzzleDef = {
  id: "test",
  rows: 2,
  cols: 2,
  grid: [
    ["T", "E"],
    ["T", "S"],
  ],
  blocked: new Set(),
  path,
  text: "TEST",
  title: "Test Puzzle",
  author: "Test Author",
  difficulty: "haiku",
  excerpt: false,
  titleSpoils: false,
};

function init() {
  return initialState(puzzle, "haiku");
}

describe("Serpentine reducer", () => {
  it("starts with empty cells and not solved", () => {
    const s = init();
    expect(s.cells).toEqual([]);
    expect(s.solved).toBe(false);
    expect(s.claimed.size).toBe(0);
  });

  it("tapCell on empty path starts the path", () => {
    const s = gameReducer(init(), { type: "tapCell", row: 0, col: 0 });
    expect(s.cells).toEqual([{ row: 0, col: 0 }]);
    expect(s.claimed.has("0,0")).toBe(true);
  });

  it("tapCell extends path to adjacent cell", () => {
    let s = init();
    s = gameReducer(s, { type: "tapCell", row: 0, col: 0 });
    s = gameReducer(s, { type: "tapCell", row: 0, col: 1 });
    expect(s.cells).toHaveLength(2);
    expect(s.cells[1]).toEqual({ row: 0, col: 1 });
  });

  it("tapCell rejects non-adjacent cell", () => {
    const bigPuzzle: PuzzleDef = {
      ...puzzle,
      rows: 4,
      cols: 4,
      grid: [["A", "B", "C", "D"], ["E", "F", "G", "H"], ["I", "J", "K", "L"], ["M", "N", "O", "P"]],
      path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }],
      text: "ABCD",
    };
    let s = initialState(bigPuzzle, "haiku");
    s = gameReducer(s, { type: "tapCell", row: 0, col: 0 });
    const before = s;
    s = gameReducer(s, { type: "tapCell", row: 2, col: 2 });
    expect(s).toBe(before);
  });

  it("tapCell on already-claimed cell truncates to that point", () => {
    let s = init();
    s = gameReducer(s, { type: "tapCell", row: 0, col: 0 });
    s = gameReducer(s, { type: "tapCell", row: 0, col: 1 });
    s = gameReducer(s, { type: "tapCell", row: 1, col: 1 });
    expect(s.cells).toHaveLength(3);
    s = gameReducer(s, { type: "tapCell", row: 0, col: 1 });
    expect(s.cells).toHaveLength(2);
    expect(s.cells[1]).toEqual({ row: 0, col: 1 });
  });

  it("tapCell on tail undoes one step", () => {
    let s = init();
    s = gameReducer(s, { type: "tapCell", row: 0, col: 0 });
    s = gameReducer(s, { type: "tapCell", row: 0, col: 1 });
    s = gameReducer(s, { type: "tapCell", row: 0, col: 1 });
    expect(s.cells).toHaveLength(1);
  });

  it("undo removes last cell", () => {
    let s = init();
    s = gameReducer(s, { type: "tapCell", row: 0, col: 0 });
    s = gameReducer(s, { type: "tapCell", row: 0, col: 1 });
    s = gameReducer(s, { type: "undo" });
    expect(s.cells).toHaveLength(1);
  });

  it("undo on empty path is a no-op", () => {
    const s = init();
    const after = gameReducer(s, { type: "undo" });
    expect(after).toBe(s);
  });

  it("clearSnake empties the path", () => {
    let s = init();
    s = gameReducer(s, { type: "tapCell", row: 0, col: 0 });
    s = gameReducer(s, { type: "tapCell", row: 0, col: 1 });
    s = gameReducer(s, { type: "clearSnake" });
    expect(s.cells).toEqual([]);
    expect(s.claimed.size).toBe(0);
  });

  it("solves when path matches solution", () => {
    let s = init();
    for (const cell of path) {
      s = gameReducer(s, { type: "tapCell", row: cell.row, col: cell.col });
    }
    expect(s.solved).toBe(true);
  });

  it("does not accept moves after solved", () => {
    let s = init();
    for (const cell of path) {
      s = gameReducer(s, { type: "tapCell", row: cell.row, col: cell.col });
    }
    expect(s.solved).toBe(true);
    const after = gameReducer(s, { type: "tapCell", row: 0, col: 0 });
    expect(after).toBe(s);
  });

  it("hydrate restores cells and solved state", () => {
    const s = gameReducer(init(), {
      type: "hydrate",
      cells: path,
      solved: true,
    });
    expect(s.cells).toEqual(path);
    expect(s.solved).toBe(true);
    expect(s.claimed.size).toBe(4);
  });

  it("hydrate rejects false solved claim if path is wrong", () => {
    const s = gameReducer(init(), {
      type: "hydrate",
      cells: [path[0]],
      solved: true,
    });
    expect(s.solved).toBe(false);
  });

  it("rejects tapCell on blocked cell", () => {
    const blockedPuzzle: PuzzleDef = {
      ...puzzle,
      blocked: new Set(["0,1"]),
    };
    let s = initialState(blockedPuzzle, "haiku");
    s = gameReducer(s, { type: "tapCell", row: 0, col: 0 });
    const before = s;
    s = gameReducer(s, { type: "tapCell", row: 0, col: 1 });
    expect(s).toBe(before);
  });

  it("cannot extend path beyond target length", () => {
    const shortPuzzle: PuzzleDef = {
      ...puzzle,
      path: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
      text: "TE",
    };
    let s = initialState(shortPuzzle, "haiku");
    s = gameReducer(s, { type: "tapCell", row: 0, col: 0 });
    s = gameReducer(s, { type: "tapCell", row: 0, col: 1 });
    const before = s;
    s = gameReducer(s, { type: "tapCell", row: 1, col: 1 });
    expect(s).toBe(before);
  });

  it("supports diagonal adjacency", () => {
    let s = init();
    s = gameReducer(s, { type: "tapCell", row: 0, col: 0 });
    s = gameReducer(s, { type: "tapCell", row: 1, col: 1 });
    expect(s.cells).toHaveLength(2);
  });
});
