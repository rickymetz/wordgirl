import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import type { DoubletPuzzle, Orientation } from "../engine/types";
import { gameReducer, initialState, nextHint, type GameState } from "./reducer";

// A 2x2 board, two horizontal dominoes, both rows two-letter words —
// small enough to drive the reducer by hand.
const dict = parseDictionary("at\non");
const puzzle: DoubletPuzzle = {
  seed: "test",
  dictVersion: 1,
  difficulty: "easy",
  board: {
    id: "2x2",
    rows: 2,
    cols: 2,
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ],
  },
  slots: [
    {
      dir: "across",
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ],
    },
    {
      dir: "across",
      cells: [
        { row: 1, col: 0 },
        { row: 1, col: 1 },
      ],
    },
  ],
  dominoes: [
    { id: 0, letters: ["A", "T"] },
    { id: 1, letters: ["O", "N"] },
  ],
  solution: [
    { dominoId: 0, anchor: { row: 0, col: 0 }, orientation: 0 },
    { dominoId: 1, anchor: { row: 1, col: 0 }, orientation: 0 },
  ],
};

const place = (s: GameState, dominoId: number, row: number, col: number) =>
  gameReducer(s, {
    type: "placeDomino",
    cell: { row, col },
    dict,
    dominoId,
    orientation: 0,
  });

describe("live word validation", () => {
  it("judges a slot the moment its last cell is covered", () => {
    // Row 0 alone: AT is a word, and the bottom row is still empty.
    const s = place(initialState(puzzle), 0, 0, 0);
    expect(s.validSlots).toEqual([0]);
    expect(s.invalidSlots).toEqual([]);
    expect(s.solved).toBe(false);
  });

  it("flags a wrong word without waiting for the board to fill", () => {
    // Domino 1 flipped reads N,O — "NO" is not in this dictionary.
    const s = gameReducer(initialState(puzzle), {
      type: "placeDomino",
      cell: { row: 0, col: 0 },
      dict,
      dominoId: 1,
      orientation: 2,
    });
    expect(s.invalidSlots).toEqual([0]);
    expect(s.validSlots).toEqual([]);
    // Wrong words along the way are not wrongly-finished boards.
    expect(s.invalidBoards).toBe(0);
  });

  it("gives no verdict to a slot that is still filling", () => {
    // One vertical domino covers a cell in each row, completing neither.
    const s = gameReducer(initialState(puzzle), {
      type: "placeDomino",
      cell: { row: 0, col: 0 },
      dict,
      dominoId: 0,
      orientation: 1,
    });
    expect(s.validSlots).toEqual([]);
    expect(s.invalidSlots).toEqual([]);
  });

  it("drops a slot's verdict when the piece comes back off", () => {
    let s = gameReducer(initialState(puzzle), {
      type: "placeDomino",
      cell: { row: 0, col: 0 },
      dict,
      dominoId: 1,
      orientation: 2,
    });
    expect(s.invalidSlots).toEqual([0]);
    s = gameReducer(s, { type: "removeDomino", dominoId: 1, dict });
    expect(s.invalidSlots).toEqual([]);
    expect(s.validSlots).toEqual([]);
  });

  it("re-judges a restored board, but as no move of the player's", () => {
    // A half-finished day comes back with its marks — the screen reads
    // moveSeq to know the flag is old news and stays quiet.
    const restored = gameReducer(initialState(puzzle), {
      type: "hydrate",
      placed: [
        { dominoId: 1, anchor: { row: 0, col: 0 }, orientation: 2 as const },
      ],
      solved: false,
      dict,
    });
    expect(restored.invalidSlots).toEqual([0]);
    expect(restored.moveSeq).toBe(0);
    // The next real placement is a move, and carries a fresh verdict.
    const played = place(restored, 0, 1, 0);
    expect(played.moveSeq).toBe(1);
    expect(played.validSlots).toEqual([1]);
  });

  it("still needs a full board to call the puzzle solved", () => {
    let s = place(initialState(puzzle), 0, 0, 0);
    expect(s.validSlots).toEqual([0]);
    expect(s.solved).toBe(false);
    s = place(s, 1, 1, 0);
    expect(s.solved).toBe(true);
  });
});

describe("action counters", () => {
  it("counts only SUCCESSFUL placements as moves", () => {
    let s = initialState(puzzle);
    s = place(s, 0, 0, 0);
    expect(s.moves).toBe(1);

    // Off the board, onto an occupied cell, and re-placing an
    // already-placed domino all fail — and must not count.
    s = place(s, 1, 1, 1); // second cell (1,2) is off-board
    s = place(s, 1, 0, 0); // occupied
    s = place(s, 0, 1, 0); // domino 0 already placed
    expect(s.placed).toHaveLength(1);
    expect(s.moves).toBe(1);

    s = place(s, 1, 1, 0);
    expect(s.solved).toBe(true); // AT / ON
    expect(s.moves).toBe(2);
  });

  it("counts tray and on-board rotations, skipping failed ones", () => {
    let s = initialState(puzzle);
    // Tray rotation needs a selection.
    s = gameReducer(s, { type: "rotateDomino" });
    expect(s.rotations).toBe(0);
    s = gameReducer(s, { type: "selectDomino", dominoId: 0 });
    s = gameReducer(s, { type: "rotateDomino" });
    expect(s.rotations).toBe(1);

    // On-board rotation: A/T pivots to vertical (free column) — counts.
    s = place(s, 0, 0, 0);
    s = gameReducer(s, { type: "rotatePlaced", dominoId: 0, dict });
    expect(s.placed[0].orientation).toBe(1);
    expect(s.rotations).toBe(2);

    // Blocked rotation (second domino in the way) must not count.
    s = gameReducer(s, {
      type: "placeDomino",
      cell: { row: 0, col: 1 },
      dict,
      dominoId: 1,
      orientation: 1,
    });
    s = gameReducer(s, { type: "rotatePlaced", dominoId: 0, dict });
    expect(s.placed[0].orientation).toBe(1);
    expect(s.rotations).toBe(2);
  });

  it("counts take-backs only when a domino actually comes off", () => {
    let s = initialState(puzzle);
    s = place(s, 0, 0, 0);
    s = gameReducer(s, { type: "removeDomino", dominoId: 0, dict });
    expect(s.placed).toHaveLength(0);
    expect(s.removals).toBe(1);
    // Removing a domino that isn't on the board is not a take-back.
    s = gameReducer(s, { type: "removeDomino", dominoId: 5, dict });
    expect(s.removals).toBe(1);

    // Clearing the board takes back every placed domino (vertical
    // placements keep the board unsolved so clearBoard isn't frozen).
    s = gameReducer(s, {
      type: "placeDomino",
      cell: { row: 0, col: 0 },
      dict,
      dominoId: 0,
      orientation: 1,
    });
    s = gameReducer(s, {
      type: "placeDomino",
      cell: { row: 0, col: 1 },
      dict,
      dominoId: 1,
      orientation: 1,
    });
    s = gameReducer(s, { type: "clearBoard" });
    expect(s.placed).toHaveLength(0);
    expect(s.removals).toBe(3);
    // Clearing an empty board takes back nothing.
    s = gameReducer(s, { type: "clearBoard" });
    expect(s.removals).toBe(3);
  });

  it("counts each full-but-wrong board exactly once per filling", () => {
    // Both dominoes vertical: rows read AO / TN — full grid, no words.
    let s = initialState(puzzle);
    s = gameReducer(s, {
      type: "placeDomino",
      cell: { row: 0, col: 0 },
      dict,
      dominoId: 0,
      orientation: 1,
    });
    expect(s.invalidBoards).toBe(0); // board not full yet
    s = gameReducer(s, {
      type: "placeDomino",
      cell: { row: 0, col: 1 },
      dict,
      dominoId: 1,
      orientation: 1,
    });
    expect(s.solved).toBe(false);
    expect(s.invalidSlots.length).toBeGreaterThan(0);
    expect(s.invalidBoards).toBe(1);
    // Fixing it the right way round never counts.
    s = gameReducer(s, { type: "removeDomino", dominoId: 0, dict });
    s = gameReducer(s, { type: "removeDomino", dominoId: 1, dict });
    s = place(s, 0, 0, 0);
    s = place(s, 1, 1, 0);
    expect(s.solved).toBe(true);
    expect(s.invalidBoards).toBe(1);
  });

  it("hydrate restores saved counters and defaults missing ones to 0", () => {
    const placed = [
      { dominoId: 0, anchor: { row: 0, col: 0 }, orientation: 0 as const },
    ];
    const restored = gameReducer(initialState(puzzle), {
      type: "hydrate",
      placed,
      solved: false,
      dict,
      moves: 7,
      rotations: 3,
      removals: 2,
      invalidBoards: 1,
    });
    expect(restored.moves).toBe(7);
    expect(restored.rotations).toBe(3);
    expect(restored.removals).toBe(2);
    expect(restored.invalidBoards).toBe(1);

    // A save from before the counters shipped hydrates clean.
    const legacy = gameReducer(initialState(puzzle), {
      type: "hydrate",
      placed,
      solved: false,
      dict,
    });
    expect(legacy.moves).toBe(0);
    expect(legacy.rotations).toBe(0);
    expect(legacy.removals).toBe(0);
    expect(legacy.invalidBoards).toBe(0);
  });
});

describe("revealHint", () => {
  const placeO = (
    s: GameState,
    dominoId: number,
    row: number,
    col: number,
    orientation: Orientation,
  ) =>
    gameReducer(s, {
      type: "placeDomino",
      cell: { row, col },
      dict,
      dominoId,
      orientation,
    });
  const hint = (s: GameState) => gameReducer(s, { type: "revealHint", dict });

  it("acts on a misplaced domino when the board is full but wrong", () => {
    // Both pieces flipped: "TA" / "NO" — full, nothing valid.
    let s = placeO(initialState(puzzle), 0, 0, 0, 2);
    s = placeO(s, 1, 1, 0, 2);
    expect(s.grid.size).toBe(4);
    expect(s.solved).toBe(false);

    expect(nextHint(s)).not.toBeNull();
    const h = hint(s);
    expect(h).not.toBe(s);
    expect(h.hints).toBe(1);
    // Domino 0 moved to its solution spot, displacing nothing else it
    // didn't have to (domino 1 is off row 0 already).
    expect(h.placed).toContainEqual(puzzle.solution[0]);
    expect(h.grid.get("0,0")).toBe("A");
    expect(h.grid.get("0,1")).toBe("T");

    // A second hint finishes it.
    const h2 = hint(h);
    expect(h2.solved).toBe(true);
    expect(h2.hints).toBe(2);
  });

  it("always converges to solved from any full wrong board", () => {
    const oris: Orientation[] = [0, 2];
    for (const o0 of oris)
      for (const o1 of oris)
        for (const swap of [false, true]) {
          let s = placeO(initialState(puzzle), 0, swap ? 1 : 0, 0, o0);
          s = placeO(s, 1, swap ? 0 : 1, 0, o1);
          let n = 0;
          while (!s.solved && n < 4) {
            const next = hint(s);
            expect(next).not.toBe(s);
            s = next;
            n++;
          }
          expect(s.solved).toBe(true);
          expect(s.hints).toBe(n);
        }
  });

  it("is a no-op (and uncounted) on a solved board", () => {
    let s = place(initialState(puzzle), 0, 0, 0);
    s = place(s, 1, 1, 0);
    expect(s.solved).toBe(true);
    expect(nextHint(s)).toBeNull();
    const h = hint(s);
    expect(h).toBe(s);
    expect(h.hints).toBe(0);
  });

  it("is a no-op when the board already matches the solution letters", () => {
    // Solved by letters, but the flag isn't set (e.g. a stale hydrate):
    // there is nothing to hint, so nothing is counted.
    const s = gameReducer(initialState(puzzle), {
      type: "hydrate",
      placed: puzzle.solution,
      solved: false,
      dict,
    });
    expect(nextHint(s)).toBeNull();
    expect(hint(s)).toBe(s);
  });

  it("does not evict the player's correct domino on a partial board", () => {
    // Domino 1 already right; the hint places 0 and leaves 1 alone.
    const s = place(initialState(puzzle), 1, 1, 0);
    const h = hint(s);
    expect(h.placed).toContainEqual(puzzle.solution[1]);
    expect(h.placed).toContainEqual(puzzle.solution[0]);
    expect(h.solved).toBe(true);
  });

  it("treats a twin piece in its sibling's spot as correct", () => {
    // Two identical AT pieces; the player laid #1 where the solution has
    // #0. The old hint evicted it to put #0 there; now #0 goes to row 1.
    const twins: DoubletPuzzle = {
      ...puzzle,
      dominoes: [
        { id: 0, letters: ["A", "T"] },
        { id: 1, letters: ["A", "T"] },
      ],
    };
    const s = gameReducer(initialState(twins), {
      type: "placeDomino",
      cell: { row: 0, col: 0 },
      dict,
      dominoId: 1,
      orientation: 0,
    });
    expect(nextHint(s)).toEqual({
      dominoId: 0,
      anchor: { row: 1, col: 0 },
      orientation: 0,
    });
    const h = hint(s);
    expect(h.placed).toContainEqual({
      dominoId: 1,
      anchor: { row: 0, col: 0 },
      orientation: 0,
    });
    expect(h.solved).toBe(true);
  });

  it("prefers a tray piece over moving one already on the board", () => {
    // Domino 0 flipped on row 0 ("TA", wrong); domino 1 still in tray.
    const s = placeO(initialState(puzzle), 0, 0, 0, 2);
    const h = nextHint(s);
    expect(h?.dominoId).toBe(1);
    expect(h?.anchor).toEqual({ row: 1, col: 0 });
  });
});
