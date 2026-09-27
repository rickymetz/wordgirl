import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDictionary } from "../../../lib/words/dictionary";
import { seededRandom, shuffle } from "../../../lib/random";
import { dateKeyRange } from "../../../lib/date";
import {
  buildLexicon,
  commonWords,
  LEXICON_V2_EPOCH,
  lexiconItems,
  lexiconVersionFor,
  MIRROR_WORDS,
  MIRROR_WORDS_V2,
} from "./lexicon";
import {
  dailySeed,
  generatePierglass,
  minRows,
  parSolution,
  practiceSeed,
  solveBank,
} from "./generator";
import { pierglassPuzzleKey } from "../state/persistence";
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
      const p = generatePierglass(dict, dailySeed(key), items);
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

describe("parSolution", () => {
  it("returns a real par-row decomposition on generated days", () => {
    for (let day = 1; day <= 20; day++) {
      const key = `2026-09-${String(day).padStart(2, "0")}`;
      const p = generatePierglass(dict, dailySeed(key), items);
      const sol = parSolution(toMultiset(p.bank), items, p.parRows);
      // The reveal shows this to the player, so it must exist, hit par
      // exactly, spend the bank exactly, and never repeat a row.
      expect(sol, `${key}: no par solution found`).not.toBeNull();
      expect(sol!.length).toBe(p.parRows);
      expect(sol!.flatMap((r) => [...r.cost]).sort()).toEqual([...p.bank]);
      const labels = sol!.map((r) => r.words.join("/"));
      expect(new Set(labels).size).toBe(labels.length);
    }
  });

  it("is null for an infeasible budget", () => {
    // mom (mo) + was/saw needs two rows; one row cannot spend all five.
    const bank = toMultiset([..."mo", ..."asw"]);
    expect(parSolution(bank, items, 1)).toBeNull();
  });

  it("stays exact under a shuffled item order (the reveal shuffles per day)", () => {
    const rng = seededRandom("reveal-shuffle-test");
    for (let day = 1; day <= 5; day++) {
      const key = `2026-10-${String(day).padStart(2, "0")}`;
      const p = generatePierglass(dict, dailySeed(key), items);
      const sol = parSolution(
        toMultiset(p.bank),
        shuffle([...items], rng),
        p.parRows,
      );
      expect(sol).not.toBeNull();
      expect(sol!.length).toBe(p.parRows);
      expect(sol!.flatMap((r) => [...r.cost]).sort()).toEqual([...p.bank]);
    }
  });
});

describe("generatePierglass", () => {
  it("is deterministic for a given seed", () => {
    const a = generatePierglass(dict, dailySeed("2026-07-09"));
    const b = generatePierglass(dict, dailySeed("2026-07-09"));
    expect(a.bank).toEqual(b.bank);
    expect(a.seedRows).toEqual(b.seedRows);
  });

  it("holds the quality bands across a month of dailies", () => {
    for (let day = 1; day <= 31; day++) {
      const key = `2026-08-${String(day).padStart(2, "0")}`;
      const p = generatePierglass(dict, dailySeed(key));
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

describe("lexicon v2 (dated extension)", () => {
  const lexiconV2 = buildLexicon(dict, 2);
  const itemsV2 = lexiconItems(lexiconV2);

  it("gates the extension by date, practice on the newest", () => {
    expect(lexiconVersionFor("2026-09-27")).toBe(1);
    expect(lexiconVersionFor(LEXICON_V2_EPOCH)).toBe(2);
    expect(lexiconVersionFor("2027-01-01")).toBe(2);
    expect(lexiconVersionFor(null)).toBe(2);
  });

  it("keeps every v2 word real, new, and paired", () => {
    const v1 = commonWords(dict, 1);
    const v2 = commonWords(dict, 2);
    for (const w of MIRROR_WORDS_V2) {
      expect(dict.has(w), `${w} is not in the dictionary`).toBe(true);
      expect(v1.has(w), `${w} already plays in v1`).toBe(false);
      // Both readings play: a row shows both, so a half-admitted pair
      // would still say "too rare" for the side left out.
      const r = [...w].reverse().join("");
      expect(v2.has(r), `${w}'s reflection ${r} doesn't play`).toBe(true);
    }
    expect(new Set(MIRROR_WORDS_V2).size).toBe(MIRROR_WORDS_V2.length);
  });

  it("admits the everyday pairs v1 refused, and only from v2", () => {
    for (const w of ["dew", "diva", "loops", "span", "tram", "keel", "sap"]) {
      expect(lexicon.get(w), `${w} plays in v1`).toBeUndefined();
      expect(lexiconV2.get(w)?.kind, `${w} missing from v2`).toBe("pair");
    }
    expect(lexiconV2.get("sag")?.words).toEqual(["sagas"]);
  });

  // Fingerprints computed from the lexicon BEFORE v2 existed. Pre-epoch
  // days are history — saves hydrate against these exact banks, and a
  // change here means a past day changed under its players.
  it("derives every pre-epoch day byte-identically to before v2", () => {
    const pinned: Record<string, [string, string, string[], number]> = {
      "2026-07-09": ["1elxhol", "aadilprst", ["laid", "parts"], 2],
      "2026-08-01": ["1udgu76", "aaajmrrst", ["smart", "raja"], 2],
      "2026-09-01": ["de2gck", "adeeehpry", ["deep", "yah", "er"], 3],
      "2026-09-15": ["ms5gf8", "bdeelopstu", ["spot", "lee", "bud"], 3],
      "2026-09-27": ["1sqzo2c", "abdeipttuy", ["tide", "but", "pay"], 3],
    };
    for (const [key, [pKey, bank, seedRows, par]] of Object.entries(pinned)) {
      const lex = buildLexicon(dict, lexiconVersionFor(key));
      const p = generatePierglass(dict, dailySeed(key), lexiconItems(lex));
      expect(pierglassPuzzleKey(p.bank), key).toBe(pKey);
      expect(p.bank.join(""), key).toBe(bank);
      expect(p.seedRows, key).toEqual(seedRows);
      expect(p.parRows, key).toBe(par);
    }
    // …and every day from launch up to the epoch, in one digest.
    const days = dateKeyRange("2026-06-01", "2026-09-27").map((key) => {
      const lex = buildLexicon(dict, lexiconVersionFor(key));
      const p = generatePierglass(dict, dailySeed(key), lexiconItems(lex));
      return [key, p.bank.join(""), p.seedRows.join(","), p.parRows,
        p.solutionCount, p.rowCounts.join(",")].join("|");
    });
    const digest = createHash("sha256").update(days.join("\n")).digest("hex");
    expect(digest.slice(0, 16)).toBe("642ab74a11175092");
  }, 60_000);

  it("plays the new pairs from the epoch on", () => {
    const p = generatePierglass(dict, dailySeed(LEXICON_V2_EPOCH), itemsV2);
    // ERGO|OGRE is v2-only: the epoch day already reaches for it.
    expect(p.seedRows).toContain("ergo");
    expect(lexicon.get("ergo")).toBeUndefined();
  });

  it("holds the quality bands on v2 dailies and practice", () => {
    const seeds = [
      ...dateKeyRange(LEXICON_V2_EPOCH, "2026-11-15").map(dailySeed),
      ...Array.from({ length: 20 }, (_, i) => practiceSeed(`t${i}`)),
    ];
    for (const seed of seeds) {
      const p = generatePierglass(dict, seed, itemsV2);
      expect(p.bank.length).toBeGreaterThanOrEqual(8);
      expect(p.bank.length).toBeLessThanOrEqual(12);
      expect(p.rowCounts.length, seed).toBeGreaterThanOrEqual(2);
      expect(p.parRows).toBeLessThanOrEqual(p.rowCounts[0]);
    }
  }, 60_000);
});
