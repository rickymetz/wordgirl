import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import type { Difficulty } from "../engine/types";
import {
  displayStreak,
  loadAllDailyProgress,
  loadDailyProgress,
  loadStats,
  recordDailySolved,
  recordDailyStarted,
  saveDailyProgress,
  type DailyProgress,
} from "./persistence";

const day = (
  difficulty: Difficulty,
  over: Partial<DailyProgress> = {},
): DailyProgress => ({
  dateKey: "2026-07-12",
  difficulty,
  dictVersion: DICT_VERSION,
  placed: [],
  solved: false,
  elapsedMs: 0,
  foundWords: [],
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 12, 12, 0, 0)); // 2026-07-12 noon
});
afterEach(() => {
  vi.useRealTimers();
});

describe("stats recording", () => {
  /** Mark a board of a date solved on disk (what the game does before
   * it reports the solve). */
  const solveBoard = (difficulty: Difficulty, dateKey = "2026-07-12") =>
    saveDailyProgress(day(difficulty, { dateKey, solved: true }));

  /** All three boards of a date solved on disk. */
  const solveDay = async (dateKey = "2026-07-12") => {
    for (const d of ["easy", "medium", "hard"] as Difficulty[]) {
      await solveBoard(d, dateKey);
    }
  };

  it("counts the DAY, once all three boards are done", async () => {
    // `solved` and the streak both count days — the unit `played` uses,
    // and the one the hub card has always used for "done". Both used to
    // move on whichever board was solved first, so a player who only
    // ever played easy kept a streak the card never called finished.
    await solveBoard("easy");
    let stats = await recordDailySolved("2026-07-12", "easy");
    expect(stats.solved).toBe(0);
    expect(stats.currentStreak).toBe(0); // two boards still standing

    await solveBoard("medium");
    stats = await recordDailySolved("2026-07-12", "medium");
    expect(stats.solved).toBe(0);
    expect(stats.currentStreak).toBe(0);

    await solveBoard("hard");
    stats = await recordDailySolved("2026-07-12", "hard");
    expect(stats.solved).toBe(1); // the DAY, not three boards
    expect(stats.currentStreak).toBe(1);
    expect(stats.lastSolvedDate).toBe("2026-07-12");

    // The next day needs all three again before it continues.
    vi.setSystemTime(new Date(2026, 6, 13, 12, 0, 0));
    await solveDay("2026-07-13");
    const next = await recordDailySolved("2026-07-13", "hard");
    expect(next.currentStreak).toBe(2);
  });

  it("counts a date as one play however many boards you open", async () => {
    expect(await recordDailyStarted("2026-07-12", "easy")).toBe(true);
    await saveDailyProgress(day("easy"));
    // Opening medium later is the same day's play. The return value
    // gates the analytics event, so it has to say so too.
    expect(await recordDailyStarted("2026-07-12", "medium")).toBe(false);
    await saveDailyProgress(day("medium"));
    expect(await recordDailyStarted("2026-07-12", "hard")).toBe(false);
    expect((await loadStats()).played).toBe(1);
  });

  it("an archive play of yesterday never borrows the grace day", async () => {
    vi.setSystemTime(new Date(2026, 6, 13, 12, 0, 0));
    await solveDay();
    const stats = await recordDailySolved("2026-07-12", "hard", false);
    expect(stats.solved).toBe(1);
    expect(stats.currentStreak).toBe(0);
    expect(stats.lastSolvedDate).toBeNull();
  });

  it("solving just after midnight still counts the session's day", async () => {
    vi.setSystemTime(new Date(2026, 6, 13, 0, 0, 30));
    await solveDay();
    const stats = await recordDailySolved("2026-07-12", "hard");
    expect(stats.currentStreak).toBe(1);
    expect(stats.lastSolvedDate).toBe("2026-07-12");
  });

  it("a lapsed streak displays as zero without a write", async () => {
    await solveDay();
    await recordDailySolved("2026-07-12", "hard");
    expect(displayStreak(await loadStats(), "2026-07-13")).toBe(1); // grace
    expect(displayStreak(await loadStats(), "2026-07-15")).toBe(0); // lapsed
  });
});

describe("archive roll-up", () => {
  it("merges the three boards under their DATE key for GameArchive", async () => {
    await saveDailyProgress(
      day("easy", { solved: true, elapsedMs: 60_000, foundWords: ["cat"] }),
    );
    await saveDailyProgress(
      day("medium", {
        placed: [{ dominoId: 0, anchor: { row: 0, col: 0 }, orientation: 0 }],
        elapsedMs: 30_000,
        foundWords: ["dog"],
      }),
    );
    const days = await loadAllDailyProgress();
    expect(Object.keys(days)).toEqual(["2026-07-12"]);
    const rolled = days["2026-07-12"];
    expect(rolled.solvedCount).toBe(1);
    expect(rolled.startedCount).toBe(2);
    expect(rolled.stale).toBe(false);
    expect(rolled.elapsedMs).toBe(90_000);
    expect(rolled.foundWords.sort()).toEqual(["cat", "dog"]);
  });

  it("sums action counters, but a day of pre-tracking saves stays null", async () => {
    // Legacy saves (no counters) must roll up as null, never zero —
    // a fake 0 would chart as the best day ever.
    await saveDailyProgress(day("easy", { solved: true }));
    await saveDailyProgress(day("medium", { solved: true }));
    let days = await loadAllDailyProgress();
    expect(days["2026-07-12"].moves).toBeNull();
    expect(days["2026-07-12"].rotations).toBeNull();
    expect(days["2026-07-12"].removals).toBeNull();
    expect(days["2026-07-12"].invalidBoards).toBeNull();
    expect(days["2026-07-12"].sessions).toBeNull();
    expect(days["2026-07-12"].solvedHour).toBeNull();

    // Counters sum when EVERY board of the date carries them.
    localStorage.clear();
    await saveDailyProgress(
      day("easy", {
        solved: true,
        moves: 4,
        rotations: 2,
        removals: 1,
        invalidBoards: 1,
        sessions: 1,
        solvedHour: 9,
      }),
    );
    await saveDailyProgress(
      day("medium", {
        solved: true,
        moves: 6,
        rotations: 0,
        removals: 0,
        invalidBoards: 0,
        sessions: 2,
        solvedHour: 21,
      }),
    );
    days = await loadAllDailyProgress();
    expect(days["2026-07-12"].moves).toBe(10);
    expect(days["2026-07-12"].rotations).toBe(2);
    expect(days["2026-07-12"].removals).toBe(1);
    expect(days["2026-07-12"].invalidBoards).toBe(1);
    expect(days["2026-07-12"].sessions).toBe(3);
    // Any solved board's hour represents the day.
    expect([9, 21]).toContain(days["2026-07-12"].solvedHour);

    // A MIXED date — one board's save predates tracking — is a gap:
    // a partial sum presented as the day's total is as fake as a zero.
    await saveDailyProgress(day("hard", { solved: true })); // legacy board
    days = await loadAllDailyProgress();
    expect(days["2026-07-12"].moves).toBeNull();
    expect(days["2026-07-12"].rotations).toBeNull();
    expect(days["2026-07-12"].sessions).toBeNull();
    // The hour is a merge, not a sum — it survives the mixed date.
    expect([9, 21]).toContain(days["2026-07-12"].solvedHour);
  });

  it("marks a day stale when any board is from an older dictionary", async () => {
    await saveDailyProgress(day("easy", { solved: true }));
    await saveDailyProgress(
      day("hard", { dictVersion: DICT_VERSION - 1, solved: true }),
    );
    // The old-dict board writes because nothing newer holds its key.
    const days = await loadAllDailyProgress();
    expect(days["2026-07-12"].stale).toBe(true);
  });
});

describe("multi-tab and version guards", () => {
  it("a stale tab's flush never overwrites a solved board", async () => {
    await saveDailyProgress(day("easy", { solved: true, elapsedMs: 60_000 }));
    await saveDailyProgress(day("easy", { elapsedMs: 100 }));
    expect((await loadDailyProgress("2026-07-12", "easy"))?.solved).toBe(true);
  });

  it("an older-build tab never clobbers a newer build's save", async () => {
    await saveDailyProgress(day("easy", { solved: true }));
    await saveDailyProgress(
      day("easy", { dictVersion: DICT_VERSION - 1, elapsedMs: 5 }),
    );
    const stored = await loadDailyProgress("2026-07-12", "easy");
    expect(stored?.solved).toBe(true);
    expect(stored?.dictVersion).toBe(DICT_VERSION);
  });

  it("stats merge over defaults and malformed saves load as null", async () => {
    localStorage.setItem(
      "wg:v1:local:doublet:stats",
      JSON.stringify({ played: 5 }),
    );
    const stats = await loadStats();
    expect(stats.played).toBe(5);
    expect(stats.bestStreak).toBe(0);
    localStorage.setItem(
      "wg:v1:local:doublet:daily:easy:2026-07-12",
      JSON.stringify({ dateKey: "2026-07-12", placed: "oops" }),
    );
    expect(await loadDailyProgress("2026-07-12", "easy")).toBeNull();
  });
});
