import { seededRandom, shuffle } from "../../../lib/random";
import type { Dictionary } from "../../../lib/words/dictionary";
import type { Family, Geometry, Pairing } from "./families";
import { clueFor } from "./clues";
import { anagramFamilies, lineWords, pairings } from "./families";
import { BOX_LAYOUT } from "./layouts";
import { SCHEDULE, type ScheduledFamily } from "./schedule";
import type { Grid, WordConstraint } from "./solver";
import { buildUnits, countSolutions, emptyGrid, logicSolve } from "./solver";
import type { SixfoldPuzzle, Layout } from "./types";
import { CELLS } from "./types";

/** Full-grid draws per pairing before moving on. */
const DRAWS_PER_PAIRING = 4;

function toIndices(word: string, letters: string): number[] {
  return [...word].map((ch) => letters.indexOf(ch));
}

/**
 * How far sudoku carries the player before the words have to take over.
 *
 * The board is stripped of givens only while sudoku ALONE still leaves at
 * most `maxGrids` complete grids. A small cap keeps more givens, so plain
 * singles fill most of the board and then stall on one small ambiguity
 * that only a word settles — the tutorial's E/T rectangle, at day scale.
 * A larger cap strips further: the stall comes earlier and more of the
 * solve leans on the words. (The first spike minimized givens outright;
 * sudoku then placed nothing at all before the words, and every day
 * played as "type both words, then an easy sudoku".)
 */
export type Difficulty = "easy" | "medium" | "hard";

export const MAX_GRIDS: Record<Difficulty, number> = {
  easy: 2,
  medium: 6,
  hard: 24,
};

/**
 * Every daily plays at one level. A weekday curve (easy Mon–Tue) shipped
 * first and was dropped: at `easy`, singles fill ~78% of the board before
 * the stall and the opening is a walk. `medium` stalls at ~46%, so the
 * words carry more of every day. Tuning the whole game is this one line.
 */
export const DAILY_DIFFICULTY: Difficulty = "medium";

export function difficultyFor(dateKey: string): Difficulty {
  void dateKey;
  return DAILY_DIFFICULTY;
}

export interface Attempt {
  puzzle: SixfoldPuzzle;
  difficulty: Difficulty;
  /** Deduction rounds the player's toolkit needed — difficulty proxy. */
  rounds: number;
  wordPlacements: number;
  /** Cells sudoku singles place before stalling (no words). */
  preStall: number;
  /** Empty cells at the start. */
  empties: number;
  /** The toolkit can't finish without the clue. */
  clueNeeded: boolean;
}

function linesFor(
  pairing: Pairing,
  letters: string,
  hiddenWords: readonly string[],
  cluedWords: readonly string[],
): WordConstraint[] {
  const idx = (ws: readonly string[]) => ws.map((w) => toIndices(w, letters));
  return [
    { cells: pairing.hiddenCells, words: idx(hiddenWords) },
    { cells: pairing.cluedCells, words: idx(cluedWords) },
  ];
}

/**
 * One try at a board. Draw a random full grid with both word lines
 * fixed, then strip givens (random order) while ALL of these hold:
 *
 * 1. The player's toolkit finishes it: singles, the clue's word on its
 *    row, and a COMMON family word on the hidden line.
 * 2. It is unique even if both lines may be ANY dictionary anagram — so
 *    the other family word in the clued row always runs into a repeat,
 *    and a player who knows a rare anagram never finds a second grid.
 * 3. Sudoku alone leaves at most `maxGrids` grids (see `Difficulty`).
 *
 * Then keep it only if the words are load-bearing (sudoku alone leaves
 * two or more grids). With `requireClue`, also only if the CLUE is: the
 * toolkit, knowing just "both lines are family words", must stall.
 *
 * The daily never sets `requireClue`: it fights rule 2. Strict
 * uniqueness means the wrong anagram in the clued row always hits a
 * repeat somewhere, and a repeat is exactly what the toolkit sees without
 * reading the clue — measured, 1 board in 378 managed both. So the clue
 * is the fast road to the row, not the only one; `clueNeeded` is still
 * recorded so the measurement suite can watch it.
 */
export function tryBoard(
  letters: string,
  family: Family,
  pairing: Pairing,
  layout: Layout,
  allWords: readonly string[],
  rand: () => number,
  difficulty: Difficulty = "medium",
  requireClue = false,
): Attempt | null {
  const units = buildUnits(layout.regions);
  const start = emptyGrid();
  const hidden = toIndices(pairing.hiddenWord, letters);
  const clued = toIndices(pairing.cluedWord, letters);
  pairing.hiddenCells.forEach((c, i) => (start[c] = hidden[i]));
  pairing.cluedCells.forEach((c, i) => (start[c] = clued[i]));

  const full: Grid = emptyGrid();
  if (countSolutions(start, units, [], 1, rand, full) === 0) return null;

  const player = linesFor(pairing, letters, family.words, [pairing.cluedWord]);
  const noClue = linesFor(pairing, letters, family.words, family.words);
  const proof = linesFor(pairing, letters, allWords, allWords);
  const maxGrids = MAX_GRIDS[difficulty];

  const board = Int8Array.from(full);
  const order = shuffle(
    Array.from({ length: CELLS }, (_, i) => i),
    rand,
  );
  for (const c of order) {
    const v = board[c];
    board[c] = -1;
    const ok =
      logicSolve(board, units, player).solved &&
      countSolutions(board, units, proof, 2) === 1 &&
      countSolutions(board, units, [], maxGrids + 1) <= maxGrids;
    if (!ok) board[c] = v;
  }
  if (countSolutions(board, units, [], 2) < 2) return null;
  const clueNeeded = !logicSolve(board, units, noClue).solved;
  if (requireClue && !clueNeeded) return null;

  const result = logicSolve(board, units, player);
  const givens: number[] = [];
  for (let c = 0; c < CELLS; c++) if (board[c] >= 0) givens.push(c);
  return {
    puzzle: {
      letters,
      family: family.words,
      hiddenWord: pairing.hiddenWord,
      cluedWord: pairing.cluedWord,
      clue: clueFor(pairing.cluedWord).text,
      row: pairing.row,
      col: pairing.col,
      layoutId: layout.id,
      regions: layout.regions,
      solution: [...full].map((v) => letters[v]).join(""),
      givens,
    },
    difficulty,
    rounds: result.rounds,
    wordPlacements: result.wordPlacements,
    preStall: logicSolve(board, units, []).singles,
    empties: CELLS - givens.length,
    clueNeeded,
  };
}

/**
 * The geometries a family tries, in order: the diagonal when its words
 * allow one (only a handful of families do — see `pairings`), then an
 * across and a down, which every family allows.
 */
export function geometriesFor(family: Family): Geometry[] {
  return pairings(family, "diagonal").length > 0 ? ["diagonal", "cross"] : ["cross"];
}

/** A family's board for one seed, or null if no pairing makes the words matter. */
export function generateForFamily(
  dict: Dictionary,
  family: Family,
  seed: string,
  difficulty: Difficulty = "medium",
  geometries: readonly Geometry[] = geometriesFor(family),
  layout: Layout = BOX_LAYOUT,
): Attempt | null {
  const rand = seededRandom(seed);
  const known = lineWords(dict, family.letters);
  for (const geometry of geometries) {
    for (const p of shuffle(pairings(family, geometry), rand)) {
      for (let i = 0; i < DRAWS_PER_PAIRING; i++) {
        const a = tryBoard(family.letters, family, p, layout, known, rand, difficulty);
        if (a) return a;
      }
    }
  }
  return null;
}

const EPOCH_UTC = Date.UTC(2026, 0, 1);
/**
 * Seeds each cycle's shuffle. FROZEN: it keeps the working title the game
 * was built under ("anagrid") because changing it reshuffles every day,
 * and the schedule's pinned hash would move with it.
 */
const CYCLE_SEED = "anagrid:cycle:";

function dayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH_UTC) / 86_400_000);
}

/** Where a day falls in the schedule. */
export interface ScheduleSlot {
  cycle: number;
  /** Families in this cycle's order (their letters). */
  order: string[];
  /** The day's position in `order`. */
  index: number;
}

/**
 * Walk the cycles (see schedule.ts) to find a day's slot. Cycle c holds
 * the families with `since` <= c, shuffled by a seed that names only the
 * cycle, so a family appended with a future `since` changes nothing before
 * that cycle. Days before the epoch wrap into cycle 0.
 */
export function scheduleSlot(
  dateKey: string,
  schedule: readonly ScheduledFamily[] = SCHEDULE,
): ScheduleSlot {
  const d = dayIndex(dateKey);
  const poolFor = (c: number) =>
    schedule.filter((f) => f.since <= c).map((f) => f.letters);
  if (d < 0) {
    const order = shuffle(poolFor(0), seededRandom(`${CYCLE_SEED}0`));
    return { cycle: 0, order, index: ((d % order.length) + order.length) % order.length };
  }
  let cycle = 0;
  let start = 0;
  for (;;) {
    const pool = poolFor(cycle);
    if (d < start + pool.length) {
      const order = shuffle(pool, seededRandom(`${CYCLE_SEED}${cycle}`));
      return { cycle, order, index: d - start };
    }
    start += pool.length;
    cycle++;
  }
}

/**
 * Which clue a family shows on its `returns`-th appearance. Each family
 * starts its rotation at a fixed offset from its own letters: without it
 * every family would sit on the same rung together, and a whole cycle
 * (five months) would be cryptic days. With it, any cycle is roughly a
 * third cryptic, and every family still moves one rung per return.
 */
export function clueTurn(letters: string, returns: number): number {
  let h = 0;
  for (const ch of letters) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (h % 3) + returns;
}

/**
 * The day's board. A family that can't make a board today (none has yet —
 * every family is measured) is skipped for the next in the cycle's order.
 * The clue rotates with how many cycles the family has played through.
 */
export function dailyPuzzle(dict: Dictionary, dateKey: string): Attempt {
  const byLetters = new Map(anagramFamilies(dict).map((f) => [f.letters, f]));
  const { cycle, order, index } = scheduleSlot(dateKey);
  for (let k = 0; k < order.length; k++) {
    const family = byLetters.get(order[(index + k) % order.length]);
    if (!family) continue;
    const a = generateForFamily(dict, family, `daily:${dateKey}:${cycle}:${k}`, difficultyFor(dateKey));
    if (!a) continue;
    const since = SCHEDULE.find((f) => f.letters === family.letters)?.since ?? 0;
    return withClue(a, clueTurn(family.letters, cycle - since));
  }
  throw new Error(`sixfold: no family makes a board for ${dateKey}`);
}

function withClue(a: Attempt, turn: number): Attempt {
  const clue = clueFor(a.puzzle.cluedWord, turn);
  return {
    ...a,
    puzzle: {
      ...a.puzzle,
      clue: clue.text,
      ...(clue.cryptic && { clueCryptic: true, clueHow: clue.how }),
    },
  };
}

/** A practice seed: its own namespace, so it can never replay a daily. */
export function practiceSeed(random: string, difficulty: Difficulty = DAILY_DIFFICULTY): string {
  return difficulty === DAILY_DIFFICULTY ? `practice:${random}` : `practice:${difficulty}:${random}`;
}

/**
 * An unsaved practice board: any scheduled family, at the daily's
 * difficulty unless asked otherwise, with any of its word's three clues.
 */
export function practicePuzzle(
  dict: Dictionary,
  seed: string,
  difficulty: Difficulty = DAILY_DIFFICULTY,
): Attempt {
  const rand = seededRandom(seed);
  const byLetters = new Map(anagramFamilies(dict).map((f) => [f.letters, f]));
  const order = shuffle(
    SCHEDULE.map((f) => f.letters),
    rand,
  );
  const turn = Math.floor(rand() * 3);
  for (const letters of order) {
    const family = byLetters.get(letters);
    if (!family) continue;
    const a = generateForFamily(dict, family, `${seed}:${letters}`, difficulty);
    if (a) return withClue(a, turn);
  }
  throw new Error(`sixfold: no family makes a practice board for ${seed}`);
}
