import { seededRandom, shuffle } from "../../../lib/random";
import type { Dictionary } from "../../../lib/words/dictionary";
import type { Family, Geometry, Pairing } from "./families";
import { anagramFamilies, lineWords, pairings } from "./families";
import { BOX_LAYOUT } from "./layouts";
import type { Grid, WordConstraint } from "./solver";
import { buildUnits, countSolutions, emptyGrid, logicSolve } from "./solver";
import type { AnagridPuzzle, Layout } from "./types";
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
 * The weekly curve: easy early in the week, hardest Friday and Saturday,
 * Sunday back in the middle. Keyed by the LOCAL date's weekday, computed
 * from the dateKey itself so every timezone agrees on a date's puzzle.
 */
export function difficultyFor(dateKey: string): Difficulty {
  const [y, m, d] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return (["medium", "easy", "easy", "medium", "medium", "hard", "hard"] as const)[weekday];
}

export interface Attempt {
  puzzle: AnagridPuzzle;
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

function dayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH_UTC) / 86_400_000);
}

/**
 * Families cycle in one fixed shuffled order, so a family returns
 * exactly `families.length` days later with a fresh board (the cycle
 * number is in the board seed). A family that can't make a
 * word-dependent board today is skipped for the next in line.
 */
export function dailyPuzzle(dict: Dictionary, dateKey: string): Attempt {
  const families = shuffle(anagramFamilies(dict), seededRandom("anagrid:families"));
  const F = families.length;
  const d = dayIndex(dateKey);
  const cycle = Math.floor(d / F);
  for (let k = 0; k < F; k++) {
    const family = families[(((d + k) % F) + F) % F];
    const a = generateForFamily(
      dict,
      family,
      `daily:${dateKey}:${cycle}:${k}`,
      difficultyFor(dateKey),
    );
    if (a) return a;
  }
  throw new Error(`anagrid: no family makes a board for ${dateKey}`);
}
