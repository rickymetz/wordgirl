import type { PuzzleDef } from "./types";

/**
 * Curated puzzle bank. Each daily puzzle is selected by seeded index
 * from the pool for its difficulty.
 *
 * Puzzle paths are verified at test time: every step adjacent,
 * no overlaps, all cells covered, text matches.
 */

const easy: PuzzleDef[] = [
  {
    id: "e001",
    title: "Power",
    difficulty: "easy",
    rows: 4,
    cols: 4,
    grid: [
      ["K", "N", "O", "W"],
      ["G", "D", "E", "L"],
      ["E", "I", "S", "P"],
      ["R", "E", "W", "O"],
    ],
    text: "KNOWLEDGE IS POWER",
    path: [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 },
      { row: 1, col: 3 }, { row: 1, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 0 },
      { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
      { row: 3, col: 3 }, { row: 3, col: 2 }, { row: 3, col: 1 }, { row: 3, col: 0 },
    ],
  },
];

const medium: PuzzleDef[] = [
  {
    id: "m001",
    title: "Not all gold",
    difficulty: "medium",
    rows: 6,
    cols: 4,
    grid: [
      ["A", "L", "L", "T"],
      ["G", "T", "A", "H"],
      ["L", "I", "T", "T"],
      ["I", "S", "R", "E"],
      ["S", "N", "O", "T"],
      ["D", "L", "O", "G"],
    ],
    text: "ALL THAT GLITTERS IS NOT GOLD",
    path: [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 },
      { row: 1, col: 3 }, { row: 1, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 0 },
      { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
      { row: 3, col: 3 }, { row: 3, col: 2 }, { row: 3, col: 1 }, { row: 3, col: 0 },
      { row: 4, col: 0 }, { row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 3 },
      { row: 5, col: 3 }, { row: 5, col: 2 }, { row: 5, col: 1 }, { row: 5, col: 0 },
    ],
  },
];

const hard: PuzzleDef[] = [
  {
    id: "h001",
    title: "Persistence",
    difficulty: "hard",
    rows: 6,
    cols: 6,
    grid: [
      ["I", "T", "A", "L", "W", "A"],
      ["M", "E", "E", "S", "S", "Y"],
      ["S", "I", "M", "P", "O", "S"],
      ["U", "E", "L", "B", "I", "S"],
      ["N", "T", "I", "L", "I", "T"],
      ["E", "N", "O", "D", "S", "I"],
    ],
    text: "IT ALWAYS SEEMS IMPOSSIBLE UNTIL IT IS DONE",
    path: [
      { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 }, { row: 0, col: 5 },
      { row: 1, col: 5 }, { row: 1, col: 4 }, { row: 1, col: 3 }, { row: 1, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 0 },
      { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 }, { row: 2, col: 5 },
      { row: 3, col: 5 }, { row: 3, col: 4 }, { row: 3, col: 3 }, { row: 3, col: 2 }, { row: 3, col: 1 }, { row: 3, col: 0 },
      { row: 4, col: 0 }, { row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 3 }, { row: 4, col: 4 }, { row: 4, col: 5 },
      { row: 5, col: 5 }, { row: 5, col: 4 }, { row: 5, col: 3 }, { row: 5, col: 2 }, { row: 5, col: 1 }, { row: 5, col: 0 },
    ],
  },
];

const pools: Record<string, PuzzleDef[]> = { easy, medium, hard };

export function getPuzzlePool(difficulty: string): PuzzleDef[] {
  return pools[difficulty] ?? easy;
}

export function getPuzzle(difficulty: string, index: number): PuzzleDef {
  const pool = getPuzzlePool(difficulty);
  return pool[index % pool.length];
}
