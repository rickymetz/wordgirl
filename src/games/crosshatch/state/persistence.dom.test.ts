import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  displayStreak,
  loadAllDailyProgress,
  loadDailyProgress,
  loadStaleDailyProgress,
  loadStats,
  recordDailySolved,
  recordWordsProgress,
  saveDailyProgress,
} from "./persistence";
import { DICT_VERSION } from "../../../lib/words/dictionary";

const STATS_KEY = "wg:v1:local:crosshatch:stats";

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 6, 12, 0, 0)); // 2026-07-06 noon
});
afterEach(() => {
  vi.useRealTimers();
});

describe("stats recording", () => {
  it("a solve records stats correctly", async () => {
    await recordDailySolved("2026-07-06", 14);
    const stats = await loadStats();
    expect(stats.solved).toBe(1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.lastSolvedDate).toBe("2026-07-06");
  });

  it("solving just after midnight still counts the session's day", async () => {
    // dateKey froze at mount before midnight; the clock is now past it.
    vi.setSystemTime(new Date(2026, 6, 7, 0, 0, 30));
    const stats = await recordDailySolved("2026-07-06", 12);
    expect(stats.currentStreak).toBe(1);
    expect(stats.lastSolvedDate).toBe("2026-07-06");
    // The next evening's solve continues the streak.
    vi.setSystemTime(new Date(2026, 6, 7, 21, 0, 0));
    const next = await recordDailySolved("2026-07-07", 15);
    expect(next.currentStreak).toBe(2);
  });

  it("solving an old archive day counts totals but not the streak", async () => {
    await recordDailySolved("2026-07-06", 14);
    const stats = await recordDailySolved("2026-07-01", 10);
    expect(stats.solved).toBe(2);
    expect(stats.totalWords).toBe(24);
    expect(stats.currentStreak).toBe(1);
    expect(stats.lastSolvedDate).toBe("2026-07-06"); // never moves back
  });

  it("re-recording the same day is a no-op", async () => {
    await recordDailySolved("2026-07-06", 14);
    const stats = await recordDailySolved("2026-07-06", 14);
    expect(stats.solved).toBe(1);
  });

  it("an archive play of yesterday never borrows the grace day", async () => {
    // It's 2026-07-07; deliberately playing 07-06 from the archive
    // (allowGrace=false) counts totals but must not move the streak.
    vi.setSystemTime(new Date(2026, 6, 7, 12, 0, 0));
    const stats = await recordDailySolved("2026-07-06", 10, false);
    expect(stats.solved).toBe(1);
    expect(stats.currentStreak).toBe(0);
    expect(stats.lastSolvedDate).toBeNull();
  });

  it("post-solve words credit the lifetime total", async () => {
    await recordDailySolved("2026-07-06", 9);
    await recordWordsProgress(2);
    const stats = await loadStats();
    expect(stats.totalWords).toBe(11);
  });

  it("displayStreak zeroes a lapsed streak but keeps a live one", () => {
    const base = {
      played: 5,
      solved: 5,
      currentStreak: 4,
      bestStreak: 4,
      lastSolvedDate: "2026-07-06",
      bestRank: null,
      totalWords: 40,
    };
    expect(displayStreak(base, "2026-07-06")).toBe(4); // solved today
    expect(displayStreak(base, "2026-07-07")).toBe(4); // today still open
    expect(displayStreak(base, "2026-07-08")).toBe(0); // missed a day
    expect(
      displayStreak({ ...base, lastSolvedDate: null }, "2026-07-08"),
    ).toBe(0);
  });

  it("a stale tab's save never destroys another tab's words", async () => {
    // Tab A banked three words...
    await saveDailyProgress({
      dateKey: "2026-07-06",
      dictVersion: DICT_VERSION,
      foundWords: ["out", "tin", "van"],
      grid: {},
      revealed: {},
      solved: false,
      elapsedMs: 5000,
    });
    // ...tab B, hydrated earlier with one word, flushes its stale state.
    await saveDailyProgress({
      dateKey: "2026-07-06",
      dictVersion: DICT_VERSION,
      foundWords: ["out"],
      grid: {},
      revealed: {},
      solved: false,
      elapsedMs: 9000,
    });
    const saved = await loadDailyProgress("2026-07-06");
    expect(saved?.foundWords).toEqual(["out", "tin", "van"]);
  });

  it("a pre-v17 save is a record, not resumable progress", async () => {
    // The v17 generator change rewrote every date's puzzle, so the
    // save's puzzleKey can't match — it must not hydrate the new
    // puzzle, but it must survive as history (and as the
    // already-counted marker, so replaying doesn't re-count "played").
    await saveDailyProgress({
      dateKey: "2026-07-06",
      dictVersion: 16,
      puzzleKey: "old-key",
      foundWords: ["kagu", "habu"],
      grid: {},
      revealed: {},
      solved: true,
      elapsedMs: 5000,
    });
    expect(await loadDailyProgress("2026-07-06", "new-key")).toBeNull();
    const record = await loadStaleDailyProgress("2026-07-06", "new-key");
    expect(record?.foundWords).toEqual(["kagu", "habu"]);
    expect(record?.solved).toBe(true);
  });

  it("flags pre-v17 saves stale even when they carry a puzzleKey", async () => {
    // v17 moved crosshatch generation to the required tier, so every
    // date's puzzle changed. The listing can't compare puzzleKeys
    // without regenerating 200+ puzzles — the version is the marker.
    await saveDailyProgress({
      dateKey: "2026-07-06",
      dictVersion: 16,
      puzzleKey: "abc123",
      foundWords: ["kagu", "habu"],
      grid: {},
      revealed: {},
      solved: true,
      elapsedMs: 5000,
    });
    await saveDailyProgress({
      dateKey: "2026-07-07",
      dictVersion: DICT_VERSION,
      puzzleKey: "def456",
      foundWords: ["paw", "raw"],
      grid: {},
      revealed: {},
      solved: true,
      elapsedMs: 5000,
    });
    const days = await loadAllDailyProgress();
    expect(days["2026-07-06"].stale).toBe(true);
    expect(days["2026-07-06"].foundWords).toEqual(["kagu", "habu"]); // record kept
    expect(days["2026-07-07"].stale).toBe(false);
  });

  it("loadStats merges older blobs over defaults", async () => {
    localStorage.setItem(
      STATS_KEY,
      JSON.stringify({ played: 3, solved: 2, currentStreak: 2 }),
    );
    const stats = await loadStats();
    expect(stats.played).toBe(3);
    expect(stats.totalWords).toBe(0); // missing field gets its default
    expect(stats.bestRank).toBeNull();
  });
});

describe("save validation", () => {
  it("rejects a save with a malformed revealed field", async () => {
    localStorage.setItem(
      "wg:v1:local:crosshatch:daily:2026-07-06",
      JSON.stringify({
        dateKey: "2026-07-06",
        dictVersion: DICT_VERSION,
        foundWords: ["out"],
        grid: {},
        revealed: "corrupted",
        solved: false,
        elapsedMs: 1000,
      }),
    );
    expect(await loadDailyProgress("2026-07-06")).toBeNull();
  });

  it("accepts a save without revealed (pre-hints era)", async () => {
    localStorage.setItem(
      "wg:v1:local:crosshatch:daily:2026-07-06",
      JSON.stringify({
        dateKey: "2026-07-06",
        dictVersion: DICT_VERSION,
        foundWords: ["out"],
        grid: {},
        solved: false,
        elapsedMs: 1000,
      }),
    );
    expect(await loadDailyProgress("2026-07-06")).not.toBeNull();
  });
});
