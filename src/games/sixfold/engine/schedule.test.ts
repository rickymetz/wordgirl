import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dateKeyRange } from "../../../lib/date";
import { puzzleKey } from "../../../lib/puzzleKey";
import { parseDictionary } from "../../../lib/words/dictionary";
import { CLUES, clueFor } from "./clues";
import { anagramFamilies } from "./families";
import { clueTurn, dailyPuzzle, scheduleSlot } from "./generator";
import { ARCHIVE_EPOCH, sixfoldPuzzleKey } from "../state/persistence";
import { SCHEDULE, type ScheduledFamily } from "./schedule";

const dict = parseDictionary(
  readFileSync(new URL("../../../lib/words/dictionary.txt", import.meta.url), "utf8"),
);
const families = anagramFamilies(dict);
const familyAt = (dateKey: string, schedule?: readonly ScheduledFamily[]) => {
  const s = scheduleSlot(dateKey, schedule);
  return s.order[s.index];
};

describe("SCHEDULE", () => {
  it("schedules exactly the families the dictionary makes", () => {
    // Promoting a word without scheduling its family (or the reverse)
    // fails here, not silently at runtime.
    expect(SCHEDULE.map((f) => f.letters).sort()).toEqual(families.map((f) => f.letters).sort());
  });

  it("has no duplicates and whole-number cycles", () => {
    expect(new Set(SCHEDULE.map((f) => f.letters)).size).toBe(SCHEDULE.length);
    for (const f of SCHEDULE) expect(Number.isInteger(f.since) && f.since >= 0).toBe(true);
  });

  it("gives every scheduled word at least two clues to rotate", () => {
    for (const f of families) for (const w of f.words) expect(CLUES[w]?.length, w).toBeGreaterThanOrEqual(2);
  });

  it("is FROZEN: the day-by-day sequence through 2027 never moves", () => {
    // Changing this hash reshuffles past days and strands archive saves.
    // If a change here is truly intended, it must happen before launch.
    const seq = dateKeyRange("2026-01-01", "2027-12-31").map((d) => familyAt(d));
    expect(puzzleKey(seq)).toBe("ub3us3");
  });
});

describe("past boards", () => {
  it("are FROZEN: every day's board and clue from the archive's first day on", () => {
    // The family hash above doesn't cover the BOARD: a tuning edit
    // (DAILY_DIFFICULTY, MAX_GRIDS), a generator change or a dictionary
    // edit regenerates past days, and every saved day then loads as a
    // different puzzle. If this moves, it must be on purpose, pre-launch.
    const [y, m, d] = ARCHIVE_EPOCH.split("-").map(Number);
    const end = new Date(Date.UTC(y, m - 1, d + 119)).toISOString().slice(0, 10);
    const days = dateKeyRange(ARCHIVE_EPOCH, end).map((k) => {
      const p = dailyPuzzle(dict, k).puzzle;
      return `${sixfoldPuzzleKey(p)}|${p.clue}`;
    });
    expect(puzzleKey(days)).toBe("1c4is63");
  }, 120_000);
});

describe("scheduleSlot", () => {
  it("plays every family once per cycle", () => {
    const F = SCHEDULE.length;
    const days = dateKeyRange("2026-01-01", "2026-12-31").slice(0, F);
    expect(new Set(days.map((d) => familyAt(d))).size).toBe(F);
  });

  it("appending a family with a future `since` leaves earlier cycles alone", () => {
    const grown = [...SCHEDULE, { letters: "zzzzzz", since: 3 }];
    const F = SCHEDULE.length;
    // Every day of cycles 0-2 is untouched.
    const early = dateKeyRange("2026-01-01", "2027-12-31").slice(0, 3 * F);
    expect(early.map((d) => familyAt(d, grown))).toEqual(early.map((d) => familyAt(d)));
    // ...and cycle 3 does include the newcomer.
    const cycle3 = dateKeyRange("2026-01-01", "2028-12-31").slice(3 * F, 4 * F + 1);
    expect(cycle3.map((d) => familyAt(d, grown))).toContain("zzzzzz");
  });
});

describe("clue rotation", () => {
  it("mixes the kinds within a cycle: roughly a third of days are cryptic", () => {
    // The trap this pins: with every family on the same rung, whole
    // five-month cycles went all-straight, then all-cryptic.
    const F = SCHEDULE.length;
    for (const start of ["2026-01-01", "2026-06-18", "2026-12-03"]) {
      const days = dateKeyRange(start, "2027-12-31").slice(0, F);
      const share = days.filter((d) => dailyPuzzle(dict, d).puzzle.clueCryptic).length / F;
      expect(share, start).toBeGreaterThan(0.2);
      expect(share, start).toBeLessThan(0.47);
    }
  }, 120_000);

  it("a family's clue advances each cycle it returns", () => {
    const F = SCHEDULE.length;
    const day0 = "2026-01-01";
    const [y, m, d] = day0.split("-").map(Number);
    const plus = (n: number) => new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
    // Find the day in cycle 1 that replays cycle 0's first family.
    const first = familyAt(day0);
    const again = dateKeyRange(plus(F), plus(2 * F - 1)).find((k) => familyAt(k) === first)!;
    const a = dailyPuzzle(dict, day0).puzzle;
    const b = dailyPuzzle(dict, again).puzzle;
    expect(a.clue).toBe(clueFor(a.cluedWord, clueTurn(a.letters, 0)).text);
    expect(b.clue).toBe(clueFor(b.cluedWord, clueTurn(b.letters, 1)).text);
    // Same clued word both times -> guaranteed different clue.
    if (a.cluedWord === b.cluedWord) expect(b.clue).not.toBe(a.clue);
  });
});
