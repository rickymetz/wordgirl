import { seededRandom } from "../../../lib/random";
import { DICT_VERSION, type Dictionary } from "../../../lib/words/dictionary";
import { buildLexicon, lexiconItems } from "./lexicon";
import {
  fitsIn,
  multisetSize,
  subtract,
  toMultiset,
  type Multiset,
  type Puzzle,
  type RowDef,
} from "./types";

/** Daily bank size band: ~3-4 rows a day. Measured over 90 dailies,
 * this band cuts staple repetition sharply vs the original 12-16
 * (top item in 37% of days' solution spaces vs 52%) while keeping
 * generation robust (0 failures, ≤26 attempts). */
const MIN_LETTERS = 8;
const MAX_LETTERS = 12;
/** A day must decompose in ≥2 ways with ≥2 distinct row counts (real
 * strategy choice); the generator prefers ≥3 solutions. */
const MIN_SOLUTIONS = 2;
const PREFERRED_SOLUTIONS = 3;
const SOLUTION_CAP = 40;
const MAX_ATTEMPTS = 400;

// v2: bank band reduced to 8-12 (repetition tuning, pre-release).
export function dailySeed(dateKey: string): string {
  return `pierglass:v2:daily:${dateKey}`;
}

export function practiceSeed(random: string): string {
  return `pierglass:v2:practice:${random}`;
}

/**
 * Every distinct full decomposition of the bank into lexicon rows —
 * unordered, no row repeated (a word appears once per day).
 */
export function solveBank(
  bank: Multiset,
  items: RowDef[],
  cap = SOLUTION_CAP,
): RowDef[][] {
  // Parse each item's cost once — the walk visits thousands of nodes.
  const costs = items.map((i) => toMultiset(i.cost));
  const found: RowDef[][] = [];
  const chosen: RowDef[] = [];
  const walk = (left: Multiset, startIdx: number) => {
    if (found.length >= cap) return;
    if (multisetSize(left) === 0) {
      found.push([...chosen]);
      return;
    }
    for (let i = startIdx; i < items.length; i++) {
      if (fitsIn(costs[i], left)) {
        chosen.push(items[i]);
        walk(subtract(left, costs[i]), i + 1);
        chosen.pop();
        if (found.length >= cap) return;
      }
    }
  };
  walk(bank, 0);
  return found;
}

/**
 * The fewest rows that clear the bank — the day's par.
 *
 * Iterative deepening from below, bounded above by `upper` (the best
 * row count the caller already has a solution for). Almost always the
 * enumeration's minimum IS par, so the search only has to refute the
 * counts beneath it, and refuting k=1 or k=2 is near-instant: the
 * letters-vs-budget bound kills a branch as soon as what's left can't
 * fit in the rows remaining.
 */
export function minRows(bank: Multiset, items: RowDef[], upper: number): number {
  const costs = items.map((i) => toMultiset(i.cost));
  const widest = items.reduce((m, i) => Math.max(m, i.cost.length), 0);
  const search = (left: Multiset, startIdx: number, budget: number): boolean => {
    const n = multisetSize(left);
    if (n === 0) return true;
    if (budget === 0 || n > budget * widest) return false;
    for (let i = startIdx; i < items.length; i++) {
      if (
        fitsIn(costs[i], left) &&
        search(subtract(left, costs[i]), i + 1, budget - 1)
      ) {
        return true;
      }
    }
    return false;
  };
  for (let k = 1; k < upper; k++) if (search(bank, 0, k)) return k;
  return upper;
}

interface Candidate {
  bank: string[];
  seedRows: string[];
  solutions: RowDef[][];
  rowCounts: number[];
}

function attempt(
  rng: () => number,
  items: RowDef[],
  big: RowDef[],
): Candidate | null {
  // Seed with one 4+-letter pair so every day has a meaty row, then
  // fill with random distinct items up to the size band.
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
  const seed: RowDef[] = [pick(big)];
  let size = seed[0].cost.length;
  let guard = 0;
  while (size < MIN_LETTERS && guard++ < 60) {
    const it = pick(items);
    if (!seed.includes(it) && size + it.cost.length <= MAX_LETTERS) {
      seed.push(it);
      size += it.cost.length;
    }
  }
  if (size < MIN_LETTERS) return null;

  const bank = seed
    .flatMap((i) => [...i.cost])
    .sort();
  const solutions = solveBank(toMultiset(bank), items);
  const rowCounts = [...new Set(solutions.map((s) => s.length))].sort(
    (a, b) => a - b,
  );
  if (solutions.length < MIN_SOLUTIONS || rowCounts.length < 2) return null;
  return { bank, seedRows: seed.map((i) => i.place), solutions, rowCounts };
}

export function generatePierglass(
  dict: Dictionary,
  seed: string,
  // Callers that already built the lexicon (the game hook memoizes it)
  // pass their items to skip a second full lexicon build at mount.
  items: RowDef[] = lexiconItems(buildLexicon(dict)),
): Puzzle {
  const rng = seededRandom(seed);
  const big = items.filter((i) => i.kind === "pair" && i.cost.length >= 4);

  let fallback: Candidate | null = null;
  for (let t = 0; t < MAX_ATTEMPTS; t++) {
    const c = attempt(rng, items, big);
    if (!c) continue;
    if (c.solutions.length >= PREFERRED_SOLUTIONS) {
      return toPuzzle(seed, c, items);
    }
    fallback ??= c; // meets the ≥2 band; keep looking for ≥3
  }
  if (fallback) return toPuzzle(seed, fallback, items);
  throw new Error(`pierglass generator exhausted attempts for ${seed}`);
}

function toPuzzle(seed: string, c: Candidate, items: RowDef[]): Puzzle {
  return {
    seed,
    dictVersion: DICT_VERSION,
    bank: c.bank,
    seedRows: c.seedRows,
    solutionCount: c.solutions.length,
    rowCounts: c.rowCounts,
    // Once, on the chosen candidate only — never inside `attempt`,
    // which runs up to MAX_ATTEMPTS times.
    parRows: minRows(toMultiset(c.bank), items, c.rowCounts[0]),
  };
}
