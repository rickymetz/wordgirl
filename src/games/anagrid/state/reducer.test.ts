import { describe, expect, it } from "vitest";
import { TUTORIAL_PUZZLE as P } from "../engine/tutorial";
import {
  BLANK,
  ERASER,
  conflictCells,
  gameReducer,
  initialState,
  isLocked,
  type Action,
  type GameState,
} from "./reducer";

const run = (actions: Action[], s: GameState = initialState(P)) =>
  actions.reduce(gameReducer, s);

// The tutorial board's blanks, and a cell per role.
const blanks = [...Array(36).keys()].filter((c) => !P.givens.includes(c));
const FIRST = 4; // row 1's gap: S
const GIVEN = 0;

describe("cell-first entry", () => {
  it("selects, then writes the pressed letter", () => {
    const s = run([
      { type: "tapCell", cell: FIRST },
      { type: "pressLetter", letter: "S" },
    ]);
    expect(s.entries[FIRST]).toBe("s");
    expect(s.selected).toBe(FIRST);
  });

  it("ignores letters with no selection, and letters not in the set", () => {
    expect(run([{ type: "pressLetter", letter: "s" }]).entries).toBe(
      initialState(P).entries,
    );
    const s = run([
      { type: "tapCell", cell: FIRST },
      { type: "pressLetter", letter: "q" },
    ]);
    expect(s.entries[FIRST]).toBe(BLANK);
  });

  it("never overwrites a given", () => {
    const s = run([
      { type: "tapCell", cell: GIVEN },
      { type: "pressLetter", letter: "e" },
      { type: "erase" },
    ]);
    expect(s.entries[GIVEN]).toBe(P.solution[GIVEN]);
    expect(isLocked(s, GIVEN)).toBe(true);
  });

  it("erases the selected cell", () => {
    const s = run([
      { type: "tapCell", cell: FIRST },
      { type: "pressLetter", letter: "s" },
      { type: "erase" },
    ]);
    expect(s.entries[FIRST]).toBe(BLANK);
  });

  it("tapping the selected cell again deselects it", () => {
    expect(run([{ type: "tapCell", cell: 3 }, { type: "tapCell", cell: 3 }]).selected).toBeNull();
  });
});

describe("letter-first entry", () => {
  it("stamps the chosen letter, and re-tapping clears it", () => {
    const s = run([
      { type: "setMode", mode: "letter" },
      { type: "pressLetter", letter: "s" },
      { type: "tapCell", cell: FIRST },
    ]);
    expect(s.entries[FIRST]).toBe("s");
    expect(s.tool).toBe("s");
    expect(run([{ type: "tapCell", cell: FIRST }], s).entries[FIRST]).toBe(BLANK);
  });

  it("the eraser is a tool too", () => {
    const s = run([
      { type: "setMode", mode: "letter" },
      { type: "pressLetter", letter: "s" },
      { type: "tapCell", cell: FIRST },
      { type: "erase" },
      { type: "tapCell", cell: FIRST },
    ]);
    expect(s.tool).toBe(ERASER);
    expect(s.entries[FIRST]).toBe(BLANK);
  });

  it("switching modes drops the tool", () => {
    const s = run([
      { type: "setMode", mode: "letter" },
      { type: "pressLetter", letter: "s" },
      { type: "setMode", mode: "cell" },
    ]);
    expect(s.tool).toBeNull();
  });
});

describe("conflicts", () => {
  it("flags duplicates and counts the placement that made one", () => {
    // Row 1 already holds an E at column 6.
    const s = run([
      { type: "tapCell", cell: FIRST },
      { type: "pressLetter", letter: "e" },
    ]);
    expect(conflictCells(P.regions, s.entries).has(FIRST)).toBe(true);
    expect(conflictCells(P.regions, s.entries).has(5)).toBe(true);
    expect(s.conflicts).toBe(1);
  });
});

describe("hints", () => {
  it("fills the selected cell when it needs help, and locks it", () => {
    const s = run([{ type: "tapCell", cell: FIRST }, { type: "revealHint" }]);
    expect(s.entries[FIRST]).toBe("s");
    expect(s.hints).toBe(1);
    expect(isLocked(s, FIRST)).toBe(true);
    expect(s.feedback).toMatchObject({ type: "hint", cell: FIRST });
  });

  it("otherwise fills the first cell that is empty or wrong", () => {
    const s = run([{ type: "revealHint" }]);
    expect(s.revealed).toEqual([blanks[0]]);
  });
});

describe("solving", () => {
  const fillAll = (letterAt: (c: number) => string): Action[] =>
    blanks.flatMap((c) => [
      { type: "tapCell", cell: c } as Action,
      { type: "pressLetter", letter: letterAt(c) } as Action,
    ]);

  it("solves when the board matches the solution, then freezes", () => {
    const s = run(fillAll((c) => P.solution[c]));
    expect(s.solved).toBe(true);
    expect(s.feedback?.type).toBe("solved");
    const after = run([{ type: "tapCell", cell: FIRST }, { type: "erase" }], s);
    expect(after).toBe(s);
  });

  it("a full board that isn't the solution says so", () => {
    // Swap the E/T rectangle: valid sudoku, but row 4 no longer spells LISTEN.
    const swap: Record<number, string> = { 21: "e", 22: "t", 33: "t", 34: "e" };
    const s = run(fillAll((c) => swap[c] ?? P.solution[c]));
    expect(conflictCells(P.regions, s.entries).size).toBe(0);
    expect(s.solved).toBe(false);
    expect(s.feedback?.type).toBe("full");
  });
});

describe("hydrate", () => {
  it("restores a save that fits the puzzle", () => {
    const entries = run([{ type: "tapCell", cell: FIRST }, { type: "pressLetter", letter: "s" }]).entries;
    const s = run([
      { type: "hydrate", entries, revealed: [], solved: false, hints: 2, conflicts: 1 },
    ]);
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
