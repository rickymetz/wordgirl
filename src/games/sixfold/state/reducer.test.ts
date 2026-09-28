import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import { dailyPuzzle } from "../engine/generator";
import { cluedCells, hiddenCells } from "../engine/hints";
import { TUTORIAL_PUZZLE as P } from "../engine/tutorial";
import type { SixfoldPuzzle } from "../engine/types";
import {
  BLANK,
  conflictCells,
  gameReducer,
  initialState,
  isLocked,
  isSolvedBoard,
  keyUse,
  lineCells,
  nextOpenCell,
  wordLines,
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

  it("with no selection a letter writes nothing but says so; letters not in the set are ignored", () => {
    const none = run([{ type: "pressLetter", letter: "s" }]);
    expect(none.entries).toBe(initialState(P).entries);
    expect(none.feedback).toMatchObject({ type: "noCell" });
    expect(run([{ type: "erase" }]).feedback).toMatchObject({ type: "noCell" });
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

  it("re-tapping the selected cell keeps it; keyboard focus only ever selects", () => {
    expect(run([{ type: "tapCell", cell: 3 }, { type: "tapCell", cell: 3 }]).selected).toBe(3);
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

/** Every sudoku-valid completion of a puzzle's givens (sudoku alone
 *  leaves only a handful — that's the difficulty cap). */
function completions(p: SixfoldPuzzle): string[] {
  const cells = [...p.solution].map((ch, c) => (p.givens.includes(c) ? ch : BLANK));
  const out: string[] = [];
  const rec = (c: number) => {
    if (c === cells.length) return void out.push(cells.join(""));
    if (cells[c] !== BLANK) return rec(c + 1);
    for (const ch of p.letters) {
      cells[c] = ch;
      if (!conflictCells(p.regions, cells.join("")).has(c)) rec(c + 1);
    }
    cells[c] = BLANK;
  };
  rec(0);
  return out;
}

describe("a second grid that keeps every rule", () => {
  const dict = parseDictionary(
    readFileSync(new URL("../../../lib/words/dictionary.txt", import.meta.url), "utf8"),
  );
  const spell = (e: string, cells: number[]) => cells.map((c) => e[c]).join("");

  // The diagonal is not a sudoku unit, so it may repeat a letter; these
  // days have a completion whose clued row is right and whose diagonal is
  // a real repeat-letter word the setter's grid doesn't use.
  const DAYS: [string, string, string][] = [
    ["2026-03-19", "pagers", "papers"],
    ["2026-05-17", "others", "otters"],
    ["2026-07-10", "pagers", "parers"],
    ["2026-08-09", "hoarse", "hearse"],
    ["2026-11-23", "sailer", "siller"],
  ];

  it.each(DAYS)("%s: accepts %s's alternative, %s, as a solve", (date, setter, alt) => {
    const p = dailyPuzzle(dict, date).puzzle;
    expect(p.col).toBe(-1);
    expect(p.hiddenWord).toBe(setter);
    const grids = completions(p);
    const second = grids.find(
      (e) => spell(e, cluedCells(p)) === p.cluedWord && spell(e, hiddenCells(p)) === alt,
    );
    expect(second).toBeDefined();
    expect(second).not.toBe(p.solution);
    expect(isSolvedBoard(p, second!)).toBe(true);
    expect(wrongLines(p, second!)).toEqual([]);

    // Played in, not just checked: typing the second grid solves the day.
    const blanksHere = [...Array(36).keys()].filter((c) => !p.givens.includes(c));
    const s = blanksHere.reduce<GameState>(
      (st, c) =>
        gameReducer(gameReducer(st, { type: "select", cell: c }), {
          type: "pressLetter",
          letter: second![c],
        }),
      initialState(p),
    );
    expect(s.solved).toBe(true);
    expect(s.feedback?.type).toBe("solved");
    // ...and a save of it hydrates as solved.
    const h = gameReducer(initialState(p), { type: "hydrate", entries: second!, revealed: [], solved: true });
    expect(h.solved).toBe(true);

    // Every other completion breaks a stated rule, and wrongLines names
    // exactly the lines that do — never one that spells an allowed word.
    const allowed = new Set(p.lineWords);
    for (const e of grids) {
      const clueOk = spell(e, cluedCells(p)) === p.cluedWord;
      const hid = spell(e, hiddenCells(p));
      const hiddenOk = hid !== p.cluedWord && allowed.has(hid);
      expect(isSolvedBoard(p, e)).toBe(clueOk && hiddenOk);
      const named = wrongLines(p, e);
      expect(named.includes("clued")).toBe(!clueOk);
      expect(named.includes("hidden")).toBe(!hiddenOk);
    }
  });

  it("the allowed diagonal words are real dictionary words, from these letters only", () => {
    const p = dailyPuzzle(dict, "2026-03-19").puzzle;
    expect(p.lineWords).toContain("papers");
    expect(p.lineWords).toContain("pagers");
    for (const w of p.lineWords ?? []) {
      expect(dict.has(w)).toBe(true);
      expect([...w].every((ch) => p.letters.includes(ch))).toBe(true);
    }
  });

  it("still refuses a full board whose diagonal is no word", () => {
    const p = dailyPuzzle(dict, "2026-03-19").puzzle;
    const bad = completions(p).find(
      (e) => spell(e, cluedCells(p)) === p.cluedWord && !isSolvedBoard(p, e),
    );
    expect(bad).toBeDefined();
    expect(wrongLines(p, bad!)).toEqual(["hidden"]);
    expect(isSolvedBoard(p, p.solution)).toBe(true);
  });
});

describe("keyUse", () => {
  const R = P.regions;
  it("a letter on six squares with no clash is done", () => {
    for (const l of P.letters) expect(keyUse(P.solution, l, conflictCells(R, P.solution)), l).toBe("done");
    const s = initialState(P);
    expect([...P.letters].some((l) => keyUse(s.entries, l, conflictCells(R, s.entries)) === "open")).toBe(true);
    expect(keyUse(BLANK.repeat(P.solution.length), P.letters[0], conflictCells(R, BLANK.repeat(P.solution.length)))).toBe("open");
  });

  it("six with a clash, or more than six, is over — never greyed as finished", () => {
    // Swap two squares of row 1: every count stays six, but each of the
    // two letters now repeats in its new column.
    const [a, b] = [P.solution[0], P.solution[1]];
    const swapped = b + a + P.solution.slice(2);
    expect(keyUse(swapped, a, conflictCells(R, swapped))).toBe("over");
    expect(keyUse(swapped, b, conflictCells(R, swapped))).toBe("over");
    const other = [...P.solution].findIndex((ch) => ch !== a);
    const seven = P.solution.slice(0, other) + a + P.solution.slice(other + 1);
    expect(keyUse(seven, a, conflictCells(R, seven))).toBe("over");
    expect(keyUse(seven, P.solution[other], conflictCells(R, seven))).toBe("open");
  });
});

describe("crossword navigation", () => {
  const dict = parseDictionary(
    readFileSync(new URL("../../../lib/words/dictionary.txt", import.meta.url), "utf8"),
  );
  const day = dailyPuzzle(dict, "2026-09-01").puzzle; // hidden word down a column
  const diag = dailyPuzzle(dict, "2026-09-04").puzzle; // hidden word on the diagonal
  const fresh = (p = day) => initialState(p);
  const open = (s: GameState, c: number) => s.entries[c] === BLANK && !isLocked(s, c);
  const [cluedLine, hiddenLine] = wordLines(day);
  const cluedOpen = (s: GameState) => lineCells(cluedLine).filter((c) => open(s, c));
  const right = (s: GameState, c: number) => s.puzzle.solution[c];
  // A square on neither word.
  const plain = [...Array(36).keys()].find(
    (c) =>
      open(fresh(), c) &&
      !lineCells(cluedLine).includes(c) &&
      !lineCells(hiddenLine).includes(c),
  )!;

  it("re-tapping the selected square flips across/down", () => {
    const s = run([{ type: "tapCell", cell: plain }], fresh());
    expect(s.dir).toBe("across");
    expect(run([{ type: "tapCell", cell: plain }], s).dir).toBe("down");
    expect(run([{ type: "tapCell", cell: plain }, { type: "tapCell", cell: plain }], s).dir).toBe("across");
  });

  it("typing on a word advances to its next empty square, and stays in the word", () => {
    const [first, second] = cluedOpen(fresh());
    expect(second).toBeDefined();
    let s = run([{ type: "tapCell", cell: first }], fresh());
    expect(s.dir).toBe("across");
    s = run([{ type: "pressLetter", letter: right(s, first) }], s);
    expect(s.selected).toBe(second);
    expect(s.advancedFrom).toEqual({ cell: first, dir: "across" });
    // Fill the rest of the word: the cursor never leaves the row.
    for (let i = 0; i < 6 && s.selected !== null && open(s, s.selected); i++) {
      s = run([{ type: "pressLetter", letter: right(s, s.selected!) }], s);
      expect(lineCells(cluedLine)).toContain(s.selected);
    }
  });

  it("typing off the words, or over a filled square, leaves the cursor put", () => {
    let s = run([{ type: "tapCell", cell: plain }, { type: "pressLetter", letter: right(fresh(), plain) }], fresh());
    expect(s.selected).toBe(plain);
    // Overwrite on the clued row: the fix keeps the cursor.
    const [first] = cluedOpen(fresh());
    s = run([{ type: "tapCell", cell: first }, { type: "pressLetter", letter: day.letters[0] }], fresh());
    s = run([{ type: "tapCell", cell: first }, { type: "pressLetter", letter: day.letters[1] }], s);
    expect(s.selected).toBe(first);
  });

  it("the first tap on the square auto-advance moved to doesn't flip; the next does", () => {
    const [first, second] = cluedOpen(fresh());
    let s = run([{ type: "tapCell", cell: first }, { type: "pressLetter", letter: right(fresh(), first) }], fresh());
    expect(s.selected).toBe(second);
    s = run([{ type: "tapCell", cell: second }], s);
    expect(s.dir).toBe("across");
    expect(run([{ type: "tapCell", cell: second }], s).dir).toBe("down");
  });

  it("backspace undoes only the letter auto-advance just moved past", () => {
    const [first, second] = cluedOpen(fresh());
    const typed = run(
      [{ type: "tapCell", cell: first }, { type: "pressLetter", letter: right(fresh(), first) }],
      fresh(),
    );
    const back = run([{ type: "erase" }], typed);
    expect(back.selected).toBe(first);
    expect(back.dir).toBe("across");
    expect(back.entries[first]).toBe(BLANK);
    // With nothing to undo, backspace on an empty square does nothing.
    expect(run([{ type: "erase" }], back)).toBe(back);
    // Delete clears where it is and never steps back.
    const del = run([{ type: "erase", here: true }], typed);
    expect(del.selected).toBe(second);
    expect(del.entries[first]).toBe(right(fresh(), first));
  });

  it("selecting a square on one word turns to follow that word", () => {
    const c = lineCells(hiddenLine).find((x) => open(fresh(), x) && !lineCells(cluedLine).includes(x))!;
    const s = run([{ type: "tapCell", cell: c }], fresh());
    expect(s.dir).toBe("down");
  });

  it("the stepper jumps between the two words, landing on an empty square", () => {
    let s = run([{ type: "stepLine", delta: 1 }], fresh());
    expect(lineCells(cluedLine)).toContain(s.selected);
    expect(open(s, s.selected!)).toBe(true);
    s = run([{ type: "stepLine", delta: 1 }], s);
    expect(lineCells(hiddenLine)).toContain(s.selected);
    expect(s.dir).toBe("down");
    s = run([{ type: "stepLine", delta: -1 }], s);
    expect(lineCells(cluedLine)).toContain(s.selected);
  });

  it("on a diagonal day the diagonal is a direction and a stepper stop", () => {
    const [, diagLine] = wordLines(diag);
    expect(diagLine.dir).toBe("diagonal");
    const onDiag = lineCells(diagLine).find((c) => open(fresh(diag), c) && Math.floor(c / 6) !== diag.row)!;
    // Arriving on the diagonal turns to it.
    let s = run([{ type: "tapCell", cell: onDiag }], fresh(diag));
    expect(s.dir).toBe("diagonal");
    // Re-tapping cycles through all three.
    s = run([{ type: "tapCell", cell: onDiag }], s);
    expect(s.dir).toBe("across");
    s = run([{ type: "tapCell", cell: onDiag }], s);
    expect(s.dir).toBe("down");
    s = run([{ type: "tapCell", cell: onDiag }], s);
    expect(s.dir).toBe("diagonal");
    // Typing runs along the diagonal.
    const next = nextOpenCell({ ...s, entries: s.entries.slice(0, onDiag) + "x" + s.entries.slice(onDiag + 1) }, onDiag, "diagonal");
    s = run([{ type: "pressLetter", letter: right(s, onDiag) }], s);
    if (next !== null) expect(s.selected).toBe(next);
    const stepped = run([{ type: "stepLine", delta: 1 }, { type: "stepLine", delta: 1 }], fresh(diag));
    expect(stepped.dir).toBe("diagonal");
  });

  it("a hint that fills the selected square steps the selection on along its line", () => {
    // Find a board state where the hint lands on the selected square.
    const s = fresh();
    let hit: GameState | null = null;
    for (let c = 0; c < 36 && !hit; c++) {
      if (!open(s, c)) continue;
      const sel = run([{ type: "tapCell", cell: c }], s);
      const after = run([{ type: "revealHint" }], sel);
      if (after.revealed.includes(c)) hit = after;
    }
    expect(hit).not.toBeNull();
    const h = hit!;
    expect(isLocked(h, h.selected!)).toBe(false);
  });

  it("on a diagonal day, arriving at the row/diagonal crossing takes a word direction", () => {
    const [clued] = wordLines(diag);
    const crossing = diag.row * 6 + diag.row;
    const above = ((diag.row + 5) % 6) * 6 + diag.row;
    const s = run(
      [
        { type: "tapCell", cell: above },
        { type: "tapCell", cell: above },
        { type: "tapCell", cell: above },
        { type: "move", dRow: 1, dCol: 0 },
      ],
      fresh(diag),
    );
    expect(s.selected).toBe(crossing);
    expect(["across", "diagonal"]).toContain(s.dir);
    expect(clued.dir).toBe("across");
  });

  it("a hint leaves the player's selection where it was", () => {
    const s = run([{ type: "tapCell", cell: plain }, { type: "revealHint" }], fresh());
    expect(s.selected).toBe(plain);
    expect(s.revealed).toHaveLength(1);
  });
});
