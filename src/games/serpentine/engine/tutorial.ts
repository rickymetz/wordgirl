import type { Cell, PuzzleDef } from "./types";

/**
 * The tutorial puzzle: a 3×4 grid whose hidden phrase describes itself.
 *
 *     T R H E
 *     A T L I
 *     C E E N        ->  TRACE THE LINE
 *
 * The corpus can't supply this. Its shortest line is 25 letters (a 5×5
 * board), which is a long first trace, and every corpus puzzle's layout is
 * randomised per date — a tutorial needs a FIXED path so the steps can
 * describe what is about to happen.
 *
 * The path is hand-laid with three diagonal moves, because that is the
 * rule players do not assume. It is not decoration: the next letter of the
 * phrase genuinely sits on the diagonal, so the trace cannot be completed
 * orthogonally.
 *
 * No poem, so no credit — the screen hides PoemCredit in tutorial mode.
 * `id` deliberately avoids the h###/p### namespace the corpus uses, since
 * saves compare puzzleId (the tutorial never saves, but a collision would
 * be a trap for whoever changes that).
 */
const TUTORIAL_PATH: Cell[] = [
  { row: 0, col: 0 }, // T
  { row: 0, col: 1 }, // R
  { row: 1, col: 0 }, // A  <- diagonal
  { row: 2, col: 0 }, // C
  { row: 2, col: 1 }, // E
  { row: 1, col: 1 }, // T
  { row: 0, col: 2 }, // H  <- diagonal
  { row: 0, col: 3 }, // E
  { row: 1, col: 2 }, // L  <- diagonal
  { row: 1, col: 3 }, // I
  { row: 2, col: 3 }, // N
  { row: 2, col: 2 }, // E
];

export const TUTORIAL_PUZZLE: PuzzleDef = {
  id: "tutorial",
  title: "Tutorial",
  author: "",
  difficulty: "haiku",
  rows: 3,
  cols: 4,
  grid: [
    ["T", "R", "H", "E"],
    ["A", "T", "L", "I"],
    ["C", "E", "E", "N"],
  ],
  text: "TRACE THE LINE",
  excerpt: false,
  titleSpoils: false,
  path: TUTORIAL_PATH,
  blocked: new Set<string>(),
};

/** Index into TUTORIAL_PATH of the first move that is diagonal. */
export const TUTORIAL_FIRST_DIAGONAL = 2;

/** How many steps the script has — the index that means "finished". */
export const TUTORIAL_STEP_COUNT = 4;

/**
 * Which step the board is on. Takes the fields it reads rather than the
 * reducer's GameState, so the engine stays free of state/ imports.
 */
export function tutorialStepIndex(s: {
  cells: readonly Cell[];
  solved: boolean;
}): number {
  if (s.solved) return TUTORIAL_STEP_COUNT;
  // Past the first diagonal: the player has taken a corner move.
  if (s.cells.length > TUTORIAL_FIRST_DIAGONAL) return 3;
  if (s.cells.length >= TUTORIAL_FIRST_DIAGONAL) return 2;
  if (s.cells.length >= 1) return 1;
  return 0;
}
