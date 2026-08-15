import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DICT_VERSION } from "../../../lib/words/dictionary";
import type { Difficulty } from "../engine/types";
import {
  displayStreak,
  loadAllDailyProgress,
  loadDailyProgress,
  loadStaleDailyProgress,
  loadStats,
  otherBoardsSolved,
  recordDailyStarted,
  saveDailyProgress,
  updateStats,
  store,
  type DayProgress,
  type SerpentineStats,
} from "./persistence";
import { streakAdvance } from "../../../lib/daily/persistence";

const day = (
  difficulty: Difficulty,
  over: Partial<DayProgress> = {},
): DayProgress => ({
  dateKey: "2026-07-12",
  difficulty,
  dictVersion: DICT_VERSION,
  puzzleId: "h001",
  cells: [],
  solved: false,
  elapsedMs: 0,
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 12, 12, 0, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("save and load round-trip", () => {
  it("saves and loads a day by difficulty + dateKey", async () => {
    await saveDailyProgress(day("haiku", { cells: [{ row: 0, col: 0 }] }));
    const loaded = await loadDailyProgress("haiku", "2026-07-12");
    expect(loaded).not.toBeNull();
    expect(loaded!.cells).toEqual([{ row: 0, col: 0 }]);
    expect(loaded!.difficulty).toBe("haiku");
  });

  it("haiku and poem saves are independent", async () => {
    await saveDailyProgress(day("haiku", { puzzleId: "h001", solved: true }));
    await saveDailyProgress(day("poem", { puzzleId: "p001" }));
    const haiku = await loadDailyProgress("haiku", "2026-07-12");
    const poem = await loadDailyProgress("poem", "2026-07-12");
    expect(haiku!.solved).toBe(true);
    expect(poem!.solved).toBe(false);
  });
});

describe("multi-tab and version guards", () => {
  it("a stale tab's flush never overwrites a solved board", async () => {
    await saveDailyProgress(day("haiku", { solved: true, elapsedMs: 60_000 }));
    await saveDailyProgress(day("haiku", { elapsedMs: 100 }));
    const loaded = await loadDailyProgress("haiku", "2026-07-12");
    expect(loaded?.solved).toBe(true);
  });

  it("an older-build tab never clobbers a newer build's save", async () => {
    await saveDailyProgress(day("haiku", { solved: true }));
    await saveDailyProgress(
      day("haiku", { dictVersion: DICT_VERSION - 1, elapsedMs: 5 }),
    );
    const stored = await loadDailyProgress("haiku", "2026-07-12");
    expect(stored?.solved).toBe(true);
    expect(stored?.dictVersion).toBe(DICT_VERSION);
  });

  it("stats merge over defaults and malformed saves load as null", async () => {
    localStorage.setItem(
      "wg:v1:local:serpentine:stats",
      JSON.stringify({ played: 5 }),
    );
    const stats = await loadStats();
    expect(stats.played).toBe(5);
    expect(stats.bestStreak).toBe(0);
    expect(stats.bestTimeHaiku).toBeNull();

    localStorage.setItem(
      "wg:v1:local:serpentine:daily:haiku:2026-07-12",
      JSON.stringify({ dateKey: "2026-07-12", cells: "oops" }),
    );
    expect(await loadDailyProgress("haiku", "2026-07-12")).toBeNull();
  });
});

describe("stats recording", () => {
  it("updateStats increments and persists", async () => {
    const stats = await updateStats((s: SerpentineStats) => ({
      ...s,
      solved: s.solved + 1,
      ...streakAdvance(s, "2026-07-12", true),
    }));
    expect(stats.solved).toBe(1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.lastSolvedDate).toBe("2026-07-12");

    const reloaded = await loadStats();
    expect(reloaded.solved).toBe(1);
  });

  it("tracks best times per difficulty", async () => {
    await updateStats((s: SerpentineStats) => ({
      ...s,
      solved: s.solved + 1,
      bestTimeHaiku: 30_000,
    }));
    await updateStats((s: SerpentineStats) => ({
      ...s,
      solved: s.solved + 1,
      bestTimeHaiku:
        s.bestTimeHaiku === null || 20_000 < s.bestTimeHaiku
          ? 20_000
          : s.bestTimeHaiku,
    }));
    const stats = await loadStats();
    expect(stats.bestTimeHaiku).toBe(20_000);
    expect(stats.bestTimePoem).toBeNull();
  });
});

describe("the day is both boards", () => {
  it("reports whether solving this board finishes the day", async () => {
    // What gates the streak: it used to advance on whichever board was
    // solved first, so a player who only ever did the haiku kept a
    // streak the hub card never called finished.
    expect(await otherBoardsSolved("2026-07-12", "haiku")).toBe(false);

    await saveDailyProgress(day("poem", { solved: true }));
    // The poem is done, so finishing the haiku finishes the day...
    expect(await otherBoardsSolved("2026-07-12", "haiku")).toBe(true);
    // ...but finishing the poem alone does not, with no haiku saved.
    expect(await otherBoardsSolved("2026-07-12", "poem")).toBe(false);

    await saveDailyProgress(day("haiku", { solved: true }));
    expect(await otherBoardsSolved("2026-07-12", "poem")).toBe(true);
  });

  it("counts a date as one play however many boards you open", async () => {
    expect(await recordDailyStarted("2026-07-12", "haiku")).toBe(true);
    await saveDailyProgress(day("haiku"));
    // The poem opened later is the same day's play. The return value
    // gates the analytics event, so it has to say so too.
    expect(await recordDailyStarted("2026-07-12", "poem")).toBe(false);
    expect((await loadStats()).played).toBe(1);
  });

  it("does not count a started-but-unsolved sibling", async () => {
    await saveDailyProgress(day("poem", { cells: [{ row: 0, col: 0 }] }));
    expect(await otherBoardsSolved("2026-07-12", "haiku")).toBe(false);
  });
});

describe("archive roll-up", () => {
  it("merges haiku and poem under their DATE key", async () => {
    await saveDailyProgress(
      day("haiku", { solved: true, elapsedMs: 45_000, puzzleId: "h001" }),
    );
    await saveDailyProgress(
      day("poem", {
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
        elapsedMs: 30_000,
        puzzleId: "p001",
      }),
    );
    const days = await loadAllDailyProgress();
    expect(Object.keys(days)).toEqual(["2026-07-12"]);
    const rolled = days["2026-07-12"];
    expect(rolled.solved).toBe(true);
    expect(rolled.elapsedMs).toBe(45_000);
    expect(rolled.cellCount).toBe(2);
    expect(rolled.foundWords).toEqual(["h001"]);
  });

  it("does not count a board holding only the given first letter", async () => {
    // Opening a day can write the start state — one cell, no play. That
    // must not show up as progress in the archive.
    await saveDailyProgress(day("haiku", { cells: [{ row: 0, col: 0 }] }));
    const rolled = (await loadAllDailyProgress())["2026-07-12"];
    expect(rolled.solved).toBe(false);
    expect(rolled.cellCount).toBe(0);
  });

  it("marks a day stale when any save is from an older dictionary", async () => {
    await saveDailyProgress(day("haiku", { solved: true }));
    // Write a stale save directly to bypass version guards
    await store.set("daily:poem:2026-07-12", {
      ...day("poem", { dictVersion: DICT_VERSION - 1, solved: true }),
    });
    const days = await loadAllDailyProgress();
    expect(days["2026-07-12"].stale).toBe(true);
  });

  it("a lapsed streak displays as zero without a write", async () => {
    await updateStats((s: SerpentineStats) => ({
      ...s,
      solved: 1,
      currentStreak: 1,
      lastSolvedDate: "2026-07-12",
    }));
    expect(displayStreak(await loadStats(), "2026-07-13")).toBe(1);
    expect(displayStreak(await loadStats(), "2026-07-15")).toBe(0);
  });
});

describe("a save refused for not fitting its grid", () => {
  // Correcting a phrase's letters can reshape the board, so hydration
  // drops a save whose cells no longer fit. The day was still counted,
  // and loadStaleDailyProgress will not hand it back — it matches this
  // build's fingerprint. Hydration falls back to the refused save so
  // recordStarted never counts the day twice.
  it("is not reported as stale, so hydration must keep it itself", async () => {
    const pKey = "fingerprint-abc";
    await saveDailyProgress({
      ...day("haiku", { cells: [{ row: 9, col: 9 }], statsRecorded: true }),
      puzzleKey: pKey,
    });

    // Same puzzle by every test persistence applies…
    const current = await loadDailyProgress("haiku", "2026-07-12", pKey);
    expect(current?.cells).toEqual([{ row: 9, col: 9 }]);

    // …so the stale channel is empty, and the refused save is the only
    // record that the day was already played.
    const stale = await loadStaleDailyProgress("haiku", "2026-07-12", pKey);
    expect(stale).toBeNull();
    expect(current?.statsRecorded).toBe(true);
  });
});
