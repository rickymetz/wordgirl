import type { Cell, PuzzleDef } from "./types";

/**
 * The tutorial puzzle: a 3×4 grid whose hidden phrase describes itself.
 *
 *     T R E L
 *     A H T I
 *     C E E N        ->  TRACE THE LINE
 *
 * The corpus can't supply this. Its shortest line is 25 letters (a 5×5
 * board), which is a long first trace, and every corpus puzzle's layout is
 * randomised per date — a tutorial needs a FIXED path so the steps can
 * describe what is about to happen.
 *
 * Two rules are hand-laid into it, because they are the two the grid alone
 * never suggests:
 *
 * 1. THE DIAGONAL. Three moves are diagonal, and they are not decoration:
 *    the next letter of the phrase genuinely sits on the corner, so the
 *    trace cannot be completed orthogonally.
 * 2. THE CROSSING. At `TUTORIAL_BLOCKED_TWIN` the line stands on H with
 *    exactly two cells left touching it — and BOTH show an E, the letter
 *    it needs. One of them, (2,2), sits across the diagonal already drawn
 *    from (2,1) to (1,2), so taking it would cut through the line and the
 *    reducer refuses it. The other, (0,2), is the solution. The blocked
 *    cell is not a dead end either: the trace comes back for it last, the
 *    long way round.
 *
 * That second lesson is why this layout and not another. A rule that only
 * ever refuses a WRONG move is invisible until it refuses one, and the
 * tutorial is the one screen with no hints to fall back on — so the board
 * has to stage the refusal rather than describe it.
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
  { row: 1, col: 2 }, // T  <- diagonal, the arm that closes (1,1) -> (2,2)
  { row: 1, col: 1 }, // H
  { row: 0, col: 2 }, // E  <- diagonal, the open twin of the two Es
  { row: 0, col: 3 }, // L
  { row: 1, col: 3 }, // I
  { row: 2, col: 3 }, // N
  { row: 2, col: 2 }, // E  <- the blocked twin, reached the long way round
];

export const TUTORIAL_PUZZLE: PuzzleDef = {
  id: "tutorial",
  title: "Tutorial",
  author: "",
  difficulty: "haiku",
  rows: 3,
  cols: 4,
  grid: [
    ["T", "R", "E", "L"],
    ["A", "H", "T", "I"],
    ["C", "E", "E", "N"],
  ],
  text: "TRACE THE LINE",
  excerpt: false,
  titleSpoils: false,
  path: TUTORIAL_PATH,
  blocked: new Set<string>(),
};

/**
 * Path length at which the NEXT move is the first diagonal one.
 *
 * Both this and `TUTORIAL_BLOCKED_TWIN` are read the same way: the number
 * of cells traced when the move about to be made is the one the step
 * describes — so each is the index of the cell that move places.
 */
export const TUTORIAL_FIRST_DIAGONAL = 2;

/**
 * Path length at which the next letter shows on two touching cells, one of
 * them closed by the line's own diagonal. See the crossing lesson above.
 */
export const TUTORIAL_BLOCKED_TWIN = 7;

/**
 * How many steps the script has — the index that means "finished".
 *
 * Four: the opening beat ("tap a cell to begin") went when the puzzle
 * started giving the first letter, and the crossing lesson took its place
 * at the other end of the trace.
 */
export const TUTORIAL_STEP_COUNT = 4;

/**
 * True when the traced cells are EXACTLY the solution's first N cells.
 *
 * The reducer accepts any adjacent move — it only checks the phrase at the
 * end — so a player can wander off down a route that spells nothing. The
 * step script has to know the difference, because two of its steps make a
 * claim about where the next letter is.
 */
export function onSolutionPath(cells: readonly Cell[]): boolean {
  if (cells.length > TUTORIAL_PATH.length) return false;
  return cells.every(
    (c, i) => c.row === TUTORIAL_PATH[i].row && c.col === TUTORIAL_PATH[i].col,
  );
}

/**
 * Which step the board is on. Takes the fields it reads rather than the
 * reducer's GameState, so the engine stays free of state/ imports.
 */
export function tutorialStepIndex(s: {
  cells: readonly Cell[];
  solved: boolean;
}): number {
  if (s.solved) return TUTORIAL_STEP_COUNT;
  const n = s.cells.length;
  // Both position-aware steps tell the player where the next letter is, so
  // they may only appear when that is actually true: on the solution path,
  // with exactly the cells before the move traced. Anywhere else —
  // including off down a wrong route, and including the untouched board,
  // which is the given letter alone — "tap a placed cell to undo back to
  // it" is the instruction that helps, so hold at that step instead.
  if (!onSolutionPath(s.cells)) return 0;
  if (n < TUTORIAL_FIRST_DIAGONAL) return 0;
  if (n === TUTORIAL_FIRST_DIAGONAL) return 1;
  // The crossing step stays up for the rest of the trace rather than
  // handing back to "cover every letter" — the blocked cell is still on
  // the board, waiting to be reached the long way round.
  if (n >= TUTORIAL_BLOCKED_TWIN) return 3;
  return 2;
}
