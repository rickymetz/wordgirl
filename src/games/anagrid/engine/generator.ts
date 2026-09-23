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
 * What uniqueness is proven under. `clue`: the clued row is known
 * (the clue has one answer) and the hidden line is any dictionary
 * anagram. `open`: neither line is known beyond "some anagram" — the
 * stricter bar, for a player who can't crack the clue.
 */
export type UniquenessProof = "clue" | "open";

export interface Attempt {
  puzzle: AnagridPuzzle;
  /** Deduction rounds the player's toolkit needed — difficulty proxy. */
  rounds: number;
  wordPlacements: number;
}

/**
 * One try at a board: draw a random full grid with both word lines
 * fixed, strip givens while the player's toolkit (singles + word
 * lines) still finishes it, then keep it only if sudoku rules ALONE
 * leave more than one grid — the words must be load-bearing.
 */
export function tryBoard(
  letters: string,
  family: Family,
  pairing: Pairing,
  layout: Layout,
  allWords: readonly string[],
  rand: () => number,
  proof: UniquenessProof = "clue",
): Attempt | null {
  const units = buildUnits(layout.regions);
  const start = emptyGrid();
  const hidden = toIndices(pairing.hiddenWord, letters);
  const clued = toIndices(pairing.cluedWord, letters);
  pairing.hiddenCells.forEach((c, i) => (start[c] = hidden[i]));
  pairing.cluedCells.forEach((c, i) => (start[c] = clued[i]));

  const full: Grid = emptyGrid();
  if (countSolutions(start, units, [], 1, rand, full) === 0) return null;

  const idx = (ws: readonly string[]) => ws.map((w) => toIndices(w, letters));
  // What the player reasons with: the clue gives its line, and the
  // hidden line is one of the family's COMMON words.
  const player: WordConstraint[] = [
    { cells: pairing.hiddenCells, words: idx(family.words) },
    { cells: pairing.cluedCells, words: idx([pairing.cluedWord]) },
  ];
  // What the grid must be unique under: the hidden line may be ANY
  // dictionary anagram (a player who knows DEASIL mustn't find a
  // second grid), and under "open" the clued line may be too.
  const all = idx(allWords);
  const proofLines: WordConstraint[] = [
    { cells: pairing.hiddenCells, words: all },
    { cells: pairing.cluedCells, words: proof === "clue" ? idx([pairing.cluedWord]) : all },
  ];

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
      countSolutions(board, units, proofLines, 2) === 1;
    if (!ok) board[c] = v;
  }
  if (countSolutions(board, units, [], 2) < 2) return null;

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
    rounds: result.rounds,
    wordPlacements: result.wordPlacements,
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
  layout: Layout = BOX_LAYOUT,
  proof: UniquenessProof = "clue",
  geometries: readonly Geometry[] = geometriesFor(family),
): Attempt | null {
  const rand = seededRandom(seed);
  const known = lineWords(dict, family.letters);
  for (const geometry of geometries) {
    for (const p of shuffle(pairings(family, geometry), rand)) {
      for (let i = 0; i < DRAWS_PER_PAIRING; i++) {
        const a = tryBoard(family.letters, family, p, layout, known, rand, proof);
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
    const a = generateForFamily(dict, family, `daily:${dateKey}:${cycle}:${k}`);
    if (a) return a;
  }
  throw new Error(`anagrid: no family makes a board for ${dateKey}`);
}
