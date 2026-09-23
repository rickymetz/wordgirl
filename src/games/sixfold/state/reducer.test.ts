import { describe, expect, it } from "vitest";
import { TUTORIAL_PUZZLE as P } from "../engine/tutorial";
import {
  BLANK,
  conflictCells,
  gameReducer,
  initialState,
  isLocked,
  wrongLines,
  type Action,
  type GameState,
} from "./reducer";

const run = (actions: Action[], s: GameState = initialState(P)) => actions.reduce(gameReducer, s);

// The tutorial board: four sudoku gaps (row 1's is cell 4, an S) and the
// E/T rectangle 21, 22, 33, 34.
const blanks = [...Array(36).keys()].filter((c) => !P.givens.includes(c));
const FIRST = 4;
const GIVEN = 0;

describe("entry", () => {
  it("selects, then writes the pressed letter", () => {
    const s = run([
      { type: "tapCell", cell: FIRST },
      { type: "pressLetter", letter: "S" },
    ]);
    expect(s.entries[FIRST]).toBe("s");
    expect(s.feedback).toMatchObject({ type: "placed", cell: FIRST, letter: "s", repeats: false });
  });

  it("ignores letters with no selection, and letters not in the set", () => {
    expect(run([{ type: "pressLetter", letter: "s" }]).entries).toBe(initialState(P).entries);
    const s = run([
      { type: "tapCell", cell: FIRST },
      { type: "pressLetter", letter: "q" },
    ]);
    expect(s.entries[FIRST]).toBe(BLANK);
  });

  it("never overwrites a given, and says why", () => {
    const s = run([
      { type: "tapCell", cell: GIVEN },
      { type: "pressLetter", letter: "e" },
    ]);
    expect(s.entries[GIVEN]).toBe(P.solution[GIVEN]);
    expect(isLocked(s, GIVEN)).toBe(true);
    expect(s.feedback).toMatchObject({ type: "locked", cell: GIVEN });
    // Erasing a given is silently a no-op, not a scolding.
    expect(run([{ type: "erase" }], s).feedback).toEqual(s.feedback);
  });

  it("erases the selected cell", () => {
    const s = run([
      { type: "tapCell", cell: FIRST },
      { type: "pressLetter", letter: "s" },
      { type: "erase" },
    ]);
    expect(s.entries[FIRST]).toBe(BLANK);
    expect(s.feedback).toMatchObject({ type: "cleared", cell: FIRST });
  });

  it("a tap toggles; keyboard focus only ever selects", () => {
    expect(run([{ type: "tapCell", cell: 3 }, { type: "tapCell", cell: 3 }]).selected).toBeNull();
    expect(run([{ type: "select", cell: 3 }, { type: "select", cell: 3 }]).selected).toBe(3);
  });

  it("arrows move the selection, wrapping at the edges", () => {
    expect(run([{ type: "move", dRow: 0, dCol: 1 }]).selected).toBe(0);
    expect(run([{ type: "select", cell: 5 }, { type: "move", dRow: 0, dCol: 1 }]).selected).toBe(0);
    expect(run([{ type: "select", cell: 0 }, { type: "move", dRow: -1, dCol: 0 }]).selected).toBe(30);
  });
});

describe("repeats", () => {
  it("flags duplicates and counts the placement that made one", () => {
    // Row 1 already holds an E at column 6.
    const s = run([
      { type: "tapCell", cell: FIRST },
      { type: "pressLetter", letter: "e" },
    ]);
    expect(conflictCells(P.regions, s.entries).has(FIRST)).toBe(true);
    expect(s.conflicts).toBe(1);
    expect(s.feedback).toMatchObject({ type: "placed", repeats: true });
  });
});

describe("hints", () => {
  it("fills the next cell the player's toolkit would deduce, and locks it", () => {
    const s = run([{ type: "revealHint" }]);
    // Sudoku comes first on this board, so the first hint is a sudoku gap.
    expect([4, 7, 12, 26]).toContain(s.revealed[0]);
    expect(s.entries[s.revealed[0]]).toBe(P.solution[s.revealed[0]]);
    expect(s.hints).toBe(1);
    expect(isLocked(s, s.revealed[0])).toBe(true);
    expect(s.feedback).toMatchObject({ type: "hint" });
  });

  it("keeps its own feedback on a board it fills without solving", () => {
    // Fill every blank wrong-but-plausibly, then hint: the hint is news,
    // "board full" is not.
    const actions: Action[] = blanks.flatMap((c) => [
      { type: "select", cell: c } as Action,
      { type: "pressLetter", letter: c === 21 ? "e" : P.solution[c] } as Action,
    ]);
    const full = run(actions);
    expect(full.feedback?.type).toBe("full");
    const hinted = run([{ type: "revealHint" }], full);
    expect(hinted.feedback?.type === "hint" || hinted.feedback?.type === "solved").toBe(true);
  });
});

describe("solving", () => {
  const fillAll = (letterAt: (c: number) => string): Action[] =>
    blanks.flatMap((c) => [
      { type: "select", cell: c } as Action,
      { type: "pressLetter", letter: letterAt(c) } as Action,
    ]);

  it("solves when the board matches the solution, then freezes", () => {
    const s = run(fillAll((c) => P.solution[c]));
    expect(s.solved).toBe(true);
    expect(s.feedback?.type).toBe("solved");
    const after = run([{ type: "select", cell: FIRST }, { type: "erase" }], s);
    expect(after).toBe(s);
  });

  it("names the word lines a full, repeat-free, wrong board gets wrong", () => {
    // Swap the E/T rectangle: valid sudoku, but neither line is its word.
    const swap: Record<number, string> = { 21: "e", 22: "t", 33: "t", 34: "e" };
    const s = run(fillAll((c) => swap[c] ?? P.solution[c]));
    expect(conflictCells(P.regions, s.entries).size).toBe(0);
    expect(s.solved).toBe(false);
    expect(s.feedback?.type).toBe("full");
    expect(wrongLines(P, s.entries)).toEqual(["clued", "hidden"]);
  });

  it("names no line while letters still repeat", () => {
    const s = run(fillAll((c) => (c === FIRST ? "e" : P.solution[c])));
    expect(wrongLines(P, s.entries)).toEqual([]);
  });
});

describe("hydrate", () => {
  it("restores a save that fits the puzzle", () => {
    const entries = run([
      { type: "tapCell", cell: FIRST },
      { type: "pressLetter", letter: "s" },
    ]).entries;
    const s = run([{ type: "hydrate", entries, revealed: [], solved: false, hints: 2, conflicts: 1 }]);
    expect(s.entries).toBe(entries);
    expect(s.hints).toBe(2);
  });

  it("rejects a save that overwrote a given or has foreign letters", () => {
    const s0 = initialState(P);
    const bad = "x" + s0.entries.slice(1);
    expect(run([{ type: "hydrate", entries: bad, revealed: [], solved: false }]).entries).toBe(s0.entries);
    const short = s0.entries.slice(1);
    expect(run([{ type: "hydrate", entries: short, revealed: [], solved: false }]).entries).toBe(s0.entries);
  });

  it("only trusts `solved` when the entries really are the solution", () => {
    const s0 = initialState(P);
    expect(run([{ type: "hydrate", entries: s0.entries, revealed: [], solved: true }]).solved).toBe(false);
  });
});
