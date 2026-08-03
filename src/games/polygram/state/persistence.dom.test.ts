import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import {
  displayStreak,
  loadAllDailyProgress,
  loadDailyProgress,
  loadStats,
  recordDailyCompleted,
  saveDailyProgress,
  store,
  type DailyProgress,
} from "./persistence";

const day = (over: Partial<DailyProgress> = {}): DailyProgress => ({
  dateKey: "2026-07-12",
  dictVersion: DICT_VERSION,
  foundWords: [],
  revealed: {},
  completed: false,
  solved: false,
  elapsedMs: 0,
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
  it("increments solved/completed and accumulates totalWords", async () => {
    const stats = await recordDailyCompleted("2026-07-12", 42);
    expect(stats.solved).toBe(1);
    expect(stats.completed).toBe(1);
    expect(stats.totalWords).toBe(42);
    expect(stats.currentStreak).toBe(1);
    expect(stats.lastSolvedDate).toBe("2026-07-12");
    expect(stats.lastCompletedDate).toBe("2026-07-12");
  });

  it("accumulates totalWords across completions", async () => {
    await recordDailyCompleted("2026-07-11", 10);
    vi.setSystemTime(new Date(2026, 6, 12, 12, 0, 0));
    const stats = await recordDailyCompleted("2026-07-12", 50);
    expect(stats.totalWords).toBe(60);
  });

  it("does not double-count the same dateKey", async () => {
    await recordDailyCompleted("2026-07-12", 42);
    const stats = await recordDailyCompleted("2026-07-12", 99);
    expect(stats.solved).toBe(1);
    expect(stats.totalWords).toBe(42);
  });

  it("archive plays (allowGrace=false) don't advance streak", async () => {
    vi.setSystemTime(new Date(2026, 6, 13, 12, 0, 0));
    const stats = await recordDailyCompleted("2026-07-12", 20, false);
    expect(stats.solved).toBe(1);
    expect(stats.currentStreak).toBe(0);
    expect(stats.lastSolvedDate).toBeNull();
  });

  it("grace-day streak continues just after midnight", async () => {
    await recordDailyCompleted("2026-07-12", 10);
    vi.setSystemTime(new Date(2026, 6, 13, 0, 0, 30));
    const stats = await recordDailyCompleted("2026-07-13", 10);
    expect(stats.currentStreak).toBe(2);
  });
});

describe("legacy field normalization", () => {
  it("a save with only completed loads correctly via normalization", async () => {
    await store.set("daily:2026-07-12", {
      dateKey: "2026-07-12",
      dictVersion: DICT_VERSION,
      foundWords: ["abc"],
      revealed: {},
      completed: true,
      elapsedMs: 1000,
    });
    const loaded = await loadDailyProgress("2026-07-12");
    expect(loaded?.solved).toBe(true);
    expect(loaded?.completed).toBe(true);
  });

  it("stats with only completed normalize solved both ways", async () => {
    await store.set("stats", { completed: 3, lastCompletedDate: "2026-07-10" });
    const stats = await loadStats();
    expect(stats.solved).toBe(3);
    expect(stats.completed).toBe(3);
    expect(stats.lastSolvedDate).toBe("2026-07-10");
    expect(stats.lastCompletedDate).toBe("2026-07-10");
  });
});

describe("multi-tab and version guards", () => {
  it("rejects writes that lose found words from another tab", async () => {
    await saveDailyProgress(
      day({ foundWords: ["cat", "dog"], elapsedMs: 5000 }),
    );
    // Stale tab tries to write fewer words, missing some the stored tab found
    await saveDailyProgress(day({ foundWords: ["cat"] }));
    const loaded = await loadDailyProgress("2026-07-12");
    expect(loaded?.foundWords).toEqual(["cat", "dog"]);
  });

  it("a solved save can't be overwritten by unsolved", async () => {
    await saveDailyProgress(
      day({ completed: true, foundWords: ["cat"] }),
    );
    await saveDailyProgress(day({ foundWords: ["cat"] }));
    const loaded = await loadDailyProgress("2026-07-12");
    expect(loaded?.solved).toBe(true);
  });

  it("older dictVersion can't clobber newer", async () => {
    await saveDailyProgress(day({ completed: true, foundWords: ["cat"] }));
    await saveDailyProgress(
      day({
        completed: true,
        dictVersion: DICT_VERSION - 1,
        foundWords: ["zzz"],
        elapsedMs: 5,
      }),
    );
    const loaded = await loadDailyProgress("2026-07-12");
    expect(loaded?.dictVersion).toBe(DICT_VERSION);
    expect(loaded?.foundWords).toEqual(["cat"]);
  });
});

describe("archive roll-up", () => {
  it("returns days with stale flag based on dictVersion", async () => {
    await saveDailyProgress(day({ completed: true }));
    let days = await loadAllDailyProgress();
    expect(days["2026-07-12"].stale).toBe(false);

    // Save an older-dict day (different dateKey so version guard doesn't block)
    await saveDailyProgress(
      day({
        dateKey: "2026-07-11",
        dictVersion: DICT_VERSION - 1,
        completed: true,
      }),
    );
    days = await loadAllDailyProgress();
    expect(days["2026-07-11"].stale).toBe(true);
    expect(days["2026-07-12"].stale).toBe(false);
  });

  it("skips malformed saves", async () => {
    await saveDailyProgress(day({ completed: true }));
    // Write a malformed entry directly
    await store.set("daily:2026-07-10", {
      dateKey: "2026-07-10",
      foundWords: "not-an-array",
    });
    const days = await loadAllDailyProgress();
    expect(Object.keys(days)).toEqual(["2026-07-12"]);
  });
});

describe("streak display", () => {
  it("shows grace day then lapses", async () => {
    await recordDailyCompleted("2026-07-12", 10);
    const stats = await loadStats();
    expect(displayStreak(stats, "2026-07-13")).toBe(1); // grace
    expect(displayStreak(stats, "2026-07-15")).toBe(0); // lapsed
  });

  it("stats merge over defaults and missing fields are filled", async () => {
    await store.set("stats", { completed: 5 });
    const stats = await loadStats();
    expect(stats.completed).toBe(5);
    expect(stats.bestStreak).toBe(0);
    expect(stats.totalWords).toBe(0);
  });
});
