/**
 * Hint targeting. A hint reveals one cell of a solution route ON THE
 * GRID; the player only benefits from cells their snake has not already
 * reached, so targeting is always relative to their progress.
 *
 * Hints no longer prefer the first letter of each word. Those letters
 * are given for free in the readout (`wordStartIndices` in phrase.ts),
 * so what a hint adds is a POSITION — and the position worth paying for
 * is the next one the player has to find, which is exactly where they
 * are stuck. That includes a word's opening cell: knowing the letter is
 * a W says nothing about which of the eight neighbours it is.
 *
 * Targeting follows the PLAYER'S route, not the stored one. About a
 * third of boards spell their phrase along more than one path, and
 * `checkSolved` accepts any of them — so a player on an alternate route
 * is not wrong, and a hint read off `puzzle.path` would point at a cell
 * their snake already covers (invisible) or one nowhere near its head.
 * Instead a hint extends whatever the player has drawn into SOME full
 * route (the stored one first, when it still fits) and reveals the next
 * cell of that.
 */

import {
  areAdjacent,
  cellKey,
  stepKey,
  straddledCells,
  type Cell,
  type PuzzleDef,
} from "./types";

/** The phrase's letters, in the order a route must spell them. */
function phraseLetters(puzzle: PuzzleDef): string {
  return puzzle.text.replace(/[^A-Z]/g, "");
}

const NEIGHBOUR_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

/**
 * A full solution route that begins with `prefix`, or null when no route
 * does. A route spells the phrase through adjacent, unrepeated, live
 * cells and never crosses itself — the same rules the reducer enforces
 * move by move, so any route returned here is one the player can draw.
 *
 * The stored `puzzle.path` is tried first at every step, so a prefix of
 * it completes to exactly it. Boards are at most 8×10 and every step is
 * pinned to one letter, so a plain depth-first search is quick.
 */
export function completeRoute(
  puzzle: PuzzleDef,
  prefix: readonly Cell[],
): Cell[] | null {
  const letters = phraseLetters(puzzle);
  if (prefix.length > letters.length) return null;

  const live = (c: Cell) =>
    c.row >= 0 &&
    c.row < puzzle.rows &&
    c.col >= 0 &&
    c.col < puzzle.cols &&
    !puzzle.blocked.has(cellKey(c));

  const route: Cell[] = [];
  const visited = new Set<string>();
  const steps = new Set<string>();

  // Replay the prefix under the same rules the search extends by.
  for (let i = 0; i < prefix.length; i++) {
    const c = prefix[i];
    const key = cellKey(c);
    if (!live(c) || visited.has(key)) return null;
    if (puzzle.grid[c.row][c.col] !== letters[i]) return null;
    if (i > 0) {
      const prev = prefix[i - 1];
      if (!areAdjacent(prev, c) || crosses(steps, prev, c)) return null;
      steps.add(stepKey(prev, c));
    }
    visited.add(key);
    route.push(c);
  }

  const extend = (): boolean => {
    const i = route.length;
    if (i === letters.length) return true;
    const tail = route[i - 1];
    for (const next of candidates(puzzle, tail, i)) {
      const key = cellKey(next);
      if (!live(next) || visited.has(key)) continue;
      if (puzzle.grid[next.row][next.col] !== letters[i]) continue;
      if (crosses(steps, tail, next)) continue;
      const step = stepKey(tail, next);
      visited.add(key);
      steps.add(step);
      route.push(next);
      if (extend()) return true;
      route.pop();
      steps.delete(step);
      visited.delete(key);
    }
    return false;
  };

  if (route.length === 0) {
    // Pathless start: any cell carrying the first letter may open.
    if (letters.length === 0) return route;
    const starts: Cell[] = puzzle.path.length > 0 ? [puzzle.path[0]] : [];
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) starts.push({ row: r, col: c });
    }
    for (const s of starts) {
      const key = cellKey(s);
      if (!live(s) || visited.has(key)) continue;
      if (puzzle.grid[s.row][s.col] !== letters[0]) continue;
      visited.add(key);
      route.push(s);
      if (extend()) return route;
      route.pop();
      visited.delete(key);
    }
    return null;
  }

  return extend() ? route : null;
}

/** The stored path's cell for step `i` first, then the rest in order. */
function* candidates(puzzle: PuzzleDef, tail: Cell, i: number): Generator<Cell> {
  const preferred = puzzle.path[i];
  if (preferred && areAdjacent(tail, preferred)) yield preferred;
  for (const [dr, dc] of NEIGHBOUR_DELTAS) {
    const c = { row: tail.row + dr, col: tail.col + dc };
    if (preferred && c.row === preferred.row && c.col === preferred.col) continue;
    yield c;
  }
}

function crosses(steps: ReadonlySet<string>, a: Cell, b: Cell): boolean {
  const straddled = straddledCells(a, b);
  return !!straddled && steps.has(stepKey(straddled[0], straddled[1]));
}

/**
 * How many of the player's cells, from the start, still lie on some full
 * route: `cells.length` when the whole snake can still be completed,
 * less when it has taken a wrong turn. Extendability is monotone (a
 * prefix of an extendable path is extendable), so this binary-searches.
 */
export function correctPrefixLength(
  puzzle: PuzzleDef,
  cells: readonly Cell[],
): number {
  if (completeRoute(puzzle, cells)) return cells.length;
  let lo = 0; // known extendable (the empty prefix, for any solvable board)
  let hi = cells.length; // known not
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (completeRoute(puzzle, cells.slice(0, mid))) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** A revealed cell: its grid key and its place in the phrase. */
export interface HintedCell {
  key: string;
  index: number;
}

/**
 * What the next hint should do.
 *
 * - `reveal`: the snake can still be completed; show `cell`, the first
 *   cell of a completing route past the snake's head that is not already
 *   hinted. `index` is its place in the phrase, for the readout.
 * - `backtrack`: the snake has gone wrong. Its first `keep` cells lie on
 *   a route; cell `keep` (0-based) is the first wrong one. Nothing on the
 *   grid can mark a route cell the snake is sitting on, so the hint says
 *   where to back up to instead.
 * - null: every remaining cell is already hinted, or the board is solved.
 */
export type HintTarget =
  | { kind: "reveal"; cell: Cell; key: string; index: number }
  | { kind: "backtrack"; keep: number };

export function nextHint(
  puzzle: PuzzleDef,
  cells: readonly Cell[],
  hinted: ReadonlySet<string>,
): HintTarget | null {
  const route = completeRoute(puzzle, cells);
  if (!route) {
    return { kind: "backtrack", keep: correctPrefixLength(puzzle, cells) };
  }
  for (let i = cells.length; i < route.length; i++) {
    const key = cellKey(route[i]);
    if (!hinted.has(key)) return { kind: "reveal", cell: route[i], key, index: i };
  }
  return null;
}

/**
 * Rebuild the hinted cells from a saved COUNT. Only the count is
 * persisted, so replay the same targeting rule against the restored
 * snake — that reproduces hints the player can still see, rather than
 * the first N cells of the phrase. A snake restored off-route has no
 * cells to reveal ahead of it; the count is kept (it is what the share
 * reports), and the hints come back once the player backs up.
 */
export function replayHints(
  puzzle: PuzzleDef,
  cells: readonly Cell[],
  count: number,
): HintedCell[] {
  const hinted: HintedCell[] = [];
  const keys = new Set<string>();
  for (let n = 0; n < count; n++) {
    const target = nextHint(puzzle, cells, keys);
    if (!target || target.kind !== "reveal") break;
    keys.add(target.key);
    hinted.push({ key: target.key, index: target.index });
  }
  return hinted;
}
