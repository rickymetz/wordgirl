import { CELLS, N } from "./types";

/**
 * Letters are indices 0..N-1 into the puzzle's sorted letter string;
 * a grid is an Int8Array of CELLS with -1 for empty. Candidate sets
 * are N-bit masks.
 */
export type Grid = Int8Array;

const FULL = (1 << N) - 1;

export interface Units {
  regions: readonly number[];
  /** Per cell: the three unit ids it belongs to (row, N+col, 2N+region). */
  cellUnits: readonly (readonly [number, number, number])[];
  /** Per unit: its N cells. */
  unitCells: readonly (readonly number[])[];
}

export function buildUnits(regions: readonly number[]): Units {
  const cellUnits: [number, number, number][] = [];
  const unitCells: number[][] = Array.from({ length: 3 * N }, () => []);
  for (let c = 0; c < CELLS; c++) {
    const r = Math.floor(c / N);
    const col = c % N;
    const u: [number, number, number] = [r, N + col, 2 * N + regions[c]];
    cellUnits.push(u);
    for (const id of u) unitCells[id].push(c);
  }
  return { regions, cellUnits, unitCells };
}

/**
 * Word knowledge: the line's cells must spell one of `words` (each a
 * letter-index array in line order). Kept as a constraint rather than
 * a guess so the solver can say whether the words were NEEDED.
 */
export interface WordConstraint {
  cells: readonly number[];
  words: readonly (readonly number[])[];
}

function unitMasks(grid: Grid, units: Units): Int32Array {
  const used = new Int32Array(3 * N);
  for (let c = 0; c < CELLS; c++) {
    const v = grid[c];
    if (v < 0) continue;
    const [a, b, d] = units.cellUnits[c];
    used[a] |= 1 << v;
    used[b] |= 1 << v;
    used[d] |= 1 << v;
  }
  return used;
}

/** A word line is still satisfiable by at least one word, given current fills. */
function lineOpen(grid: Grid, wc: WordConstraint): boolean {
  outer: for (const w of wc.words) {
    for (let i = 0; i < wc.cells.length; i++) {
      const v = grid[wc.cells[i]];
      if (v >= 0 && v !== w[i]) continue outer;
    }
    return true;
  }
  return false;
}

function popcount(m: number): number {
  let n = 0;
  while (m) {
    m &= m - 1;
    n++;
  }
  return n;
}

/**
 * Count solutions up to `limit` (backtracking, fewest-candidates
 * first). `order` shuffles the value order so a caller can draw a
 * random full grid; `out` receives the first solution found.
 */
export function countSolutions(
  start: Grid,
  units: Units,
  words: readonly WordConstraint[] = [],
  limit = 2,
  order?: () => number,
  out?: Grid,
): number {
  const grid = Int8Array.from(start);
  const used = unitMasks(grid, units);
  // Givens that already clash can't be solved.
  for (let c = 0; c < CELLS; c++) {
    const v = grid[c];
    if (v < 0) continue;
    for (const u of units.cellUnits[c]) {
      let n = 0;
      for (const o of units.unitCells[u]) if (grid[o] === v) n++;
      if (n > 1) return 0;
    }
  }
  if (!words.every((w) => lineOpen(grid, w))) return 0;
  const cellWords: WordConstraint[][] = Array.from({ length: CELLS }, () => []);
  for (const w of words) for (const c of w.cells) cellWords[c].push(w);

  let found = 0;
  const rec = (): boolean => {
    let best = -1;
    let bestMask = 0;
    let bestCount = N + 1;
    for (let c = 0; c < CELLS; c++) {
      if (grid[c] >= 0) continue;
      const [a, b, d] = units.cellUnits[c];
      const m = FULL & ~(used[a] | used[b] | used[d]);
      const k = popcount(m);
      if (k < bestCount) {
        best = c;
        bestMask = m;
        bestCount = k;
        if (k <= 1) break;
      }
    }
    if (best < 0) {
      if (found === 0 && out) out.set(grid);
      found++;
      return found >= limit;
    }
    if (bestCount === 0) return false;
    const vals: number[] = [];
    for (let v = 0; v < N; v++) if (bestMask & (1 << v)) vals.push(v);
    if (order) {
      for (let i = vals.length - 1; i > 0; i--) {
        const j = Math.floor(order() * (i + 1));
        [vals[i], vals[j]] = [vals[j], vals[i]];
      }
    }
    const [a, b, d] = units.cellUnits[best];
    for (const v of vals) {
      grid[best] = v;
      if (cellWords[best].every((w) => lineOpen(grid, w))) {
        used[a] |= 1 << v;
        used[b] |= 1 << v;
        used[d] |= 1 << v;
        const stop = rec();
        used[a] &= ~(1 << v);
        used[b] &= ~(1 << v);
        used[d] &= ~(1 << v);
        if (stop) {
          grid[best] = -1;
          return true;
        }
      }
      grid[best] = -1;
    }
    return false;
  };
  rec();
  return found;
}

export interface LogicResult {
  solved: boolean;
  /** Placements made by sudoku singles. */
  singles: number;
  /** Placements only a word line could justify. */
  wordPlacements: number;
  /** Rounds of the deduction loop — a rough difficulty measure. */
  rounds: number;
}

/**
 * The player's toolkit, and nothing cleverer: naked singles, hidden
 * singles, and a WORD step — once a known-word line's fills and
 * candidates admit only one word (or every surviving word agrees on a
 * cell), fill it. No pencil-mark chains, so anything this solves is
 * within easy-medium reach. Every step is a sound deduction, so a
 * board this completes has exactly one solution under the same rules.
 */
export function logicSolve(
  start: Grid,
  units: Units,
  words: readonly WordConstraint[] = [],
): LogicResult {
  const grid = Int8Array.from(start);
  let singles = 0;
  let wordPlacements = 0;
  let rounds = 0;
  const cands = (): Int32Array => {
    const used = unitMasks(grid, units);
    const m = new Int32Array(CELLS);
    for (let c = 0; c < CELLS; c++) {
      if (grid[c] >= 0) continue;
      const [a, b, d] = units.cellUnits[c];
      m[c] = FULL & ~(used[a] | used[b] | used[d]);
    }
    return m;
  };
  for (;;) {
    rounds++;
    let progress = false;
    let m = cands();
    // Naked singles.
    for (let c = 0; c < CELLS; c++) {
      if (grid[c] < 0 && popcount(m[c]) === 1) {
        grid[c] = 31 - Math.clz32(m[c]);
        singles++;
        progress = true;
      }
    }
    if (progress) continue;
    // Hidden singles.
    for (const cells of units.unitCells) {
      for (let v = 0; v < N; v++) {
        let spot = -1;
        let n = 0;
        let placed = false;
        for (const c of cells) {
          if (grid[c] === v) placed = true;
          else if (grid[c] < 0 && m[c] & (1 << v)) {
            spot = c;
            n++;
          }
        }
        if (!placed && n === 1) {
          grid[spot] = v;
          singles++;
          progress = true;
          m = cands();
        }
      }
    }
    if (progress) continue;
    // Word step.
    for (const wc of words) {
      const live = wc.words.filter((w) =>
        wc.cells.every((c, i) =>
          grid[c] >= 0 ? grid[c] === w[i] : (m[c] & (1 << w[i])) !== 0,
        ),
      );
      if (live.length === 0) return { solved: false, singles, wordPlacements, rounds };
      wc.cells.forEach((c, i) => {
        if (grid[c] >= 0) return;
        const v = live[0][i];
        if (live.every((w) => w[i] === v)) {
          grid[c] = v;
          wordPlacements++;
          progress = true;
        }
      });
      if (progress) break;
    }
    if (!progress) break;
  }
  return { solved: grid.every((v) => v >= 0), singles, wordPlacements, rounds };
}

export const EMPTY = -1;
export function emptyGrid(): Grid {
  return new Int8Array(CELLS).fill(EMPTY);
}
