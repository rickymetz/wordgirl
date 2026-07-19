import type { Dictionary } from "../../../lib/words/dictionary";
import { seededRandom, shuffle } from "../../../lib/random";
import { SHAPES } from "./boards";
import type {
  BoardShape,
  Cell,
  Difficulty,
  DominoPiece,
  PlacedDomino,
  Slot,
  DoubletPuzzle,
} from "./types";
import { cellKey, dominoCells } from "./types";
import { DICT_VERSION } from "../../../lib/words/dictionary";

const MAX_ATTEMPTS = 200;
const MAX_FILL_ATTEMPTS = 80;
const MAX_SOLVE_NODES = 500_000;
const MAX_GENERATION_MS = 500;

export function dailySeed(dateKey: string, difficulty: Difficulty): string {
  return `daily:${difficulty}:${dateKey}`;
}

export function practiceSeed(random: string, difficulty: Difficulty): string {
  return `practice:${difficulty}:${random}`;
}

export function generateDoublet(
  dict: Dictionary,
  seed: string,
): DoubletPuzzle {
  const difficulty = parseDifficulty(seed);
  const rand = seededRandom("doublet:v1:" + seed);
  const shapes = SHAPES[difficulty];

  const deadline = Date.now() + MAX_GENERATION_MS;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (Date.now() > deadline) break;
    const shapeIdx = Math.floor(rand() * shapes.length);
    const shape = shapes[shapeIdx];
    const slots = findSlots(shape);

    const fill = fillGrid(shape, slots, dict, rand);
    if (!fill) continue;

    const tiling = findTiling(shape, rand, deadline);
    if (!tiling) continue;

    const dominoes: DominoPiece[] = tiling.map(([c1, c2], i) => ({
      id: i,
      letters: [
        fill.get(cellKey(c1.row, c1.col))!,
        fill.get(cellKey(c2.row, c2.col))!,
      ],
    }));

    const solution: PlacedDomino[] = tiling.map(([c1, c2], i) => ({
      dominoId: i,
      anchor: c1,
      orientation: (c1.row === c2.row ? 0 : 1) as 0 | 1,
    }));

    const solutionCount = countSolutions(shape, slots, dominoes, dict, 2, deadline);
    if (solutionCount !== 1) continue;

    const shuffledDominoes = shuffle(
      dominoes.map((d) => ({ ...d })),
      rand,
    );
    shuffledDominoes.forEach((d, i) => (d.id = i));

    const solutionMap = new Map<number, PlacedDomino>();
    for (const sp of solution) {
      const origLetters = dominoes[sp.dominoId].letters;
      const newDomino = shuffledDominoes.find(
        (d) =>
          d.letters[0] === origLetters[0] &&
          d.letters[1] === origLetters[1] &&
          !solutionMap.has(d.id),
      );
      if (newDomino) {
        solutionMap.set(newDomino.id, {
          ...sp,
          dominoId: newDomino.id,
        });
      }
    }

    return {
      seed,
      dictVersion: DICT_VERSION,
      difficulty,
      board: shape,
      slots,
      dominoes: shuffledDominoes,
      solution: [...solutionMap.values()],
    };
  }

  const fallback = generateFallback(dict, seed, difficulty, rand);
  return fallback;
}

function parseDifficulty(seed: string): Difficulty {
  if (seed.includes(":easy:") || seed.endsWith(":easy")) return "easy";
  if (seed.includes(":hard:") || seed.endsWith(":hard")) return "hard";
  return "medium";
}

export function findSlots(shape: BoardShape): Slot[] {
  const cellSet = new Set(shape.cells.map((c) => cellKey(c.row, c.col)));
  const slots: Slot[] = [];

  for (let r = 0; r < shape.rows; r++) {
    let run: Cell[] = [];
    for (let c = 0; c <= shape.cols; c++) {
      if (c < shape.cols && cellSet.has(cellKey(r, c))) {
        run.push({ row: r, col: c });
      } else {
        if (run.length >= 2) slots.push({ dir: "across", cells: [...run] });
        run = [];
      }
    }
  }

  for (let c = 0; c < shape.cols; c++) {
    let run: Cell[] = [];
    for (let r = 0; r <= shape.rows; r++) {
      if (r < shape.rows && cellSet.has(cellKey(r, c))) {
        run.push({ row: r, col: c });
      } else {
        if (run.length >= 2) slots.push({ dir: "down", cells: [...run] });
        run = [];
      }
    }
  }

  return slots;
}

function isValidWord(word: string, dict: Dictionary): boolean {
  if (word.length === 1) return true;
  return dict.has(word.toLowerCase());
}

function getWordCandidates(
  len: number,
  dict: Dictionary,
  constraints: Map<number, string>,
): string[] {
  const sources: (readonly string[])[] = [
    dict.required.buckets.get(len) ?? [],
  ];
  if (len === 2) sources.push(dict.bonus.buckets.get(len) ?? []);

  const candidates: string[] = [];
  for (const source of sources) {
    for (const w of source) {
      const upper = w.toUpperCase();
      let ok = true;
      for (const [pos, letter] of constraints) {
        if (upper[pos] !== letter) {
          ok = false;
          break;
        }
      }
      if (ok) candidates.push(upper);
    }
  }
  return candidates;
}

function fillGrid(
  _shape: BoardShape,
  slots: Slot[],
  dict: Dictionary,
  rand: () => number,
): Map<string, string> | null {
  const grid = new Map<string, string>();

  const cellToSlots = new Map<string, number[]>();
  slots.forEach((slot, i) => {
    for (const c of slot.cells) {
      const k = cellKey(c.row, c.col);
      const list = cellToSlots.get(k) || [];
      list.push(i);
      cellToSlots.set(k, list);
    }
  });

  const sortedSlotIndices = [...slots.keys()].sort((a, b) => {
    const sA = slots[a],
      sB = slots[b];
    const crossA = sA.cells.filter((c) =>
      (cellToSlots.get(cellKey(c.row, c.col)) || []).length > 1,
    ).length;
    const crossB = sB.cells.filter((c) =>
      (cellToSlots.get(cellKey(c.row, c.col)) || []).length > 1,
    ).length;
    if (crossA !== crossB) return crossB - crossA;
    return sA.cells.length - sB.cells.length;
  });

  let fillAttempts = 0;

  function backtrack(idx: number): boolean {
    if (++fillAttempts > MAX_FILL_ATTEMPTS * slots.length * 10) return false;
    if (idx >= sortedSlotIndices.length) return true;

    const slotIdx = sortedSlotIndices[idx];
    const slot = slots[slotIdx];

    const constraints = new Map<number, string>();
    slot.cells.forEach((c, pos) => {
      const letter = grid.get(cellKey(c.row, c.col));
      if (letter) constraints.set(pos, letter);
    });

    let candidates = getWordCandidates(slot.cells.length, dict, constraints);
    candidates = shuffle([...candidates], rand).slice(0, 40);

    for (const word of candidates) {
      const placed: [string, string | undefined][] = [];
      for (let p = 0; p < slot.cells.length; p++) {
        const k = cellKey(slot.cells[p].row, slot.cells[p].col);
        placed.push([k, grid.get(k)]);
        grid.set(k, word[p]);
      }

      let viable = true;
      for (const c of slot.cells) {
        const k = cellKey(c.row, c.col);
        const crossingSlots = (cellToSlots.get(k) || []).filter(
          (si) => si !== slotIdx,
        );
        for (const csi of crossingSlots) {
          if (sortedSlotIndices.indexOf(csi) < idx) continue;
          const crossSlot = slots[csi];
          const cc = new Map<number, string>();
          crossSlot.cells.forEach((sc, pos) => {
            const letter = grid.get(cellKey(sc.row, sc.col));
            if (letter) cc.set(pos, letter);
          });
          const cands = getWordCandidates(crossSlot.cells.length, dict, cc);
          if (cands.length === 0) {
            viable = false;
            break;
          }
        }
        if (!viable) break;
      }

      if (viable && backtrack(idx + 1)) return true;

      for (const [k, prev] of placed) {
        if (prev === undefined) grid.delete(k);
        else grid.set(k, prev);
      }
    }

    return false;
  }

  if (backtrack(0)) return grid;
  return null;
}

const MAX_TILING_NODES = 50_000;

function findTiling(
  shape: BoardShape,
  rand: () => number,
  deadline?: number,
): [Cell, Cell][] | null {
  const cellSet = new Set(shape.cells.map((c) => cellKey(c.row, c.col)));
  const remaining = new Set(cellSet);
  const tiling: [Cell, Cell][] = [];
  let nodes = 0;

  const cells = [...shape.cells].sort(
    (a, b) => a.row * 100 + a.col - (b.row * 100 + b.col),
  );

  function neighbors(c: Cell): Cell[] {
    const result: Cell[] = [];
    for (const [dr, dc] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const k = cellKey(c.row + dr, c.col + dc);
      if (remaining.has(k)) {
        result.push({ row: c.row + dr, col: c.col + dc });
      }
    }
    return result;
  }

  function backtrack(): boolean {
    if (++nodes > MAX_TILING_NODES) return false;
    if (deadline && (nodes & 0xff) === 0 && Date.now() > deadline) return false;
    if (remaining.size === 0) return true;

    let first: Cell | null = null;
    for (const c of cells) {
      if (remaining.has(cellKey(c.row, c.col))) {
        first = c;
        break;
      }
    }
    if (!first) return false;

    const fk = cellKey(first.row, first.col);
    remaining.delete(fk);

    const nbrs = shuffle(neighbors(first), rand);
    for (const nbr of nbrs) {
      const nk = cellKey(nbr.row, nbr.col);
      remaining.delete(nk);

      const c1 =
        first.row < nbr.row || (first.row === nbr.row && first.col < nbr.col)
          ? first
          : nbr;
      const c2 = c1 === first ? nbr : first;
      tiling.push([c1, c2]);

      if (backtrack()) return true;

      tiling.pop();
      remaining.add(nk);
    }

    remaining.add(fk);
    return false;
  }

  if (backtrack()) return tiling;
  return null;
}

function countSolutions(
  shape: BoardShape,
  slots: Slot[],
  dominoes: DominoPiece[],
  dict: Dictionary,
  cap: number,
  deadline?: number,
): number {
  const cellSet = new Set(shape.cells.map((c) => cellKey(c.row, c.col)));
  const grid = new Map<string, string>();
  const used = new Set<number>();
  const covered = new Set<string>();
  const seenGrids = new Set<string>();
  let nodes = 0;

  const cells = [...shape.cells].sort(
    (a, b) => a.row * 100 + a.col - (b.row * 100 + b.col),
  );

  function firstUncovered(): Cell | null {
    for (const c of cells) {
      if (!covered.has(cellKey(c.row, c.col))) return c;
    }
    return null;
  }

  function checkCompletedSlots(): boolean {
    for (const slot of slots) {
      const letters: string[] = [];
      let complete = true;
      for (const c of slot.cells) {
        const l = grid.get(cellKey(c.row, c.col));
        if (l) letters.push(l);
        else {
          complete = false;
          break;
        }
      }
      if (complete) {
        const word = letters.join("");
        if (!isValidWord(word, dict)) return false;
      }
    }
    return true;
  }

  function checkPartialSlots(): boolean {
    for (const slot of slots) {
      const constraints = new Map<number, string>();
      let hasAny = false;
      let allFilled = true;
      for (let p = 0; p < slot.cells.length; p++) {
        const l = grid.get(cellKey(slot.cells[p].row, slot.cells[p].col));
        if (l) {
          constraints.set(p, l);
          hasAny = true;
        } else {
          allFilled = false;
        }
      }
      if (hasAny && !allFilled) {
        const cands = getWordCandidates(slot.cells.length, dict, constraints);
        if (cands.length === 0) return false;
      }
    }
    return true;
  }

  function solve(): boolean {
    if (++nodes > MAX_SOLVE_NODES) return true;
    if (deadline && (nodes & 0xff) === 0 && Date.now() > deadline) return true;
    const target = firstUncovered();
    if (!target) {
      if (checkCompletedSlots()) {
        const key = cells
          .map((c) => grid.get(cellKey(c.row, c.col)) || ".")
          .join("");
        seenGrids.add(key);
        return seenGrids.size >= cap;
      }
      return false;
    }

    const tk = cellKey(target.row, target.col);

    for (const dir of [0, 1] as const) {
      const [, c2] = dominoCells(target, dir);
      const c2k = cellKey(c2.row, c2.col);
      if (!cellSet.has(c2k) || covered.has(c2k)) continue;

      for (const domino of dominoes) {
        if (used.has(domino.id)) continue;

        for (const flip of [false, true] as const) {
          const [l1, l2] = flip
            ? [domino.letters[1], domino.letters[0]]
            : [domino.letters[0], domino.letters[1]];

          grid.set(tk, l1);
          grid.set(c2k, l2);
          covered.add(tk);
          covered.add(c2k);
          used.add(domino.id);

          if (checkPartialSlots() && checkCompletedSlots()) {
            if (solve()) return true;
          }

          grid.delete(tk);
          grid.delete(c2k);
          covered.delete(tk);
          covered.delete(c2k);
          used.delete(domino.id);
        }
      }
    }

    return false;
  }

  solve();
  if (nodes > MAX_SOLVE_NODES || (deadline && Date.now() > deadline)) return cap;
  return seenGrids.size;
}

function generateFallback(
  dict: Dictionary,
  seed: string,
  difficulty: Difficulty,
  rand: () => number,
): DoubletPuzzle {
  const shape = SHAPES[difficulty][0];
  const slots = findSlots(shape);
  const fallbackDeadline = Date.now() + MAX_GENERATION_MS * 4;
  let bestUnverified: { dominoes: DominoPiece[]; tiling: [Cell, Cell][] } | null = null;

  for (let i = 0; i < 500; i++) {
    if (Date.now() > fallbackDeadline) break;

    const fill = fillGrid(shape, slots, dict, rand);
    if (!fill) continue;

    const tiling = findTiling(shape, rand, fallbackDeadline);
    if (!tiling) continue;

    const dominoes: DominoPiece[] = tiling.map(([c1, c2], idx) => ({
      id: idx,
      letters: [
        fill.get(cellKey(c1.row, c1.col))!,
        fill.get(cellKey(c2.row, c2.col))!,
      ],
    }));

    if (!bestUnverified) bestUnverified = { dominoes, tiling };
    if (countSolutions(shape, slots, dominoes, dict, 2, fallbackDeadline) !== 1) continue;

    const solution: PlacedDomino[] = tiling.map(([c1, c2], i) => ({
      dominoId: i,
      anchor: c1,
      orientation: (c1.row === c2.row ? 0 : 1) as 0 | 1,
    }));

    const shuffled = shuffle(
      dominoes.map((d) => ({ ...d })),
      rand,
    );
    shuffled.forEach((d, i) => (d.id = i));

    const solutionMap = new Map<number, PlacedDomino>();
    for (const sp of solution) {
      const origLetters = dominoes[sp.dominoId].letters;
      const newDomino = shuffled.find(
        (d) =>
          d.letters[0] === origLetters[0] &&
          d.letters[1] === origLetters[1] &&
          !solutionMap.has(d.id),
      );
      if (newDomino) {
        solutionMap.set(newDomino.id, { ...sp, dominoId: newDomino.id });
      }
    }

    return {
      seed,
      dictVersion: DICT_VERSION,
      difficulty,
      board: shape,
      slots,
      dominoes: shuffled,
      solution: Array.from(solutionMap.values()),
    };
  }

  // Last resort: use a valid but potentially non-unique puzzle rather
  // than crashing. Prefer uniqueness, but never throw on the main thread.
  if (bestUnverified) {
    const { dominoes, tiling } = bestUnverified;
    const solution: PlacedDomino[] = tiling.map(([c1, c2], i) => ({
      dominoId: i,
      anchor: c1,
      orientation: (c1.row === c2.row ? 0 : 1) as 0 | 1,
    }));
    const shuffled = shuffle(
      dominoes.map((d) => ({ ...d })),
      rand,
    );
    shuffled.forEach((d, i) => (d.id = i));
    const solutionMap = new Map<number, PlacedDomino>();
    for (const sp of solution) {
      const origLetters = dominoes[sp.dominoId].letters;
      const newDomino = shuffled.find(
        (d) =>
          d.letters[0] === origLetters[0] &&
          d.letters[1] === origLetters[1] &&
          !solutionMap.has(d.id),
      );
      if (newDomino) {
        solutionMap.set(newDomino.id, { ...sp, dominoId: newDomino.id });
      }
    }
    return {
      seed,
      dictVersion: DICT_VERSION,
      difficulty,
      board: shape,
      slots,
      dominoes: shuffled,
      solution: Array.from(solutionMap.values()),
    };
  }

  throw new Error(`Doublet generation failed for seed: ${seed}`);
}
