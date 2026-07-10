import type { PuzzleDef } from "./types";

/**
 * Curated puzzle bank. Each daily puzzle is selected by seeded index
 * from the pool for its difficulty.
 *
 * Puzzle paths are verified at test time: every step adjacent,
 * no overlaps, all cells covered.
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
    snakes: [
      {
        text: "KNOWLEDGE IS POWER",
        cells: [
          { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 },
          { row: 1, col: 3 }, { row: 1, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 0 },
          { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
          { row: 3, col: 3 }, { row: 3, col: 2 }, { row: 3, col: 1 }, { row: 3, col: 0 },
        ],
      },
    ],
  },
];

const medium: PuzzleDef[] = [
  {
    id: "m001",
    title: "The question",
    difficulty: "medium",
    rows: 6,
    cols: 4,
    grid: [
      ["T", "O", "B", "E"],
      ["O", "N", "R", "O"],
      ["T", "T", "O", "B"],
      ["S", "H", "A", "E"],
      ["P", "S", "E", "K"],
      ["E", "A", "R", "E"],
    ],
    snakes: [
      {
        text: "TO BE OR NOT TO BE",
        cells: [
          { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 },
          { row: 1, col: 3 }, { row: 1, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 0 },
          { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
          { row: 3, col: 3 },
        ],
      },
      {
        text: "SHAKESPEARE",
        cells: [
          { row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 },
          { row: 4, col: 3 }, { row: 4, col: 2 }, { row: 4, col: 1 }, { row: 4, col: 0 },
          { row: 5, col: 0 }, { row: 5, col: 1 }, { row: 5, col: 2 }, { row: 5, col: 3 },
        ],
      },
    ],
  },
];

const hard: PuzzleDef[] = [
  {
    id: "h001",
    title: "Slow and steady",
    difficulty: "hard",
    rows: 6,
    cols: 6,
    grid: [
      ["I", "T", "D", "O", "E", "S"],
      ["T", "A", "M", "T", "O", "N"],
      ["T", "E", "R", "H", "O", "W"],
      ["O", "Y", "W", "O", "L", "S"],
      ["U", "G", "O", "C", "O", "N"],
      ["S", "U", "I", "C", "U", "F"],
    ],
    snakes: [
      {
        text: "IT DOES NOT MATTER HOW SLOW YOU GO",
        cells: [
          { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 }, { row: 0, col: 5 },
          { row: 1, col: 5 }, { row: 1, col: 4 }, { row: 1, col: 3 }, { row: 1, col: 2 }, { row: 1, col: 1 }, { row: 1, col: 0 },
          { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 }, { row: 2, col: 5 },
          { row: 3, col: 5 }, { row: 3, col: 4 }, { row: 3, col: 3 }, { row: 3, col: 2 }, { row: 3, col: 1 }, { row: 3, col: 0 },
          { row: 4, col: 0 }, { row: 4, col: 1 }, { row: 4, col: 2 },
        ],
      },
      {
        text: "CONFUCIUS",
        cells: [
          { row: 4, col: 3 }, { row: 4, col: 4 }, { row: 4, col: 5 },
          { row: 5, col: 5 }, { row: 5, col: 4 }, { row: 5, col: 3 },
          { row: 5, col: 2 }, { row: 5, col: 1 }, { row: 5, col: 0 },
        ],
      },
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
