import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  displayStreak,
  loadDailyProgress,
  loadStats,
  recordDailySolved,
  saveDailyProgress,
  type DailyProgress,
} from "./persistence";
import { DICT_VERSION } from "../../../lib/words/dictionary";

const day = (over: Partial<DailyProgress> = {}): DailyProgress => ({
  dateKey: "2026-07-06",
  dictVersion: DICT_VERSION,
  rows: [],
  solved: false,
  elapsedMs: 0,
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 6, 12, 0, 0)); // 2026-07-06 noon
});
afterEach(() => {
  vi.useRealTimers();
});

describe("stats recording", () => {
  it("solving just after midnight still counts the session's day", async () => {
    vi.setSystemTime(new Date(2026, 6, 7, 0, 0, 30));
    const stats = await recordDailySolved("2026-07-06", 61_000, 1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.lastSolvedDate).toBe("2026-07-06");
    vi.setSystemTime(new Date(2026, 6, 7, 21, 0, 0));
    const next = await recordDailySolved("2026-07-07", 45_000, 0);
    expect(next.currentStreak).toBe(2);
  });

  it("an archive play of yesterday never borrows the grace day", async () => {
    vi.setSystemTime(new Date(2026, 6, 7, 12, 0, 0));
    const stats = await recordDailySolved("2026-07-06", 30_000, 0, false);
    expect(stats.solved).toBe(1);
    expect(stats.currentStreak).toBe(0);
    expect(stats.lastSolvedDate).toBeNull();
  });

  it("re-recording the same day is a no-op", async () => {
    await recordDailySolved("2026-07-06", 40_000, 2);
    const stats = await recordDailySolved("2026-07-06", 40_000, 2);
    expect(stats.solved).toBe(1);
    expect(stats.glyphRows).toBe(2);
  });

  it("only TODAY's solve can claim the best time", async () => {
    await recordDailySolved("2026-07-06", 90_000, 0);
    // A blistering archive run of an old day: totals yes, record no.
    const stats = await recordDailySolved("2026-07-01", 5_000, 0, false);
    expect(stats.solved).toBe(2);
    expect(stats.bestTimeMs).toBe(90_000);
    // A faster run TODAY (replay records once, but a next-day daily
    // improves the record).
    vi.setSystemTime(new Date(2026, 6, 7, 12, 0, 0));
    const next = await recordDailySolved("2026-07-07", 30_000, 0);
    expect(next.bestTimeMs).toBe(30_000);
  });

  it("glyph rows accumulate across days", async () => {
    await recordDailySolved("2026-07-06", 40_000, 2);
    vi.setSystemTime(new Date(2026, 6, 7, 12, 0, 0));
    const stats = await recordDailySolved("2026-07-07", 40_000, 1);
    expect(stats.glyphRows).toBe(3);
  });

  it("a lapsed streak displays as zero without a write", async () => {
    await recordDailySolved("2026-07-06", 40_000, 0);
    expect(displayStreak(await loadStats(), "2026-07-07")).toBe(1); // grace
    expect(displayStreak(await loadStats(), "2026-07-09")).toBe(0); // lapsed
  });
});

describe("multi-tab guard", () => {
  it("a stale tab's flush never overwrites a solved day", async () => {
    await saveDailyProgress(
      day({ rows: ["mo", "was"], solved: true, elapsedMs: 60_000 }),
    );
    await saveDailyProgress(day({ rows: [], elapsedMs: 500 }), {
      rowsEdited: false,
    });
    const stored = await loadDailyProgress("2026-07-06");
    expect(stored?.solved).toBe(true);
    expect(stored?.rows).toEqual(["mo", "was"]);
  });

  it("an idle tab's empty flush never wipes another tab's rows", async () => {
    // Tab A committed rows; tab B (opened fresh, never edited) fires
    // its pagehide flush with an empty board.
    await saveDailyProgress(day({ rows: ["mo"], elapsedMs: 30_000 }), {
      rowsEdited: true,
    });
    await saveDailyProgress(day({ rows: [], elapsedMs: 800 }), {
      rowsEdited: false,
    });
    expect((await loadDailyProgress("2026-07-06"))?.rows).toEqual(["mo"]);
  });

  it("a deliberate take-back to zero rows DOES save", async () => {
    await saveDailyProgress(day({ rows: ["mo"], elapsedMs: 30_000 }), {
      rowsEdited: true,
    });
    await saveDailyProgress(day({ rows: [], elapsedMs: 31_000 }), {
      rowsEdited: true,
    });
    const stored = await loadDailyProgress("2026-07-06");
    expect(stored?.rows).toEqual([]);
    expect(stored?.elapsedMs).toBe(31_000);
  });

  it("a never-edited tab's STALE nonzero rows don't overwrite either", async () => {
    // Tab A hydrated 3 rows and never edited; tab B took two back.
    await saveDailyProgress(day({ rows: ["mo"], elapsedMs: 40_000 }), {
      rowsEdited: true,
    });
    await saveDailyProgress(
      day({ rows: ["mo", "was", "lit"], elapsedMs: 20_000 }),
      { rowsEdited: false },
    );
    expect((await loadDailyProgress("2026-07-06"))?.rows).toEqual(["mo"]);
  });

  it("a never-edited tab may refresh a save whose rows it agrees with", async () => {
    await saveDailyProgress(day({ rows: ["mo"], elapsedMs: 10_000 }), {
      rowsEdited: true,
    });
    // Same rows, newer clock: an elapsed-time flush is welcome.
    await saveDailyProgress(day({ rows: ["mo"], elapsedMs: 12_000 }), {
      rowsEdited: false,
    });
    expect((await loadDailyProgress("2026-07-06"))?.elapsedMs).toBe(12_000);
  });

  it("a rows-agreeing tab still can't regress the counters", async () => {
    // Tab A typed five rejected words (no rows change) and flushed;
    // tab B has the same rows but hydrated before the rejections.
    await saveDailyProgress(
      day({ rows: ["mo"], elapsedMs: 10_000, invalids: 5, sessions: 2 }),
      { rowsEdited: true },
    );
    await saveDailyProgress(
      day({ rows: ["mo"], elapsedMs: 12_000, invalids: 0, sessions: 2 }),
      { rowsEdited: false },
    );
    const stored = await loadDailyProgress("2026-07-06");
    expect(stored?.invalids).toBe(5);
    // A non-regressing refresh (same counters, newer clock) is welcome.
    await saveDailyProgress(
      day({ rows: ["mo"], elapsedMs: 14_000, invalids: 5, sessions: 2 }),
      { rowsEdited: false },
    );
    expect((await loadDailyProgress("2026-07-06"))?.elapsedMs).toBe(14_000);
  });

  it("an older-build tab never clobbers a newer build's save", async () => {
    await saveDailyProgress(
      day({ rows: ["mo"], solved: true, elapsedMs: 50_000 }),
    );
    // A tab still running the previous DICT_VERSION flushes.
    await saveDailyProgress(
      day({ dictVersion: DICT_VERSION - 1, rows: [], elapsedMs: 100 }),
      { rowsEdited: true },
    );
    const stored = await loadDailyProgress("2026-07-06");
    expect(stored?.solved).toBe(true);
    expect(stored?.dictVersion).toBe(DICT_VERSION);
  });
});

describe("save hygiene", () => {
  it("stats merge over defaults so new fields survive old saves", async () => {
    localStorage.setItem(
      "wg:v1:local:backwords:stats",
      JSON.stringify({ played: 4, solved: 3 }),
    );
    const stats = await loadStats();
    expect(stats.played).toBe(4);
    expect(stats.glyphRows).toBe(0);
    expect(stats.bestTimeMs).toBeNull();
  });

  it("a malformed day save loads as null instead of crashing", async () => {
    localStorage.setItem(
      "wg:v1:local:backwords:daily:2026-07-06",
      JSON.stringify({ dateKey: "2026-07-06", rows: "oops" }),
    );
    expect(await loadDailyProgress("2026-07-06")).toBeNull();
  });

  it("an old-dictionary save is not served as current progress", async () => {
    await saveDailyProgress(day({ dictVersion: DICT_VERSION - 1, rows: ["mo"] }));
    expect(await loadDailyProgress("2026-07-06")).toBeNull();
  });
});
