import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import { buildLexicon, lexiconItems, MIRROR_WORDS } from "./lexicon";
import { dailySeed, generateBackwords, minRows, solveBank } from "./generator";
import { toMultiset } from "./types";

const dict = parseDictionary(
  readFileSync(
    new URL("../../../lib/words/dictionary.txt", import.meta.url),
    "utf8",
  ),
);
const lexicon = buildLexicon(dict);
const items = lexiconItems(lexicon);
const required = new Set<string>();
for (const b of dict.required.buckets.values()) for (const w of b) required.add(w);

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

  it("aliases longer prefixes so shadowed palindromes stay reachable", () => {
    // POP owns the bare half; POO and POOP reach the longer word.
    expect(lexicon.get("po")?.words).toEqual(["pop"]);
    expect(lexicon.get("poo")?.words).toEqual(["poop"]);
    expect(lexicon.get("poop")?.words).toEqual(["poop"]);
    expect(lexicon.get("pee")?.words).toEqual(["peep"]);
    // Every palindrome also commits typed out in full.
    expect(lexicon.get("mom")?.words).toEqual(["mom"]);
    expect(lexicon.get("noon")?.words).toEqual(["noon"]);
    expect(lexicon.get("madam")?.words).toEqual(["madam"]);
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

  it("uses the common tier plus the hand-picked mirror words", () => {
    // dab was allowlisted into the required tier (dict v8): bad|dab plays.
    expect(lexicon.get("bad")?.words).toEqual(["bad", "dab"]);
    // dict v18: dub is still bonus-tier, but MIRROR_WORDS admits it, so
    // bud|dub plays — as do the long mirrors the required tier missed.
    expect(lexicon.get("bud")?.words).toEqual(["bud", "dub"]);
    expect(lexicon.get("straw")?.words).toEqual(["straw", "warts"]);
    expect(lexicon.get("diaper")?.words).toEqual(["diaper", "repaid"]);
    expect(lexicon.get("kaya")?.words).toEqual(["kayak"]);
    // An ENABLE obscurity is still not a word here, whichever side it
    // would sit on (seton, regna, deets — the v17 lesson).
    expect(lexicon.get("notes")).toBeUndefined();
    expect(lexicon.get("anger")).toBeUndefined();
    expect(lexicon.get("steed")).toBeUndefined();
  });

  it("keeps every mirror word real and every reflection playable", () => {
    for (const w of MIRROR_WORDS) {
      // A typo here would otherwise play as a word forever.
      expect(dict.has(w), `${w} is not in the dictionary`).toBe(true);
      // Each entry earns its place: it is a palindrome, or its reversal
      // is a word too (an entry whose pair has since been blocklisted
      // is dead weight the list should drop).
      const r = [...w].reverse().join("");
      expect(w === r || dict.has(r), `${w} has no mirror reading`).toBe(true);
      // Dead weight: a word later promoted to the required tier is
      // already in the set, so its entry here should be pruned.
      expect(required.has(w), `${w} is required-tier now`).toBe(false);
    }
    expect(new Set(MIRROR_WORDS).size).toBe(MIRROR_WORDS.length);
  });

  it("keeps a displaced pair reachable under its other orientation", () => {
    // A new palindrome can outrank a pair for a placement key (the
    // lexicon's documented collision rule): TENET takes "ten" from
    // TEN|NET. The pair must survive under "net", or a row the solver
    // still counts would be unplaceable.
    expect(lexicon.get("ten")?.words).toEqual(["tenet"]);
    expect(lexicon.get("net")?.words).toEqual(["net", "ten"]);
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

describe("minRows", () => {
  it("finds a shorter decomposition than the caller's upper bound", () => {
    // straw|warts (5 letters) + tit (2) clears it in two. The loose
    // upper bound stands in for a caller whose capped enumeration
    // never happened to surface the two-row split.
    const bank = toMultiset([..."straw", ..."ti"]);
    expect(minRows(bank, items, 4)).toBe(2);
  });

  it("returns the upper bound when nothing shorter exists", () => {
    // mom (mo) + was/saw: two rows, and no single row spends all five.
    const bank = toMultiset([..."mo", ..."asw"]);
    expect(minRows(bank, items, 2)).toBe(2);
  });

  it("agrees with the full enumeration on generated days", () => {
    for (let day = 1; day <= 20; day++) {
      const key = `2026-09-${String(day).padStart(2, "0")}`;
      const p = generateBackwords(dict, dailySeed(key), items);
      const counts = solveBank(toMultiset(p.bank), items, 400).map(
        (s) => s.length,
      );
      // Par must be REACHABLE — a target no decomposition meets is a lie.
      expect(p.parRows).toBe(Math.min(...counts));
      // …and a real target: some solve is worse than par, or the day
      // would have no choice to get right.
      expect(Math.max(...counts)).toBeGreaterThan(p.parRows);
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
