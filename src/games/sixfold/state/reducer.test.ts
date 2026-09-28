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
  LINES,
  lineCells,
  nextOpenCell,
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
  it("counts every square showing the letter, givens and typing alike", () => {
    const solved = P.solution;
    for (const l of P.letters) expect(keyUse(solved, l), l).toBe("done");
    const s = initialState(P);
    const open = [...P.letters].filter((l) => keyUse(s.entries, l) === "open");
    expect(open.length).toBeGreaterThan(0);
  });

  it("flags a letter placed more than six times", () => {
    const l = P.letters[0];
    const other = [...P.solution].findIndex((ch) => ch !== l);
    const extra = P.solution.slice(0, other) + l + P.solution.slice(other + 1);
    expect(keyUse(extra, l)).toBe("over");
    // ...and the letter it displaced drops back to open.
    expect(keyUse(extra, P.solution[other])).toBe("open");
    expect(keyUse(BLANK.repeat(P.solution.length), l)).toBe("open");
  });
});

describe("crossword navigation", () => {
  const dict = parseDictionary(
    readFileSync(new URL("../../../lib/words/dictionary.txt", import.meta.url), "utf8"),
  );
  const day = dailyPuzzle(dict, "2026-09-01").puzzle;
  const fresh = () => initialState(day);
  const open = (s: GameState, c: number) => s.entries[c] === BLANK && !isLocked(s, c);
  const firstOpen = (s: GameState) => [...s.entries].findIndex((_, c) => open(s, c));
  const letterFor = (s: GameState, c: number) => s.puzzle.solution[c];

  it("re-tapping the selected square flips across/down", () => {
    const c = firstOpen(fresh());
    const s = run([{ type: "tapCell", cell: c }], fresh());
    expect(s.dir).toBe("across");
    expect(run([{ type: "tapCell", cell: c }], s).dir).toBe("down");
    expect(run([{ type: "tapCell", cell: c }, { type: "tapCell", cell: c }], s).dir).toBe("across");
  });

  it("typing advances to the next empty square along the line, then the next line", () => {
    let s = fresh();
    const c = firstOpen(s);
    s = run([{ type: "tapCell", cell: c }], s);
    // Walk the board typing the right letter each time: every step lands
    // on an empty square, following nextOpenCell, until the solve.
    for (let i = 0; i < 40 && !s.solved; i++) {
      const at = s.selected!;
      expect(open(s, at), `step ${i}`).toBe(true);
      const want = nextOpenCell(
        { ...s, entries: s.entries.slice(0, at) + letterFor(s, at) + s.entries.slice(at + 1) },
        at,
        s.dir,
      );
      s = run([{ type: "pressLetter", letter: letterFor(s, at) }], s);
      if (!s.solved) expect(s.selected).toBe(want!.cell);
    }
    expect(s.solved).toBe(true);
  });

  it("backspace on the square auto-advance moved to undoes the letter just typed", () => {
    const c = firstOpen(fresh());
    const s = run([
      { type: "tapCell", cell: c },
      { type: "pressLetter", letter: day.letters[0] },
      { type: "erase" },
    ], fresh());
    expect(s.selected).toBe(c);
    expect(s.entries[c]).toBe(BLANK);
  });

  it("next/previous line steps through all six rows, then all six columns, and wraps", () => {
    let s = run([{ type: "tapCell", cell: 0 }], fresh());
    const seen: string[] = [];
    for (let i = 0; i < LINES.length; i++) {
      s = run([{ type: "stepLine", delta: 1 }], s);
      const line = LINES[(i + 1) % LINES.length];
      expect(lineCells(line)).toContain(s.selected);
      expect(s.dir).toBe(line.dir);
      seen.push(`${line.dir}${line.index}`);
    }
    expect(new Set(seen).size).toBe(12);
    // Back one from row 1 wraps to column 6.
    const back = run([{ type: "tapCell", cell: 1 }, { type: "stepLine", delta: -1 }], fresh());
    expect(back.dir).toBe("down");
    expect(lineCells({ dir: "down", index: 5 })).toContain(back.selected);
  });

  it("a stepped-to line selects its first empty square", () => {
    const s = run([{ type: "tapCell", cell: 0 }, { type: "stepLine", delta: 1 }], fresh());
    const row = lineCells({ dir: "across", index: 1 });
    expect(s.selected).toBe(row.find((c) => open(s, c)) ?? row[0]);
  });
});
