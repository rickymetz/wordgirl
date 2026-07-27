import type {
  Cell,
  Orientation,
  PlacedDomino,
  DoubletPuzzle,
} from "../engine/types";
import { cellKey, dominoCells, dominoLetters, slotWord } from "../engine/types";
import type { Dictionary } from "../../../lib/words/dictionary";

export interface GameState {
  puzzle: DoubletPuzzle;
  placed: PlacedDomino[];
  selectedDominoId: number | null;
  currentOrientation: Orientation;
  solved: boolean;
  grid: Map<string, string>;
  /**
   * Verdicts on the slots that are FULLY covered right now, updated on
   * every placement rather than only when the last domino lands. A slot
   * still missing a letter gets no verdict — it appears in neither list.
   */
  invalidSlots: number[];
  validSlots: number[];
  /**
   * Bumped by every board change the PLAYER makes; hydrate leaves it at
   * zero. Restoring a half-finished day re-flags whatever was wrong on
   * it, and the screen uses this to tell that from a word just laid —
   * one deserves a toast, the other is old news the tinting already
   * says. Session-only; never persisted.
   */
  moveSeq: number;
  /** Successful placements this board (persisted for trends). */
  moves: number;
  /** Tray + on-board rotations (persisted for trends). */
  rotations: number;
  /** Placed dominoes taken back off the board (persisted for trends). */
  removals: number;
  /** Times the board filled completely but a slot wasn't a word
   * (persisted for trends). */
  invalidBoards: number;
  /** Dominoes placed via the hint button (persisted for trends). */
  hints: number;
}

export type GameAction =
  | { type: "selectDomino"; dominoId: number }
  | { type: "rotateDomino" }
  | { type: "placeDomino"; cell: Cell; dict: Dictionary; dominoId?: number; orientation?: Orientation }
  | { type: "removeDomino"; dominoId: number; dict: Dictionary }
  | { type: "rotatePlaced"; dominoId: number; dict: Dictionary }
  | { type: "clearBoard" }
  | { type: "revealHint"; dict: Dictionary }
  | {
      type: "hydrate";
      placed: PlacedDomino[];
      solved: boolean;
      dict: Dictionary;
      moves?: number;
      rotations?: number;
      removals?: number;
      invalidBoards?: number;
      hints?: number;
    };

export function initialState(puzzle: DoubletPuzzle): GameState {
  return {
    puzzle,
    placed: [],
    selectedDominoId: null,
    currentOrientation: 0,
    solved: false,
    grid: new Map(),
    invalidSlots: [],
    validSlots: [],
    moveSeq: 0,
    // Action counters, persisted per board (trend metrics).
    moves: 0,
    rotations: 0,
    removals: 0,
    invalidBoards: 0,
    hints: 0,
  };
}

function buildGrid(
  placed: PlacedDomino[],
  puzzle: DoubletPuzzle,
): Map<string, string> {
  const grid = new Map<string, string>();
  for (const p of placed) {
    const domino = puzzle.dominoes.find((d) => d.id === p.dominoId);
    if (!domino) continue;
    const [c1, c2] = dominoCells(p.anchor, p.orientation);
    const [l1, l2] = dominoLetters(domino, p.orientation);
    grid.set(cellKey(c1.row, c1.col), l1);
    grid.set(cellKey(c2.row, c2.col), l2);
  }
  return grid;
}

function isBoardFull(
  grid: Map<string, string>,
  puzzle: DoubletPuzzle,
): boolean {
  return grid.size >= puzzle.board.cells.length;
}

/**
 * Judge every slot the board can currently answer for.
 *
 * A slot is judged the moment its last cell is covered — a wrong run is
 * called out where it is laid, not held back until the board fills. The
 * board is solved only when it is full AND nothing is invalid; a full
 * board's slots are all covered, so that is the same test it always was.
 */
function judgeSlots(
  grid: Map<string, string>,
  puzzle: DoubletPuzzle,
  dict: Dictionary,
): { solved: boolean; invalidSlots: number[]; validSlots: number[] } {
  const invalidSlots: number[] = [];
  const validSlots: number[] = [];

  for (let i = 0; i < puzzle.slots.length; i++) {
    const word = slotWord(puzzle.slots[i], grid);
    // Still filling — no verdict to give yet.
    if (!word) continue;
    if (dict.has(word.toLowerCase())) validSlots.push(i);
    else invalidSlots.push(i);
  }

  return {
    solved: isBoardFull(grid, puzzle) && invalidSlots.length === 0,
    invalidSlots,
    validSlots,
  };
}

export function gameReducer(
  state: GameState,
  action: GameAction,
): GameState {
  switch (action.type) {
    case "selectDomino": {
      if (state.solved) return state;
      if (state.selectedDominoId === action.dominoId) {
        return { ...state, selectedDominoId: null };
      }
      return {
        ...state,
        selectedDominoId: action.dominoId,
        currentOrientation: 0,
      };
    }

    case "rotateDomino": {
      if (state.solved || state.selectedDominoId === null) return state;
      return {
        ...state,
        currentOrientation: (((state.currentOrientation as number) + 1) %
          4) as Orientation,
        rotations: state.rotations + 1,
      };
    }

    case "placeDomino": {
      const dId = action.dominoId ?? state.selectedDominoId;
      const ori = action.orientation ?? state.currentOrientation;
      if (state.solved || dId === null) return state;

      const domino = state.puzzle.dominoes.find((d) => d.id === dId);
      if (!domino) return state;

      const alreadyPlaced = state.placed.find((p) => p.dominoId === dId);
      if (alreadyPlaced) return state;

      const [c1, c2] = dominoCells(action.cell, ori);
      const boardCells = new Set(
        state.puzzle.board.cells.map((c) => cellKey(c.row, c.col)),
      );
      if (
        !boardCells.has(cellKey(c1.row, c1.col)) ||
        !boardCells.has(cellKey(c2.row, c2.col))
      )
        return state;

      if (
        state.grid.has(cellKey(c1.row, c1.col)) ||
        state.grid.has(cellKey(c2.row, c2.col))
      )
        return state;

      const newPlacement: PlacedDomino = {
        dominoId: dId,
        anchor: action.cell,
        orientation: ori,
      };

      const newPlaced = [...state.placed, newPlacement];
      const newGrid = buildGrid(newPlaced, state.puzzle);
      const { solved, invalidSlots, validSlots } = judgeSlots(
        newGrid,
        state.puzzle,
        action.dict,
      );

      const placedIds = new Set(newPlaced.map((p) => p.dominoId));
      const nextUnplaced = solved
        ? null
        : state.puzzle.dominoes.find((d) => !placedIds.has(d.id))?.id ?? null;

      return {
        ...state,
        placed: newPlaced,
        grid: newGrid,
        selectedDominoId: nextUnplaced,
        currentOrientation: 0,
        solved,
        invalidSlots,
        validSlots,
        moveSeq: state.moveSeq + 1,
        moves: state.moves + 1,
        // invalidSlots is now populated mid-solve too, so the metric has
        // to ask for the full board itself — it counts boards that were
        // finished wrong, not wrong words along the way.
        invalidBoards:
          state.invalidBoards +
          (isBoardFull(newGrid, state.puzzle) && invalidSlots.length > 0
            ? 1
            : 0),
      };
    }

    case "removeDomino": {
      if (state.solved) return state;
      const removed = state.placed.find(
        (p) => p.dominoId === action.dominoId,
      );
      const newPlaced = state.placed.filter(
        (p) => p.dominoId !== action.dominoId,
      );
      const newGrid = buildGrid(newPlaced, state.puzzle);
      // Lifting a piece un-judges the slots it was part of and can leave
      // others still complete — re-judge rather than filtering the old
      // verdicts, so a slot never keeps a flag it no longer earns.
      const { invalidSlots, validSlots } = judgeSlots(
        newGrid,
        state.puzzle,
        action.dict,
      );
      return {
        ...state,
        placed: newPlaced,
        grid: newGrid,
        selectedDominoId: action.dominoId,
        currentOrientation: removed?.orientation ?? 0,
        invalidSlots,
        validSlots,
        moveSeq: state.moveSeq + 1,
        removals: removed ? state.removals + 1 : state.removals,
      };
    }

    case "rotatePlaced": {
      if (state.solved) return state;
      const idx = state.placed.findIndex(
        (p) => p.dominoId === action.dominoId,
      );
      if (idx === -1) return state;
      const p = state.placed[idx];
      const newOri = (((p.orientation as number) + 1) % 4) as Orientation;
      const [c1, c2] = dominoCells(p.anchor, newOri);
      const boardCells = new Set(
        state.puzzle.board.cells.map((c) => cellKey(c.row, c.col)),
      );
      if (
        !boardCells.has(cellKey(c1.row, c1.col)) ||
        !boardCells.has(cellKey(c2.row, c2.col))
      )
        return state;
      const tempPlaced = state.placed.filter((_, i) => i !== idx);
      const tempGrid = buildGrid(tempPlaced, state.puzzle);
      if (
        tempGrid.has(cellKey(c1.row, c1.col)) ||
        tempGrid.has(cellKey(c2.row, c2.col))
      )
        return state;
      const newPlaced = [...state.placed];
      newPlaced[idx] = { ...p, orientation: newOri };
      const newGrid = buildGrid(newPlaced, state.puzzle);
      const { solved, invalidSlots, validSlots } = judgeSlots(
        newGrid,
        state.puzzle,
        action.dict,
      );
      return {
        ...state,
        placed: newPlaced,
        grid: newGrid,
        solved,
        invalidSlots,
        validSlots,
        moveSeq: state.moveSeq + 1,
        rotations: state.rotations + 1,
        // No invalidBoards increment here: a +1 rotation always flips
        // the domino's axis, so it needs a free cell to swing into and
        // can never be the move that fills the board.
      };
    }

    case "clearBoard": {
      if (state.solved) return state;
      return {
        ...state,
        placed: [],
        grid: new Map(),
        selectedDominoId: null,
        currentOrientation: 0,
        invalidSlots: [],
        validSlots: [],
        moveSeq: state.moveSeq + 1,
        // Clearing IS taking back — every placed domino comes off, so
        // it counts like N removals (else clear-board play styles
        // chart artificially low take-backs).
        removals: state.removals + state.placed.length,
      };
    }

    case "revealHint": {
      if (state.solved) return state;
      const placedIds = new Set(state.placed.map((p) => p.dominoId));
      const hint = state.puzzle.solution.find((s) => !placedIds.has(s.dominoId));
      if (!hint) return state;
      // Remove any domino currently occupying the hint's target cells.
      const [hc1, hc2] = dominoCells(hint.anchor, hint.orientation);
      const hk1 = cellKey(hc1.row, hc1.col);
      const hk2 = cellKey(hc2.row, hc2.col);
      let newPlaced = state.placed.filter((p) => {
        const [c1, c2] = dominoCells(p.anchor, p.orientation);
        const k1 = cellKey(c1.row, c1.col);
        const k2 = cellKey(c2.row, c2.col);
        return k1 !== hk1 && k1 !== hk2 && k2 !== hk1 && k2 !== hk2;
      });
      newPlaced = [...newPlaced, hint];
      const newGrid = buildGrid(newPlaced, state.puzzle);
      const { solved, invalidSlots, validSlots } = judgeSlots(newGrid, state.puzzle, action.dict);
      const newPlacedIds = new Set(newPlaced.map((p) => p.dominoId));
      const nextUnplaced = solved
        ? null
        : state.puzzle.dominoes.find((d) => !newPlacedIds.has(d.id))?.id ?? null;
      return {
        ...state,
        placed: newPlaced,
        grid: newGrid,
        selectedDominoId: nextUnplaced,
        currentOrientation: 0,
        solved,
        invalidSlots,
        validSlots,
        moveSeq: state.moveSeq + 1,
        hints: state.hints + 1,
      };
    }

    case "hydrate": {
      const newGrid = buildGrid(action.placed, state.puzzle);
      // Judge the restored board so a part-finished day comes back with
      // the same marks it was left with, rather than a clean slate that
      // hides a wrong word until the next placement.
      const { invalidSlots, validSlots } = judgeSlots(
        newGrid,
        state.puzzle,
        action.dict,
      );
      return {
        ...state,
        placed: action.placed,
        grid: newGrid,
        solved: action.solved,
        invalidSlots,
        validSlots,
        moveSeq: 0,
        moves: action.moves ?? 0,
        rotations: action.rotations ?? 0,
        removals: action.removals ?? 0,
        invalidBoards: action.invalidBoards ?? 0,
        hints: action.hints ?? 0,
      };
    }

    default:
      return state;
  }
}

export function placedDominoIds(state: GameState): Set<number> {
  return new Set(state.placed.map((p) => p.dominoId));
}

export function dominoAt(
  state: GameState,
  row: number,
  col: number,
): PlacedDomino | null {
  const k = cellKey(row, col);
  for (const p of state.placed) {
    const domino = state.puzzle.dominoes.find((d) => d.id === p.dominoId);
    if (!domino) continue;
    const [c1, c2] = dominoCells(p.anchor, p.orientation);
    if (cellKey(c1.row, c1.col) === k || cellKey(c2.row, c2.col) === k) {
      return p;
    }
  }
  return null;
}
