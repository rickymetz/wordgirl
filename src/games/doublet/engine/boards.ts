import type { BoardShape, Cell, Difficulty } from "./types";

function parseGrid(id: string, rows: number[][]): BoardShape {
  const cells: Cell[] = [];
  let maxCol = 0;
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c]) {
        cells.push({ row: r, col: c });
        if (c > maxCol) maxCol = c;
      }
    }
  }
  return { id, cells, rows: rows.length, cols: maxCol + 1 };
}

const EASY_SHAPES: BoardShape[] = [
  // J-hook (6 cells)
  parseGrid("e1", [
    [1, 1, 1],
    [0, 0, 1],
    [0, 1, 1],
  ]),
  // Thick L with nub (8 cells)
  parseGrid("e2", [
    [1, 1, 0, 0],
    [1, 1, 0, 0],
    [0, 1, 1, 1],
    [0, 0, 0, 1],
  ]),
  // C-shape (8 cells)
  parseGrid("e3", [
    [1, 1, 1],
    [1, 0, 0],
    [1, 0, 0],
    [1, 1, 1],
  ]),
  // Zigzag (6 cells)
  parseGrid("e4", [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 1],
    [0, 0, 1],
  ]),
  // T-bar (6 cells)
  parseGrid("e5", [
    [1, 1, 1],
    [0, 1, 0],
    [0, 1, 0],
    [0, 1, 0],
  ]),
];

const MEDIUM_SHAPES: BoardShape[] = [
  // C with tail (12 cells)
  parseGrid("m1", [
    [1, 1, 1, 1],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 1, 1, 0],
    [0, 0, 1, 0],
  ]),
  // Wide U (10 cells)
  parseGrid("m2", [
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [1, 1, 1, 1],
    [0, 1, 1, 0],
  ]),
  // Staple (10 cells)
  parseGrid("m3", [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 1, 1],
  ]),
  // Step zigzag (12 cells)
  parseGrid("m4", [
    [0, 1, 1, 1, 1],
    [1, 1, 0, 0, 0],
    [1, 1, 1, 0, 0],
    [0, 0, 1, 1, 1],
  ]),
  // L-block (10 cells)
  parseGrid("m5", [
    [1, 1, 0, 0],
    [1, 1, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 1, 1],
  ]),
];

const HARD_SHAPES: BoardShape[] = [
  // Twisted scatter (16 cells)
  parseGrid("h1", [
    [0, 1, 1, 0, 0],
    [1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1],
    [0, 1, 1, 1, 1],
    [1, 1, 0, 1, 0],
  ]),
  // E-shape (16 cells)
  parseGrid("h3", [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ]),
  // Widening cascade (16 cells)
  parseGrid("h5", [
    [1, 1, 1, 0, 0],
    [1, 0, 1, 0, 0],
    [1, 1, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
  ]),
];

export const SHAPES: Record<Difficulty, BoardShape[]> = {
  easy: EASY_SHAPES,
  medium: MEDIUM_SHAPES,
  hard: HARD_SHAPES,
};
