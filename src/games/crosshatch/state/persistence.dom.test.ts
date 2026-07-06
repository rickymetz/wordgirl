import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadDailyProgress,
  loadStats,
  recordDailySolved,
  recordRankImproved,
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
  it("a solve and a same-tick rank upgrade never lose a write", async () => {
    // The straight-to-perfect race: both fire without awaiting between
    // them. Serialization must let the upgrade see the solve's write.
    await Promise.all([
      recordDailySolved("2026-07-06", 14, "Genius"),
      recordRankImproved("Crosshatch"),
    ]);
    const stats = await loadStats();
    expect(stats.solved).toBe(1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.lastSolvedDate).toBe("2026-07-06");
    expect(stats.bestRank).toBe("Crosshatch");
  });

  it("solving just after midnight still counts the session's day", async () => {
    // dateKey froze at mount before midnight; the clock is now past it.
    vi.setSystemTime(new Date(2026, 6, 7, 0, 0, 30));
    const stats = await recordDailySolved("2026-07-06", 12, "Genius");
    expect(stats.currentStreak).toBe(1);
    expect(stats.lastSolvedDate).toBe("2026-07-06");
    // The next evening's solve continues the streak.
    vi.setSystemTime(new Date(2026, 6, 7, 21, 0, 0));
    const next = await recordDailySolved("2026-07-07", 15, "Genius");
    expect(next.currentStreak).toBe(2);
  });

  it("solving an old archive day counts totals but not the streak", async () => {
    await recordDailySolved("2026-07-06", 14, "Genius");
    const stats = await recordDailySolved("2026-07-01", 10, "Great");
    expect(stats.solved).toBe(2);
    expect(stats.totalWords).toBe(24);
    expect(stats.currentStreak).toBe(1);
    expect(stats.lastSolvedDate).toBe("2026-07-06"); // never moves back
  });

  it("re-recording the same day is a no-op", async () => {
    await recordDailySolved("2026-07-06", 14, "Genius");
    const stats = await recordDailySolved("2026-07-06", 14, "Genius");
    expect(stats.solved).toBe(1);
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
