import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import { buildLexicon } from "../engine/lexicon";
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

// Hand-built day: mom (mo) + lit/til + was/saw = m,o + i,l,t + a,s,w.
const puzzle: Puzzle = {
  seed: "test",
  dictVersion: DICT_VERSION,
  bank: [..."moiltasw"].sort(),
  seedRows: ["mo", "lit", "was"],
  solutionCount: 2,
  rowCounts: [3],
};

let state: GameState;
const run = (...actions: Parameters<typeof gameReducer>[1][]) => {
  for (const a of actions) state = gameReducer(state, a);
};
const type = (word: string) =>
  [...word].map((letter) => ({ type: "typeLetter" as const, letter }));

beforeEach(() => {
  state = initialState({ puzzle, lexicon });
});

describe("backwords reducer", () => {
  it("moves letters bank -> row -> bank", () => {
    run(...type("was"));
    expect(state.current).toBe("was");
    expect(state.bank.join("")).toBe("ilmot");
    run({ type: "backspace" });
    expect(state.current).toBe("wa");
    run({ type: "clearRow" });
    expect(state.current).toBe("");
    expect(state.bank.join("")).toBe("ailmostw".replace("s", "s")); // full rack
    expect(state.bank.length).toBe(8);
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
    expect(glyphRowCount(state.rows)).toBe(2); // mom ✦, lit|til ✦
  });

  it("rejects non-mirror words and duplicate rows", () => {
    run(...type("wilt"), { type: "commit" }); // a word, but tliw isn't
    expect(state.lastResult?.type).toBe("invalid");
    run({ type: "clearRow" }, ...type("was"), { type: "commit" });
    // s,a,w are spent — "saw" can't even be staged, so the row is empty.
    run(...type("saw"), { type: "commit" });
    expect(state.lastResult?.type).toBe("empty");
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

  it("a solved board is frozen", () => {
    run({ type: "hydrate", places: ["mo", "lit", "was"], solved: true });
    run({ type: "breakRow", index: 0 });
    expect(state.rows).toHaveLength(3);
  });
});
