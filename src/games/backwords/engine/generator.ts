import { mulberry32, xmur3 } from "../../../lib/random";
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

/** Daily bank size band. */
const MIN_LETTERS = 12;
const MAX_LETTERS = 16;
/** A day must decompose in ≥2 ways with ≥2 distinct row counts (real
 * strategy choice); the generator prefers ≥3 solutions. */
const MIN_SOLUTIONS = 2;
const PREFERRED_SOLUTIONS = 3;
const SOLUTION_CAP = 40;
const MAX_ATTEMPTS = 400;

export function dailySeed(dateKey: string): string {
  return `backwords:v1:daily:${dateKey}`;
}

export function practiceSeed(random: string): string {
  return `backwords:v1:practice:${random}`;
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
  const found: RowDef[][] = [];
  const chosen: RowDef[] = [];
  const walk = (left: Multiset, startIdx: number) => {
    if (found.length >= cap) return;
    if (multisetSize(left) === 0) {
      found.push([...chosen]);
      return;
    }
    for (let i = startIdx; i < items.length; i++) {
      if (fitsIn(toMultiset(items[i].cost), left)) {
        chosen.push(items[i]);
        walk(subtract(left, toMultiset(items[i].cost)), i + 1);
        chosen.pop();
        if (found.length >= cap) return;
      }
    }
  };
  walk(bank, 0);
  return found;
}

interface Candidate {
  bank: string[];
  seedRows: string[];
  solutions: RowDef[][];
  rowCounts: number[];
}

function attempt(rng: () => number, items: RowDef[]): Candidate | null {
  // Seed with one 4+-letter pair so every day has a meaty row, then
  // fill with random distinct items up to the size band.
  const big = items.filter((i) => i.kind === "pair" && i.cost.length >= 4);
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

export function generateBackwords(dict: Dictionary, seed: string): Puzzle {
  const rng = mulberry32(xmur3(seed)());
  const items = lexiconItems(buildLexicon(dict));

  let fallback: Candidate | null = null;
  for (let t = 0; t < MAX_ATTEMPTS; t++) {
    const c = attempt(rng, items);
    if (!c) continue;
    if (c.solutions.length >= PREFERRED_SOLUTIONS) {
      return toPuzzle(seed, c);
    }
    fallback ??= c; // meets the ≥2 band; keep looking for ≥3
  }
  if (fallback) return toPuzzle(seed, fallback);
  throw new Error(`backwords generator exhausted attempts for ${seed}`);
}

function toPuzzle(seed: string, c: Candidate): Puzzle {
  return {
    seed,
    dictVersion: DICT_VERSION,
    bank: c.bank,
    seedRows: c.seedRows,
    solutionCount: c.solutions.length,
    rowCounts: c.rowCounts,
  };
}
