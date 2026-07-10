import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import { buildLexicon, lexiconItems } from "./lexicon";
import { dailySeed, generateBackwords, solveBank } from "./generator";
import { toMultiset } from "./types";

const dict = parseDictionary(
  readFileSync(
    new URL("../../../lib/words/dictionary.txt", import.meta.url),
    "utf8",
  ),
);
const lexicon = buildLexicon(dict);
const items = lexiconItems(lexicon);

describe("lexicon", () => {
  it("holds pairs under both orientations with one shared cost", () => {
    const pots = lexicon.get("pots");
    const stop = lexicon.get("stop");
    expect(pots?.kind).toBe("pair");
    expect(stop?.kind).toBe("pair");
    expect(pots?.cost).toBe(stop?.cost);
    expect(pots?.words).toEqual(["pots", "stop"]);
  });

  it("places palindromes by their visible half", () => {
    // Odd: middle letter is placed (sits on the mirror line).
    expect(lexicon.get("mo")?.words).toEqual(["mom"]);
    expect(lexicon.get("lev")?.words).toEqual(["level"]);
    // Even: exactly the first half.
    expect(lexicon.get("no")?.words).toEqual(["noon"]);
    expect(lexicon.get("de")?.words).toEqual(["deed"]);
  });

  it("flags glyph-true rows for UPPERCASE letterforms only", () => {
    // The board renders caps: MOM, WOW, AHA, TIT survive a real mirror.
    expect(lexicon.get("mo")?.glyph).toBe(true);
    expect(lexicon.get("wo")?.glyph).toBe(true);
    expect(lexicon.get("ah")?.glyph).toBe(true); // aha — A mirrors in caps
    expect(lexicon.get("ti")?.glyph).toBe(true); // tit
    // L is NOT symmetric in caps (a mirror shows TI⅃, not TIL), and
    // B/D are not each other's uppercase mirror images.
    expect(lexicon.get("lit")?.glyph).toBe(false);
    expect(lexicon.get("loot")?.glyph).toBe(false);
    expect(lexicon.get("da")?.glyph).toBe(false); // DAD: D doesn't mirror
    expect(lexicon.get("was")?.glyph).toBe(false);
  });

  it("uses the common tier only", () => {
    // dub is bonus-tier, so bud/dub is not a placeable pair.
    expect(lexicon.get("bud")).toBeUndefined();
    // dab was allowlisted into the required tier (dict v8): bad|dab plays.
    expect(lexicon.get("bad")?.words).toEqual(["bad", "dab"]);
  });
});

describe("solveBank", () => {
  it("decomposes a hand-built bank and never repeats a row", () => {
    // mom (mo) + was/saw = m,o + a,s,w
    const bank = toMultiset([..."mo", ..."asw"]);
    const solutions = solveBank(bank, items);
    expect(solutions.length).toBeGreaterThanOrEqual(1);
    for (const sol of solutions) {
      const labels = sol.map((r) => r.words.join("/"));
      expect(new Set(labels).size).toBe(labels.length);
      const used = sol.flatMap((r) => [...r.cost]).sort();
      expect(used).toEqual([..."amosw"].sort());
    }
  });
});

describe("generateBackwords", () => {
  it("is deterministic for a given seed", () => {
    const a = generateBackwords(dict, dailySeed("2026-07-09"));
    const b = generateBackwords(dict, dailySeed("2026-07-09"));
    expect(a.bank).toEqual(b.bank);
    expect(a.seedRows).toEqual(b.seedRows);
  });

  it("holds the quality bands across a month of dailies", () => {
    for (let day = 1; day <= 31; day++) {
      const key = `2026-08-${String(day).padStart(2, "0")}`;
      const p = generateBackwords(dict, dailySeed(key));
      expect(p.bank.length).toBeGreaterThanOrEqual(8);
      expect(p.bank.length).toBeLessThanOrEqual(12);
      expect(p.solutionCount).toBeGreaterThanOrEqual(2);
      // Real strategy choice: at least two distinct row counts.
      expect(p.rowCounts.length).toBeGreaterThanOrEqual(2);
      // The bank is solvable by the same lexicon the player uses.
      const solutions = solveBank(toMultiset(p.bank), items, 1);
      expect(solutions.length).toBe(1);
    }
  });
});
