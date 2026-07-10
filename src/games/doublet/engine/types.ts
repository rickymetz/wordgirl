export type Difficulty = "easy" | "medium" | "hard";

export type SlotDir = "across" | "down";

export interface Cell {
  row: number;
  col: number;
}

export interface Slot {
  dir: SlotDir;
  cells: Cell[];
}

export interface BoardShape {
  id: string;
  cells: Cell[];
  rows: number;
  cols: number;
}

export interface DominoPiece {
  id: number;
  letters: [string, string];
}

export type Orientation = 0 | 1 | 2 | 3;
// 0 = RIGHT:  letter[0] at anchor, letter[1] at (row, col+1)
// 1 = DOWN:   letter[0] at anchor, letter[1] at (row+1, col)
// 2 = LEFT:   letter[1] at anchor, letter[0] at (row, col+1)  (flipped horizontal)
// 3 = UP:     letter[1] at anchor, letter[0] at (row+1, col)  (flipped vertical)

export interface PlacedDomino {
  dominoId: number;
  anchor: Cell;
  orientation: Orientation;
}

export interface DoubletPuzzle {
  seed: string;
  dictVersion: number;
  difficulty: Difficulty;
  board: BoardShape;
  slots: Slot[];
  dominoes: DominoPiece[];
  solution: PlacedDomino[];
}

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function cellFromKey(key: string): Cell {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
}

export function slotWord(
  slot: Slot,
  grid: Map<string, string>,
): string | null {
  let word = "";
  for (const c of slot.cells) {
    const letter = grid.get(cellKey(c.row, c.col));
    if (!letter) return null;
    word += letter;
  }
  return word;
}

export function dominoCells(
  anchor: Cell,
  orientation: Orientation,
): [Cell, Cell] {
  const { row, col } = anchor;
  const isHorizontal = orientation === 0 || orientation === 2;
  const second: Cell = isHorizontal
    ? { row, col: col + 1 }
    : { row: row + 1, col };
  return [anchor, second];
}

export function dominoLetters(
  piece: DominoPiece,
  orientation: Orientation,
): [string, string] {
  const flipped = orientation >= 2;
  return flipped
    ? [piece.letters[1], piece.letters[0]]
    : [piece.letters[0], piece.letters[1]];
}
