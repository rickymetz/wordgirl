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
  // 2×3 rectangle (6 cells)
  parseGrid("e1", [
    [1, 1, 1],
    [1, 1, 1],
  ]),
  // Square ring (8 cells)
  parseGrid("e2", [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
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
  // 3×4 rectangle (12 cells)
  parseGrid("m1", [
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
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
    [1, 0, 0, 0, 1],
  ]),
  // Cross (12 cells)
  parseGrid("m4", [
    [0, 1, 1, 0],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [0, 1, 1, 0],
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
  // 4×4 square (16 cells)
  parseGrid("h1", [
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
    [1, 1, 1, 1],
  ]),
  // 4×5 rectangle (20 cells)
  parseGrid("h2", [
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
  ]),
  // Big C (16 cells)
  parseGrid("h3", [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ]),
  // Plus (16 cells)
  parseGrid("h4", [
    [0, 0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0, 0],
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1],
    [0, 0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0, 0],
  ]),
  // Zigzag wide (16 cells)
  parseGrid("h5", [
    [1, 1, 1, 1, 0],
    [0, 0, 1, 1, 0],
    [0, 1, 1, 0, 0],
    [0, 1, 1, 1, 1],
  ]),
];

export const SHAPES: Record<Difficulty, BoardShape[]> = {
  easy: EASY_SHAPES,
  medium: MEDIUM_SHAPES,
  hard: HARD_SHAPES,
};
