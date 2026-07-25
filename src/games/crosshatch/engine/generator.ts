import { seededRandom, shuffle } from "../../../lib/random";
import type { Dictionary } from "../../../lib/words/dictionary";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import { SHAPES } from "./shapes";
import type { Combo, CrosshatchPuzzle, Shape, Slot } from "./types";
import { cellKey, slotCells } from "./types";

/**
 * Accepted range for a day's DISTINCT WORD count — the player's unit
 * of progress. The floor keeps the hunt worth ranking; the ceiling
 * keeps "solve = 90% found" humane.
 */
export const MIN_WORDS = 10;
export const MAX_WORDS = 22;
/**
 * No single line may hold more than this many of the day's words —
 * over it, the endgame degenerates into listing one pattern's fills.
 */
export const MAX_SLOT_WORDS = 8;
/** Enumeration bails past this many combos — the grid is too loose. */
const ENUM_CAP = 200;
/** All but at most this many slots must admit ≥2 different words. */
const MAX_FIXED_SLOTS = 1;

const MAX_ATTEMPTS = 300;
const MAX_EXTRA_GIVENS = 6;

export function dailySeed(dateKey: string): string {
  return `daily:${dateKey}`;
}

export function practiceSeed(random: string): string {
  return `practice:${random}`;
}

export function gridSize(shape: Shape): { rows: number; cols: number } {
  let rows = 0;
  let cols = 0;
  for (const slot of shape.slots) {
    for (const c of slotCells(slot)) {
      rows = Math.max(rows, c.row + 1);
      cols = Math.max(cols, c.col + 1);
    }
  }
  return { rows, cols };
}

/**
 * Deterministic generation: pick a shape, fill it once (the "seed
 * solution"), lock a few of that solution's letters as givens, then
 * enumerate EVERY filling consistent with those givens. Add givens
 * until the combo count fits the band; reject and retry otherwise.
 * PRNG consumption order must stay stable across releases.
 */
export function generateCrosshatch(
  dict: Dictionary,
  seed: string,
): CrosshatchPuzzle {
  const rand = seededRandom(`crosshatch:v1:${seed}`);
  const index = buildLetterIndex(dict);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const shape = SHAPES[Math.floor(rand() * SHAPES.length)];
    const solution = solveRandomFill(shape, dict, rand, index);
    if (!solution) continue;

    // Letters of the seed solution laid on the grid.
    const solutionGrid = new Map<string, string>();
    shape.slots.forEach((slot, i) => {
      slotCells(slot).forEach((c, j) => {
        solutionGrid.set(cellKey(c.row, c.col), solution[i][j]);
      });
    });

    // Minimal givens: one cell per slot (a shared cell can cover both
    // of its slots). Random order so anchors vary day to day. Anchors
    // must never complete a line either — a shared-cell anchor can be
    // some OTHER slot's last blank.
    const givens = new Map<string, string>();
    let doomed = false;
    for (const slot of shuffle([...shape.slots], rand)) {
      const cells = slotCells(slot);
      if (cells.some((c) => givens.has(cellKey(c.row, c.col)))) continue;
      const safe = cells.filter(
        (c) => !wouldFullyLockSlot(shape, givens, cellKey(c.row, c.col)),
      );
      if (safe.length === 0) {
        doomed = true;
        break;
      }
      const pick = safe[Math.floor(rand() * safe.length)];
      const key = cellKey(pick.row, pick.col);
      givens.set(key, solutionGrid.get(key)!);
    }
    if (doomed) continue;
    const spareCells = shuffle(
      [...solutionGrid.keys()].filter((k) => !givens.has(k)),
      rand,
    );

    // Tighten with extra givens until the distinct-word count AND the
    // per-line share fit.
    for (let extra = 0; extra <= MAX_EXTRA_GIVENS; extra++) {
      const combos = enumerateCombos(shape, dict, givens, ENUM_CAP, index);
      const wordCount = new Set(combos.flat()).size;
      const slotVariety = shape.slots.map(
        (_, i) => new Set(combos.map((c) => c[i])).size,
      );
      const fattest = slotVariety.indexOf(Math.max(...slotVariety));
      if (
        combos.length >= ENUM_CAP ||
        wordCount > MAX_WORDS ||
        slotVariety[fattest] > MAX_SLOT_WORDS
      ) {
        // Prefer a given INSIDE the fattest line — it's the one that
        // needs constraining. Never lock a line completely.
        const fatKeys = new Set(
          slotCells(shape.slots[fattest]).map((c) => cellKey(c.row, c.col)),
        );
        let idx = spareCells.findIndex(
          (key) =>
            fatKeys.has(key) && !wouldFullyLockSlot(shape, givens, key),
        );
        if (idx === -1) {
          idx = spareCells.findIndex(
            (key) => !wouldFullyLockSlot(shape, givens, key),
          );
        }
        if (idx === -1) break;
        const next = spareCells.splice(idx, 1)[0];
        givens.set(next, solutionGrid.get(next)!);
        continue;
      }
      if (wordCount < MIN_WORDS) break; // over-tightened: retry
      if (fixedSlotCount(shape, combos) > MAX_FIXED_SLOTS) break;

      const { rows, cols } = gridSize(shape);
      return {
        seed,
        dictVersion: DICT_VERSION,
        shape,
        rows,
        cols,
        givens: Object.fromEntries(givens),
        combos,
      };
    }
  }

  throw new Error(`could not generate crosshatch for seed "${seed}"`);
}

/** Would adding a given at this cell leave some slot with no blanks? */
function wouldFullyLockSlot(
  shape: Shape,
  givens: ReadonlyMap<string, string>,
  key: string,
): boolean {
  const [row, col] = key.split(",").map(Number);
  return shape.slots.some((slot) => {
    const cells = slotCells(slot);
    if (!cells.some((c) => c.row === row && c.col === col)) return false;
    return cells.every((c) => {
      const k = cellKey(c.row, c.col);
      return k === key || givens.has(k);
    });
  });
}

/** Slots that admit only a single word across all combos. */
function fixedSlotCount(shape: Shape, combos: Combo[]): number {
  let fixed = 0;
  for (let i = 0; i < shape.slots.length; i++) {
    if (new Set(combos.map((c) => c[i])).size < 2) fixed++;
  }
  return fixed;
}

/**
 * Generation draws from the REQUIRED tier only. Crosshatch validates a
 * submission by combo membership, never by dictionary lookup, so every
 * word the generator enumerates is mandatory to solve and hintable —
 * there is no "accepted but optional" state to put a bonus word in.
 * Enumerating from `all` therefore made ENABLE obscurities (kagu, habu,
 * vatu) compulsory: two thirds of a day's list, by measurement.
 */
const TIER = "required" as const;

/**
 * Position-indexed word lookup: for each (length, position, letter),
 * the set of words with that letter at that position. Lets candidatesFor
 * intersect small sets instead of scanning the full bucket.
 */
type LetterIndex = ReadonlyMap<number, ReadonlyMap<number, ReadonlyMap<string, readonly string[]>>>;

// Keyed by the TIER INDEX, not the dictionary: an index built from one
// tier must never be served for another if this ever reads a second one.
const indexCache = new WeakMap<Dictionary[typeof TIER], LetterIndex>();

function buildLetterIndex(dict: Dictionary): LetterIndex {
  const tier = dict[TIER];
  const cached = indexCache.get(tier);
  if (cached) return cached;

  const idx = new Map<number, Map<number, Map<string, string[]>>>();
  for (const [len, bucket] of tier.buckets) {
    const byPos = new Map<number, Map<string, string[]>>();
    for (let pos = 0; pos < len; pos++) {
      byPos.set(pos, new Map());
    }
    for (const word of bucket) {
      for (let pos = 0; pos < len; pos++) {
        const ch = word[pos];
        const posMap = byPos.get(pos)!;
        let list = posMap.get(ch);
        if (!list) {
          list = [];
          posMap.set(ch, list);
        }
        list.push(word);
      }
    }
    idx.set(len, byPos);
  }
  indexCache.set(tier, idx);
  return idx;
}

/** Words that fit the slot against the current grid letters. */
function candidatesFor(
  slot: Slot,
  dict: Dictionary,
  grid: ReadonlyMap<string, string>,
  index: LetterIndex,
): string[] {
  const cells = slotCells(slot);
  const byPos = index.get(slot.len);
  if (!byPos) return [];

  let smallest: readonly string[] | undefined;
  const constraints: Array<{ pos: number; letter: string }> = [];
  for (let i = 0; i < cells.length; i++) {
    const fixed = grid.get(cellKey(cells[i].row, cells[i].col));
    if (fixed !== undefined) {
      constraints.push({ pos: i, letter: fixed });
      const matches = byPos.get(i)?.get(fixed) ?? [];
      if (!smallest || matches.length < smallest.length) {
        smallest = matches;
      }
    }
  }

  if (constraints.length === 0) {
    return [...(dict[TIER].buckets.get(slot.len) ?? [])];
  }

  const out: string[] = [];
  outer: for (const word of smallest!) {
    for (const { pos, letter } of constraints) {
      if (word[pos] !== letter) continue outer;
    }
    out.push(word);
  }
  return out;
}

/**
 * Depth-first enumeration over slots, most-constrained first. Combos
 * never repeat a word across slots (crossword convention). Fills come
 * from the required tier only — see TIER.
 */
export function enumerateCombos(
  shape: Shape,
  dict: Dictionary,
  givens: ReadonlyMap<string, string>,
  cap = Infinity,
  index?: LetterIndex,
): Combo[] {
  const idx = index ?? buildLetterIndex(dict);
  const grid = new Map(givens);
  const assigned = new Array<string | null>(shape.slots.length).fill(null);
  const used = new Set<string>();
  const out: Combo[] = [];

  const step = () => {
    if (out.length >= cap) return;
    let best = -1;
    let bestCands: string[] | null = null;
    for (let i = 0; i < shape.slots.length; i++) {
      if (assigned[i] !== null) continue;
      const cands = candidatesFor(shape.slots[i], dict, grid, idx);
      if (bestCands === null || cands.length < bestCands.length) {
        best = i;
        bestCands = cands;
        if (cands.length === 0) break;
      }
    }
    if (best === -1) {
      out.push(assigned.map((w) => w!));
      return;
    }
    const cells = slotCells(shape.slots[best]);
    for (const word of bestCands!) {
      if (used.has(word)) continue;
      const placed: string[] = [];
      for (let i = 0; i < cells.length; i++) {
        const key = cellKey(cells[i].row, cells[i].col);
        if (!grid.has(key)) {
          grid.set(key, word[i]);
          placed.push(key);
        }
      }
      assigned[best] = word;
      used.add(word);
      step();
      assigned[best] = null;
      used.delete(word);
      for (const key of placed) grid.delete(key);
      if (out.length >= cap) return;
    }
  };

  step();
  return out;
}

/** One random complete filling, or null if the shape can't be filled. */
function solveRandomFill(
  shape: Shape,
  dict: Dictionary,
  rand: () => number,
  index: LetterIndex,
): Combo | null {
  const grid = new Map<string, string>();
  const assigned = new Array<string | null>(shape.slots.length).fill(null);
  const used = new Set<string>();

  const step = (): boolean => {
    let best = -1;
    let bestCands: string[] | null = null;
    for (let i = 0; i < shape.slots.length; i++) {
      if (assigned[i] !== null) continue;
      const cands = candidatesFor(shape.slots[i], dict, grid, index);
      if (bestCands === null || cands.length < bestCands.length) {
        best = i;
        bestCands = cands;
        if (cands.length === 0) break;
      }
    }
    if (best === -1) return true;
    const cells = slotCells(shape.slots[best]);
    // Sample a bounded number of random candidates — plenty to find a
    // filling, and it keeps generation time flat.
    for (const word of shuffle(bestCands!, rand).slice(0, 40)) {
      if (used.has(word)) continue;
      const placed: string[] = [];
      for (let i = 0; i < cells.length; i++) {
        const key = cellKey(cells[i].row, cells[i].col);
        if (!grid.has(key)) {
          grid.set(key, word[i]);
          placed.push(key);
        }
      }
      assigned[best] = word;
      used.add(word);
      if (step()) return true;
      assigned[best] = null;
      used.delete(word);
      for (const key of placed) grid.delete(key);
    }
    return false;
  };

  return step() ? assigned.map((w) => w!) : null;
}
