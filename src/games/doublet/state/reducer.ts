import type {
  Cell,
  Orientation,
  PlacedDomino,
  DoubletPuzzle,
} from "../engine/types";
import { cellKey, dominoCells, dominoLetters, slotWord } from "../engine/types";
import { TWO_LETTER_WORDS } from "../engine/twoLetterWords";
import type { Dictionary } from "../../../lib/words/dictionary";

export interface GameState {
  puzzle: DoubletPuzzle;
  placed: PlacedDomino[];
  selectedDominoId: number | null;
  currentOrientation: Orientation;
  solved: boolean;
  grid: Map<string, string>;
  invalidSlots: number[];
  /** Successful placements this board (persisted for trends). */
  moves: number;
  /** Tray + on-board rotations (persisted for trends). */
  rotations: number;
}

export type GameAction =
  | { type: "selectDomino"; dominoId: number }
  | { type: "rotateDomino" }
  | { type: "placeDomino"; cell: Cell; dict: Dictionary; dominoId?: number; orientation?: Orientation }
  | { type: "removeDomino"; dominoId: number }
  | { type: "rotatePlaced"; dominoId: number; dict: Dictionary }
  | { type: "clearBoard" }
  | {
      type: "hydrate";
      placed: PlacedDomino[];
      solved: boolean;
      moves?: number;
      rotations?: number;
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
    // Action counters, persisted per board (trend metrics).
    moves: 0,
    rotations: 0,
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

function checkSolved(
  grid: Map<string, string>,
  puzzle: DoubletPuzzle,
  dict: Dictionary,
): { solved: boolean; invalidSlots: number[] } {
  if (grid.size < puzzle.board.cells.length)
    return { solved: false, invalidSlots: [] };

  const invalidSlots: number[] = [];
  for (let i = 0; i < puzzle.slots.length; i++) {
    const word = slotWord(puzzle.slots[i], grid);
    if (!word) {
      invalidSlots.push(i);
      continue;
    }
    const upper = word.toUpperCase();
    if (word.length === 2) {
      if (!TWO_LETTER_WORDS.has(upper)) invalidSlots.push(i);
    } else {
      if (!dict.has(word.toLowerCase())) invalidSlots.push(i);
    }
  }

  return { solved: invalidSlots.length === 0, invalidSlots };
}

function retainValidInvalidSlots(
  prevInvalid: number[],
  grid: Map<string, string>,
  puzzle: DoubletPuzzle,
): number[] {
  return prevInvalid.filter((i) => {
    const slot = puzzle.slots[i];
    return slot.cells.every((c) => grid.has(cellKey(c.row, c.col)));
  });
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
      const { solved, invalidSlots } = checkSolved(
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
        moves: state.moves + 1,
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
      const invalidSlots = retainValidInvalidSlots(state.invalidSlots, newGrid, state.puzzle);
      return {
        ...state,
        placed: newPlaced,
        grid: newGrid,
        selectedDominoId: action.dominoId,
        currentOrientation: removed?.orientation ?? 0,
        invalidSlots,
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
      const { solved, invalidSlots } = checkSolved(
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
        rotations: state.rotations + 1,
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
      };
    }

    case "hydrate": {
      const newGrid = buildGrid(action.placed, state.puzzle);
      return {
        ...state,
        placed: action.placed,
        grid: newGrid,
        solved: action.solved,
        invalidSlots: [],
        moves: action.moves ?? 0,
        rotations: action.rotations ?? 0,
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
