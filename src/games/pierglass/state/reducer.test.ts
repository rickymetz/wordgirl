import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import { buildLexicon, commonWords } from "../engine/lexicon";
import type { Puzzle } from "../engine/types";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import {
  gameReducer,
  glyphRowCount,
  initialState,
  type GameState,
} from "./reducer";

const dict = parseDictionary(
  readFileSync(
    new URL("../../../lib/words/dictionary.txt", import.meta.url),
    "utf8",
  ),
);
const lexicon = buildLexicon(dict);
const words = commonWords(dict);
const isWord = (w: string) => dict.has(w);

// Hand-built day: mom (mo) + lit/til + was/saw = m,o + i,l,t + a,s,w.
const puzzle: Puzzle = {
  seed: "test",
  dictVersion: DICT_VERSION,
  bank: [..."moiltasw"].sort(),
  seedRows: ["mo", "lit", "was"],
  solutionCount: 2,
  rowCounts: [3],
  parRows: 3,
};

let state: GameState;
const run = (...actions: Parameters<typeof gameReducer>[1][]) => {
  for (const a of actions) state = gameReducer(state, a);
};
const type = (word: string) =>
  [...word].map((letter) => ({ type: "typeLetter" as const, letter }));

beforeEach(() => {
  state = initialState({ puzzle, lexicon, words, isWord });
});

describe("pierglass reducer", () => {
  it("moves letters bank -> row -> bank", () => {
    run(...type("was"));
    expect(state.current).toBe("was");
    expect(state.bank.join("")).toBe("ilmot");
    run({ type: "backspace" });
    expect(state.current).toBe("wa");
    run({ type: "clearRow" });
    expect(state.current).toBe("");
    expect(state.bank.join("")).toBe("ailmostw"); // the full rack
  });

  it("refuses letters the bank doesn't hold", () => {
    run(...type("z"));
    expect(state.current).toBe("");
  });

  it("commits valid rows either orientation and solves on empty rack", () => {
    run(...type("saw"), { type: "commit" }); // reverse orientation of was
    expect(state.rows).toHaveLength(1);
    expect(state.lastResult?.type).toBe("committed");
    run(...type("mo"), { type: "commit" }); // palindrome half
    run(...type("lit"), { type: "commit" });
    expect(state.solved).toBe(true);
    expect(state.lastResult?.type).toBe("solved");
    // MOM survives a caps mirror; LIT does not (L isn't symmetric).
    expect(glyphRowCount(state.rows)).toBe(1);
  });

  it("rejects non-mirror words and duplicate rows", () => {
    run(...type("wilt"), { type: "commit" }); // a word, but tliw isn't
    expect(state.lastResult?.type).toBe("invalid");
    run({ type: "clearRow" }, ...type("was"), { type: "commit" });
    // s,a,w are spent — "saw" can't even be staged, so the row is empty.
    run(...type("saw"), { type: "commit" });
    expect(state.lastResult?.type).toBe("empty");
  });

  it("names the reading that fails on an invalid commit", () => {
    // MOST is a common word; its mirror TSOM isn't — blame the mirror.
    run(...type("most"), { type: "commit" });
    expect(state.lastResult).toMatchObject({
      type: "invalid",
      badWord: "tsom",
      reason: "notWord",
    });
    // OWT isn't a word itself (even though TWO is) — blame the staged word.
    run({ type: "clearRow" }, ...type("owt"), { type: "commit" });
    expect(state.lastResult).toMatchObject({
      type: "invalid",
      badWord: "owt",
      reason: "notWord",
    });
    // WILT is a real word (bonus tier) and must never be called a
    // non-word — its mirror TLIW is the failing reading.
    run({ type: "clearRow" }, ...type("wilt"), { type: "commit" });
    expect(state.lastResult).toMatchObject({
      type: "invalid",
      badWord: "tliw",
      reason: "notWord",
    });
    // MAT and TAM are both real, but TAM is bonus tier: the row fails
    // on rarity, not validity.
    run({ type: "clearRow" }, ...type("mat"), { type: "commit" });
    expect(state.lastResult).toMatchObject({
      type: "invalid",
      badWord: "tam",
      reason: "rare",
    });
  });

  it("rejects a duplicate row staged in its other orientation", () => {
    // Needs a second s/a/w so SAW can be staged after WAS commits.
    state = initialState({
      puzzle: { ...puzzle, bank: [..."moiltaswsaw"].sort() },
      lexicon,
      words,
      isWord,
    });
    run(...type("was"), { type: "commit" });
    expect(state.lastResult?.type).toBe("committed");
    run(...type("saw"), { type: "commit" });
    expect(state.lastResult?.type).toBe("duplicate");
    expect(state.rows).toHaveLength(1);
  });

  it("typing a palindrome in full commits it and refunds the extras", () => {
    // Needs a second M in the bank — palindromes repeat letters.
    state = initialState({
      puzzle: { ...puzzle, bank: [..."moiltaswmo"].sort() },
      lexicon,
      words,
      isWord,
    });
    run(...type("mom"), { type: "commit" });
    expect(state.lastResult?.type).toBe("committed");
    expect(state.rows[0]).toMatchObject({ place: "mo" });
    expect(state.rows[0].def.words).toEqual(["mom"]);
    // The extra M went home to the rack.
    expect(state.bank).toContain("m");
  });

  it("typing past a shared half reaches the LONGER palindrome", () => {
    state = initialState({
      puzzle: { ...puzzle, bank: [..."poopsi"].sort() },
      lexicon,
      words,
      isWord,
    });
    // The short reading owns the bare half...
    run(...type("po"), { type: "commit" });
    expect(state.rows[0].def.words).toEqual(["pop"]);
    // ...and one letter past the fold reaches POOP.
    run({ type: "breakRow", index: 0 }, ...type("poo"), { type: "commit" });
    expect(state.rows[0].def.words).toEqual(["poop"]);
    expect(state.rows[0].place).toBe("po");
    // Only the canonical two letters are spent; the extra O returned.
    expect(state.bank.join("")).toBe("iops");
  });

  it("unstages a mid-row tile back to the bank", () => {
    run(...type("was"), { type: "unstage", index: 1 }); // drag the A off
    expect(state.current).toBe("ws");
    expect(state.bank).toContain("a");
    run({ type: "unstage", index: 9 }); // out of range: no-op
    expect(state.current).toBe("ws");
  });

  it("breaks a committed row back into the bank", () => {
    run(...type("was"), { type: "commit" }, { type: "breakRow", index: 0 });
    expect(state.rows).toHaveLength(0);
    expect(state.bank.length).toBe(8);
  });

  it("hydrates saved placements and recomputes solved", () => {
    run({ type: "hydrate", places: ["mo", "lit", "was"], solved: true });
    expect(state.rows).toHaveLength(3);
    expect(state.bank).toHaveLength(0);
    expect(state.solved).toBe(true);
  });

  it("shadowed palindromes survive the save/hydrate round trip", () => {
    state = initialState({
      puzzle: { ...puzzle, bank: [..."poopsi"].sort() },
      lexicon,
      words,
      isWord,
    });
    // Saves store the FULL word for palindromes (rowSaveKey), so a
    // POOP row never reloads as POP.
    run({ type: "hydrate", places: ["poop", "pop", "si"], solved: false });
    expect(state.rows.map((r) => r.def.words[0])).toEqual([
      "poop",
      "pop",
      "sis",
    ]);
    // Both charge their canonical two letters.
    expect(state.rows.map((r) => r.place)).toEqual(["po", "po", "si"]);
    expect(state.bank).toHaveLength(0);
  });

  it("a save that decodes to duplicate rows starts the day fresh", () => {
    // Legacy/corrupt: two entries resolving to the same row must not
    // fabricate a duplicated board.
    run({ type: "hydrate", places: ["mo", "mo"], solved: false });
    expect(state.rows).toHaveLength(0);
  });

  it("re-committing a shared half offers the unplaced sibling", () => {
    state = initialState({
      puzzle: { ...puzzle, bank: [..."poopsi"].sort() },
      lexicon,
      words,
      isWord,
    });
    run(...type("po"), { type: "commit" }); // POP
    // The bank has no spare O to type "poo" — committing PO again
    // reaches POOP instead of stonewalling with a duplicate.
    run(...type("po"), { type: "commit" });
    expect(state.lastResult?.type).toBe("committed");
    expect(state.rows.map((r) => r.def.words[0])).toEqual(["pop", "poop"]);
    // A third PO has no sibling left: duplicate.
    run(...type("si"), { type: "commit" }); // spend the rest
    expect(state.solved).toBe(true);
  });

  it("a solved board is frozen", () => {
    run({ type: "hydrate", places: ["mo", "lit", "was"], solved: true });
    run({ type: "breakRow", index: 0 });
    expect(state.rows).toHaveLength(3);
  });

  it("counts rejected commits and take-backs for trends", () => {
    // Both failure reasons count; empty commits and duplicates don't.
    run(...type("most"), { type: "commit" }); // invalid (notWord)
    expect(state.invalids).toBe(1);
    run({ type: "clearRow" }, ...type("mat"), { type: "commit" }); // rare
    expect(state.invalids).toBe(2);
    run({ type: "clearRow" }, { type: "commit" }); // empty
    expect(state.invalids).toBe(2);
    expect(state.takeBacks).toBe(0);
    run(...type("was"), { type: "commit" }, { type: "breakRow", index: 0 });
    expect(state.takeBacks).toBe(1);
    run({ type: "breakRow", index: 5 }); // out of range: no-op
    expect(state.takeBacks).toBe(1);
  });

  it("revealHint places the next seedRow when letters are available", () => {
    run({ type: "revealHint" });
    expect(state.hints).toBe(1);
    expect(state.rows.length).toBe(1);
    expect(state.rows[0].def.place).toBe("mo");
    run({ type: "revealHint" });
    expect(state.hints).toBe(2);
    expect(state.rows.length).toBe(2);
  });

  it("revealHint falls back to solver when seedRow letters are unavailable", () => {
    // Commit "saw" (reverse orientation of the "was" seedRow pair).
    // This uses the same letters as "was" but is the same rowKey,
    // so "was" is marked placed. The remaining bank should still
    // allow two more hints via solver fallback.
    run(...type("saw"), { type: "commit" });
    expect(state.rows.length).toBe(1);
    // "was"/"saw" pair is placed; seedRows "mo" and "lit" should still
    // fit since their letters are untouched.
    run({ type: "revealHint" });
    expect(state.hints).toBe(1);
    expect(state.rows.length).toBe(2);
    run({ type: "revealHint" });
    expect(state.hints).toBe(2);
    expect(state.rows.length).toBe(3);
    expect(state.solved).toBe(true);
  });

  it("hydrate restores trend counters and defaults legacy saves to 0", () => {
    run({
      type: "hydrate",
      places: ["mo"],
      solved: false,
      takeBacks: 4,
      invalids: 2,
    });
    expect(state.takeBacks).toBe(4);
    expect(state.invalids).toBe(2);
    state = initialState({ puzzle, lexicon, words, isWord });
    run({ type: "hydrate", places: ["mo"], solved: false });
    expect(state.takeBacks).toBe(0);
    expect(state.invalids).toBe(0);
  });
});
